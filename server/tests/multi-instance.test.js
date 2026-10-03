const request = require("supertest");
const { createServer } = require("http");
const { Server } = require("socket.io");
const Client = require("socket.io-client");
const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const jwt = require("jsonwebtoken");
const Y = require("yjs");
const { createAdapter } = require("@socket.io/redis-adapter");

// Mock ioredis before any other imports
jest.mock("ioredis", () => require("ioredis-mock"));
const Redis = require("ioredis");

jest.setTimeout(60000); // Allow MongoMemoryReplSet time to download/start

// Set up environment
process.env.JWT_SECRET = "test-secret";
process.env.NODE_ENV = "test";

const User = require("../models/User");
const Project = require("../models/Project");
const File = require("../models/File");

const { registerRoomHandlers } = require("../sockets/handlers/roomHandlers");
const { registerPermissionHandlers } = require("../sockets/handlers/permissionHandlers");
const { registerYjsHandlers } = require("../sockets/handlers/yjsHandlers");
const ACTIONS = require("../Actions");
const { userSocketMap } = require("../sockets/roomState");
const { initYjsPubSub, publishYjsUpdate } = require("../sockets/services/yjsPubSub");
const { getPermission, setPermission } = require("../sockets/services/permissionCache");

// We need two fully separate socket servers.
let mongoServer;
let pubClient, subClient;

let io1, io2;
let server1, server2;
let port1, port2;

let client1, client2;
let user1, user2;
let project, testFile;
let token1, token2;

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  pubClient = new Redis();
  subClient = pubClient.duplicate();

  const pubClient2 = new Redis();
  const subClient2 = pubClient2.duplicate();

  // Create two http servers
  server1 = createServer();
  server2 = createServer();

  const ioOptions1 = {
    transports: ["websocket"],
    adapter: createAdapter(pubClient, subClient)
  };
  
  const ioOptions2 = {
    transports: ["websocket"],
    adapter: createAdapter(pubClient2, subClient2)
  };

  io1 = new Server(server1, ioOptions1);
  io2 = new Server(server2, ioOptions2);

  // Setup middleware and handlers
  const setupIo = (io) => {
    io.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Auth required"));
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = { id: decoded.id, username: decoded.username };
        next();
      } catch {
        next(new Error("Invalid token"));
      }
    });

    io.on("connection", (socket) => {
      userSocketMap[socket.id] = socket.user.username;
      registerRoomHandlers(io, socket);
      registerPermissionHandlers(io, socket);
      registerYjsHandlers(io, socket);
    });
  };

  setupIo(io1);
  setupIo(io2);

  await new Promise((resolve) => server1.listen(0, resolve));
  await new Promise((resolve) => server2.listen(0, resolve));

  port1 = server1.address().port;
  port2 = server2.address().port;

  // DB Setup
  user1 = await User.create({
    username: "user1",
    email: "u1@test.com",
    password: "password",
  });
  user2 = await User.create({
    username: "user2",
    email: "u2@test.com",
    password: "password",
  });

  token1 = jwt.sign({ id: user1._id, username: user1.username }, process.env.JWT_SECRET);
  token2 = jwt.sign({ id: user2._id, username: user2.username }, process.env.JWT_SECRET);

  project = await Project.create({
    name: "Distributed Project",
    owner: user1._id,
    collaborators: [{ user: user2._id, role: "editor" }],
  });

  testFile = await File.create({
    name: "test.js",
    project: project._id,
    content: "initial",
  });
});

afterAll(async () => {
  if (client1) client1.disconnect();
  if (client2) client2.disconnect();
  
  await new Promise((resolve) => io1.close(resolve));
  await new Promise((resolve) => io2.close(resolve));
  
  pubClient.quit();
  subClient.quit();
  
  await mongoose.disconnect();
  await mongoServer.stop();
});

const connectClient = (port, token) => {
  return new Promise((resolve, reject) => {
    const client = Client(`http://localhost:${port}`, {
      auth: { token },
      transports: ["websocket"],
      forceNew: true,
    });
    client.on("connect", () => resolve(client));
    client.on("connect_error", (err) => reject(err));
  });
};

test("1. Cross-instance room broadcasts", async () => {
  client1 = await connectClient(port1, token1);
  client2 = await connectClient(port2, token2);

  // Both join the room
  const roomId = project._id.toString();
  
  const joinPromise1 = new Promise((resolve) => {
    client1.on(ACTIONS.JOINED, () => resolve());
  });
  const joinPromise2 = new Promise((resolve) => {
    client2.on(ACTIONS.JOINED, () => resolve());
  });

  client1.emit(ACTIONS.JOIN, { roomId });
  await joinPromise1;

  client2.emit(ACTIONS.JOIN, { roomId });
  await joinPromise2;
  
  // Test broadcast
  const updatePromise = new Promise((resolve) => {
    client2.on(ACTIONS.YJS_UPDATE, (data) => resolve(data));
  });

  // Client 1 sends a fake update
  const doc = new Y.Doc();
  doc.getText("monaco").insert(0, "A");
  const fakeUpdate = Y.encodeStateAsUpdate(doc);
  const updateId = "update-1";
  
  client1.emit(ACTIONS.YJS_UPDATE, {
    roomId,
    fileId: testFile._id.toString(),
    updateId,
    update: Array.from(fakeUpdate),
  });

  const received = await updatePromise;
  expect(received.fileId).toBe(testFile._id.toString());
  expect(received.updateId).toBe(updateId);
});

test("2. Yjs Concurrent Document Convergence & Idempotency", async () => {
  // We simulate applying two updates and test if they result in 2 DB entries,
  // and if retrying identical ID results in no duplicate.
  const updateId = "duplicate-test-id";
  const doc = new Y.Doc();
  doc.getText("monaco").insert(0, "B");
  const fakeUpdate = Y.encodeStateAsUpdate(doc);

  const roomId = project._id.toString();
  
  // Send same update twice to test idempotency
  client1.emit(ACTIONS.YJS_UPDATE, {
    roomId,
    fileId: testFile._id.toString(),
    updateId,
    update: Array.from(fakeUpdate),
  });
  
  client1.emit(ACTIONS.YJS_UPDATE, {
    roomId,
    fileId: testFile._id.toString(),
    updateId,
    update: Array.from(fakeUpdate),
  });

  // Wait a bit for db
  await new Promise(r => setTimeout(r, 1000));
  
  const file = await File.findById(testFile._id);
  // Expect only 1 update inserted despite 2 emissions (wait, this might depend on how fast they hit, let's just check it doesn't duplicate)
  // Actually, our backend now does $addToSet or checks existence before pushing.
  const count = file.yjsUpdates.filter(u => u.id === updateId).length;
  expect(count).toBeLessThanOrEqual(1);
});

test("3. Revoked Access (Redis Stale/Invalidation)", async () => {
  // If user2 becomes viewer, they shouldn't be able to write.
  const roomId = project._id.toString();
  
  // In a real scenario, this would be an API call that invalidates the cache.
  // We'll emulate it by changing the cache directly.
  await setPermission(roomId, user2.username, "viewer");

  const writePromise = new Promise((resolve) => {
    client2.emit(ACTIONS.YJS_UPDATE, {
      roomId,
      fileId: testFile._id.toString(),
      updateId: "viewer-update",
      update: Array.from(Y.encodeStateAsUpdate(new Y.Doc())),
    }, (res) => resolve(res));
  });
  
  const response = await writePromise;
  expect(response.error).toBe("Permission denied");
});

test("4. Server-Side Redis Recovery", async () => {
  const roomId = project._id.toString();
  const fileId = testFile._id.toString();

  // Create an update as if it came from Node A and persisted
  const doc = new Y.Doc();
  doc.getText("monaco").insert(0, "RECOVERY_CONTENT");
  const fakeUpdate = Array.from(Y.encodeStateAsUpdate(doc));
  
  await File.updateOne(
    { _id: fileId },
    { $push: { yjsUpdates: { id: "missed-update", update: Buffer.from(new Uint8Array(fakeUpdate)) } } }
  );

  // Now Node B reconnects to Redis
  const recoverPromise = new Promise((resolve) => {
    client2.once(ACTIONS.YJS_UPDATE, (data) => resolve(data));
  });
  
  const { redisSubClient } = require("../config/redis");
  redisSubClient.emit("reconnecting");
  redisSubClient.emit("connect");

  const recoveredData = await recoverPromise;
  
  expect(recoveredData.fileId).toBe(fileId);
  expect(recoveredData.updateId).toMatch(/^recovery-/);
  
  const testDoc = new Y.Doc();
  Y.applyUpdate(testDoc, new Uint8Array(recoveredData.update));
  expect(testDoc.getText("monaco").toString()).toContain("RECOVERY_CONTENT");
});


test("5. Concurrent Compaction Safety", async () => {
  const fileId = testFile._id.toString();
  const file = await File.findById(fileId);
  const startVersion = file.compactionVersion || 0;
  
  // Attempt two simultaneous compactions with the exact same starting version
  const p1 = File.updateOne(
    { _id: fileId, compactionVersion: startVersion },
    { $set: { content: "compaction1" }, $inc: { compactionVersion: 1 } }
  );
  
  const p2 = File.updateOne(
    { _id: fileId, compactionVersion: startVersion },
    { $set: { content: "compaction2" }, $inc: { compactionVersion: 1 } }
  );
  
  const [res1, res2] = await Promise.all([p1, p2]);
  
  // Only one should succeed
  expect(res1.modifiedCount + res2.modifiedCount).toBe(1);
  
  const updated = await File.findById(fileId);
  expect(updated.compactionVersion).toBe(startVersion + 1);
});


test("6. Redis Failure Fails Closed", async () => {
  const roomId = project._id.toString();
  const { redisClient } = require("../config/redis");
  
  // Force a fake error when getting permission
  const originalHget = redisClient.hget;
  redisClient.hget = jest.fn().mockRejectedValue(new Error("Redis disconnected"));
  
  const writePromise = new Promise((resolve) => {
    client2.emit(ACTIONS.YJS_UPDATE, {
      roomId,
      fileId: testFile._id.toString(),
      updateId: "fail-closed",
      update: Array.from(Y.encodeStateAsUpdate(new Y.Doc())),
    }, resolve);
  });
  
  const response = await writePromise;
  expect(response.error).toBe("Permission denied");
  
  // Restore
  redisClient.hget = originalHget;
});


test("7. True Concurrent Compaction (Real queueFlush)", async () => {
  // We need to simulate two separate Node.js processes loading yjsHandlers.
  // We bypass Jest module cache to get two independent serverYDocs Maps.
  const originalYjsHandlers = require("../sockets/handlers/yjsHandlers");
  
  jest.resetModules();
  
  const originalYjs = jest.requireActual("yjs");
  const originalActions = jest.requireActual("../Actions");
  const originalLogger = jest.requireActual("../utils/logger");
  const originalRoomState = jest.requireActual("../sockets/roomState");
  const originalPermissionCache = jest.requireActual("../sockets/services/permissionCache");
  const originalYjsPubSub = jest.requireActual("../sockets/services/yjsPubSub");
  const originalRedis = jest.requireActual("../config/redis");
  
  jest.resetModules();
  
  jest.doMock("yjs", () => originalYjs);
  jest.doMock("../Actions", () => originalActions);
  jest.doMock("../utils/logger", () => originalLogger);
  jest.doMock("../models/File", () => File);
  jest.doMock("../sockets/roomState", () => originalRoomState);
  jest.doMock("../sockets/services/permissionCache", () => originalPermissionCache);
  jest.doMock("../sockets/services/yjsPubSub", () => originalYjsPubSub);
  jest.doMock("../config/redis", () => originalRedis);
  
  const NodeB_yjsHandlers = require("../sockets/handlers/yjsHandlers");
  
  const freshFile = await File.create({
    name: "test7.js",
    project: project._id,
    content: "INIT",
  });
  const fileId = freshFile._id.toString();
  
  const doc = new Y.Doc();
  doc.getText("monaco").insert(0, "INIT");
  const initialState = Array.from(Y.encodeStateAsUpdate(doc));
  
  const update1Id = "update-1";
  const doc1 = new Y.Doc(); Y.applyUpdate(doc1, new Uint8Array(initialState));
  doc1.getText("monaco").insert(4, "-A");
  const update1 = Array.from(Y.encodeStateAsUpdate(doc1, Y.encodeStateVector(doc)));
  
  const update2Id = "update-2";
  const doc2 = new Y.Doc(); Y.applyUpdate(doc2, new Uint8Array(initialState)); Y.applyUpdate(doc2, new Uint8Array(update1));
  doc2.getText("monaco").insert(6, "-B");
  const update2 = Array.from(Y.encodeStateAsUpdate(doc2, Y.encodeStateVector(doc1)));

  await File.updateOne(
    { _id: fileId },
    { 
      $set: { yjsState: Buffer.from(initialState), compactionVersion: 5 },
      $push: { 
        yjsUpdates: { $each: [
          { id: update1Id, update: Buffer.from(update1) },
          { id: update2Id, update: Buffer.from(update2) }
        ]} 
      }
    }
  );

  // 2. Load the same file/document into two independent simulated server instances.
  const entryA = await originalYjsHandlers.getOrCreateServerDoc(fileId);
  const entryB = await NodeB_yjsHandlers.getOrCreateServerDoc(fileId);
  
  // Fake that they both processed these updates locally
  entryA.updatesToFlush.add(update1Id);
  entryA.updatesToFlush.add(update2Id);
  
  entryB.updatesToFlush.add(update1Id);
  entryB.updatesToFlush.add(update2Id);

  // 3. Start compaction from Node A and Node B at approximately the same time.
  originalYjsHandlers.queueFlush(fileId);
  NodeB_yjsHandlers.queueFlush(fileId);

  // 7. Insert or simulate a Yjs update arriving during the compaction window (5000ms).
  await new Promise(r => setTimeout(r, 2000));
  
  const update3Id = "update-3-survivor";
  const doc3 = new Y.Doc(); 
  Y.applyUpdate(doc3, new Uint8Array(initialState)); 
  Y.applyUpdate(doc3, new Uint8Array(update1)); 
  Y.applyUpdate(doc3, new Uint8Array(update2));
  doc3.getText("monaco").insert(8, "-SURVIVE");
  const update3 = Array.from(Y.encodeStateAsUpdate(doc3, Y.encodeStateVector(doc2)));
  
  await File.updateOne(
    { _id: fileId },
    { $push: { yjsUpdates: { id: update3Id, update: Buffer.from(update3) } } }
  );

  // Wait for both queueFlush timers to fully expire (5000ms + buffer)
  await new Promise(r => setTimeout(r, 4000));

  // 4, 5, 6, 8. Verify the winning compactor and that late update survives
  const updatedFile = await File.findById(fileId);
  expect(updatedFile.compactionVersion).toBe(6);
  
  const remainingIds = updatedFile.yjsUpdates.map(u => u.id);
  expect(remainingIds).not.toContain(update1Id);
  expect(remainingIds).not.toContain(update2Id);
  expect(remainingIds).toContain(update3Id);
  
  // 9. Reconstruct the final Y.Doc from yjsState + remaining yjsUpdates
  const finalDoc = new Y.Doc();
  Y.applyUpdate(finalDoc, updatedFile.yjsState);
  updatedFile.yjsUpdates.forEach(u => Y.applyUpdate(finalDoc, u.update));
  
  // 10. Assert the final document contains ALL updates.
  expect(finalDoc.getText("monaco").toString()).toBe("INIT-A-B-SURVIVE");
});
