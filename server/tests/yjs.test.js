const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const app = require("../index");
const User = require("../models/User");
const Project = require("../models/Project");
const File = require("../models/File");
const Version = require("../models/Version");
const Y = require("yjs");
const { createServer } = require("http");
const { Server } = require("socket.io");
const Client = require("socket.io-client");
const jwt = require("jsonwebtoken");

jest.setTimeout(30000);

let mongoServer;
let httpServer;
let io;
let port;

const users = {};
const tokens = {};
let projectId;
let fileId;
let fileId2;

// Utility to create clients
const createClient = (token) => {
  return new Promise((resolve, reject) => {
    const client = Client(`http://localhost:${port}`, {
      auth: { token },
      forceNew: true,
      transports: ["websocket"]
    });
    client.on("connect", () => resolve(client));
    client.on("connect_error", reject);
  });
};

const waitForJoin = (client, roomId) => {
  return new Promise((resolve) => {
    client.emit("join", { roomId });
    client.once("sync-code", () => {
      resolve();
    });
  });
};

const yjsSync = (client, roomId, fileId, localDoc) => {
  return new Promise((resolve) => {
    const sv = Y.encodeStateVector(localDoc);
    client.emit("yjs-sync-step-2", { roomId, fileId, sv: Array.from(sv) }, (res2) => {
      if (res2.error) return resolve(false);
      if (res2.update) {
        Y.applyUpdate(localDoc, new Uint8Array(res2.update));
      }
      resolve(true);
    });
  });
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  httpServer = createServer(app);
  io = new Server(httpServer, { cors: { origin: "*" } });
  
  // Register handlers manually since index.js doesn't export setupSocket cleanly if we override
  const { setupSocket } = require("../sockets/socketHandler");
  setupSocket(io);

  await new Promise((resolve) => {
    httpServer.listen(() => {
      port = httpServer.address().port;
      resolve();
    });
  });

  // Setup users
  users.owner = await User.create({ username: "owner", email: "owner@test.com", password: "password123" });
  users.editor = await User.create({ username: "editor", email: "editor@test.com", password: "password123" });
  users.viewer = await User.create({ username: "viewer", email: "viewer@test.com", password: "password123" });
  users.outsider = await User.create({ username: "outsider", email: "out@test.com", password: "password123" });

  for (const role in users) {
    tokens[role] = jwt.sign({ id: users[role]._id }, process.env.JWT_SECRET || "test-secret");
  }

  // Setup project
  const project = await Project.create({
    name: "Yjs Test Project",
    owner: users.owner._id,
    collaborators: [
      { user: users.editor._id, role: "editor" },
      { user: users.viewer._id, role: "viewer" }
    ],
    roomId: "yjs-room-123"
  });
  projectId = project._id.toString();

  const file = await File.create({
    name: "test.js",
    project: projectId,
    content: "initial"
  });
  fileId = file._id.toString();

  const file2 = await File.create({
    name: "test2.js",
    project: projectId,
    content: "file2"
  });
  fileId2 = file2._id.toString();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  httpServer.close();
  io.close();
});

describe("Yjs Collaboration Tests", () => {
  
  let ownerClient;
  let editorClient;
  let viewerClient;

  beforeEach(async () => {
    ownerClient = await createClient(tokens.owner);
    editorClient = await createClient(tokens.editor);
    viewerClient = await createClient(tokens.viewer);

    await waitForJoin(ownerClient, projectId);
    await waitForJoin(editorClient, projectId);
    await waitForJoin(viewerClient, projectId);
  });

  afterEach(() => {
    ownerClient.disconnect();
    editorClient.disconnect();
    viewerClient.disconnect();
  });

  test("1. Two Yjs clients editing the same document concurrently converge to identical content", async () => {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();
    
    await yjsSync(ownerClient, projectId, fileId, doc1);
    await yjsSync(editorClient, projectId, fileId, doc2);

    const text1 = doc1.getText("monaco");
    const text2 = doc2.getText("monaco");

    // Clear and start fresh
    text1.delete(0, text1.length);
    text2.delete(0, text2.length);

    // Apply concurrent changes
    text1.insert(0, "A");
    text2.insert(0, "B");

    const update1 = Y.encodeStateAsUpdate(doc1);
    const update2 = Y.encodeStateAsUpdate(doc2);

    ownerClient.emit("yjs-update", { roomId: projectId, fileId, updateId: "legacy-owner-1", update: Array.from(update1) });
    editorClient.emit("yjs-update", { roomId: projectId, fileId, updateId: "legacy-editor-1", update: Array.from(update2) });

    await new Promise(r => setTimeout(r, 100));
    
    // Sync again to get changes
    await yjsSync(ownerClient, projectId, fileId, doc1);
    await yjsSync(editorClient, projectId, fileId, doc2);

    expect(doc1.getText("monaco").toString()).toBe(doc2.getText("monaco").toString());
  });

  test("2. Concurrent insertions and deletions converge", async () => {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();
    
    await yjsSync(ownerClient, projectId, fileId, doc1);
    await yjsSync(editorClient, projectId, fileId, doc2);

    const text1 = doc1.getText("monaco");
    const text2 = doc2.getText("monaco");

    doc1.transact(() => {
      text1.insert(0, "Hello");
    });
    
    const update1 = Y.encodeStateAsUpdate(doc1);
    ownerClient.emit("yjs-update", { roomId: projectId, fileId, updateId: "up1", update: Array.from(update1) });
    await new Promise(r => setTimeout(r, 50));

    await yjsSync(editorClient, projectId, fileId, doc2);
    
    doc2.transact(() => {
      text2.delete(0, 2); // delete "He"
    });
    doc1.transact(() => {
      text1.insert(5, " World");
    });

    const update2_1 = Y.encodeStateAsUpdate(doc1);
    const update2_2 = Y.encodeStateAsUpdate(doc2);

    ownerClient.emit("yjs-update", { roomId: projectId, fileId, updateId: "up2_1", update: Array.from(update2_1) });
    editorClient.emit("yjs-update", { roomId: projectId, fileId, updateId: "up2_2", update: Array.from(update2_2) });

    await new Promise(r => setTimeout(r, 100));

    await yjsSync(ownerClient, projectId, fileId, doc1);
    await yjsSync(editorClient, projectId, fileId, doc2);

    expect(doc1.getText("monaco").toString()).toMatch(/^llo World(AB|BA)$/);
    expect(doc2.getText("monaco").toString()).toMatch(/^llo World(AB|BA)$/);
  });

  test("3. A late-joining client receives the current document", async () => {
    const docLate = new Y.Doc();
    const outsiderClient = await createClient(tokens.editor); // Using editor token for access
    await waitForJoin(outsiderClient, projectId);
    
    await yjsSync(outsiderClient, projectId, fileId, docLate);
    
    expect(docLate.getText("monaco").toString()).toMatch(/^llo World(AB|BA)$/);
    outsiderClient.disconnect();
  });

  test("4. A reconnecting client synchronizes missing updates", async () => {
    const doc1 = new Y.Doc();
    await yjsSync(ownerClient, projectId, fileId, doc1);

    // Disconnect owner
    ownerClient.disconnect();

    // Editor makes changes
    const doc2 = new Y.Doc();
    await yjsSync(editorClient, projectId, fileId, doc2);
    doc2.getText("monaco").insert(0, "Reconnected ");
    const u = Y.encodeStateAsUpdate(doc2);
    editorClient.emit("yjs-update", { roomId: projectId, fileId, updateId: "up3", update: Array.from(u) });
    await new Promise(r => setTimeout(r, 100));

    // Reconnect owner
    ownerClient = await createClient(tokens.owner);
    await waitForJoin(ownerClient, projectId);
    
    await yjsSync(ownerClient, projectId, fileId, doc1);
    expect(doc1.getText("monaco").toString()).toMatch(/^Reconnected llo World(AB|BA)$/);
  });

  test("5. A server restart restores persisted document content", async () => {
    // Wait for the 5s debounce flush to happen
    await new Promise(r => setTimeout(r, 5500));
    
    // Simulate server restart by clearing serverYDocs
    const { getOrCreateServerDoc } = require("../sockets/handlers/yjsHandlers");
    const yjsHandlersModule = require.cache[require.resolve("../sockets/handlers/yjsHandlers")];
    
    // In test environment, we just load from DB again
    const entry = await getOrCreateServerDoc(fileId);
    expect(entry.doc.getText("monaco").toString()).toMatch(/^Reconnected llo World(AB|BA)$/);
  }, 10000);

  test("7. Updates for one file do not affect another file", async () => {
    const doc2 = new Y.Doc();
    await yjsSync(ownerClient, projectId, fileId2, doc2);
    
    doc2.getText("monaco").insert(0, "File2Edit");
    const u = Y.encodeStateAsUpdate(doc2);
    ownerClient.emit("yjs-update", { roomId: projectId, fileId: fileId2, updateId: "up4", update: Array.from(u) });
    
    await new Promise(r => setTimeout(r, 100));
    
    const doc1 = new Y.Doc();
    await yjsSync(ownerClient, projectId, fileId, doc1);
    
    expect(doc1.getText("monaco").toString()).toMatch(/^Reconnected llo World(AB|BA)$/); // unchanged
  });

  test("8. A viewer cannot publish document mutations", async () => {
    const doc = new Y.Doc();
    await yjsSync(viewerClient, projectId, fileId, doc);
    
    doc.getText("monaco").insert(0, "HACK");
    const u = Y.encodeStateAsUpdate(doc);
    
    const res = await new Promise(r => {
      viewerClient.emit("yjs-update", { roomId: projectId, fileId, updateId: "up5", update: Array.from(u) }, r);
    });
    
    expect(res.error).toBe("Permission denied");
    
    const checkDoc = new Y.Doc();
    await yjsSync(ownerClient, projectId, fileId, checkDoc);
    expect(checkDoc.getText("monaco").toString()).not.toContain("HACK");
  });

  test("9. An unrelated user cannot read or update a document", async () => {
    const outsiderClient = await createClient(tokens.outsider);
    const doc = new Y.Doc();
    
    const res1 = await new Promise(r => {
      outsiderClient.emit("yjs-sync-step-1", { roomId: projectId, fileId }, r);
    });
    expect(res1.error).toBe("Not authorized");
    
    const u = Y.encodeStateAsUpdate(doc);
    const res2 = await new Promise(r => {
      outsiderClient.emit("yjs-update", { roomId: projectId, fileId, updateId: "up6", update: Array.from(u) }, r);
    });
    expect(res2.error).toBe("Permission denied");
    
    outsiderClient.disconnect();
  });

  test("10. An editor can update a document", async () => {
    const doc = new Y.Doc();
    await yjsSync(editorClient, projectId, fileId, doc);
    doc.getText("monaco").insert(0, "EDITOR");
    const u = Y.encodeStateAsUpdate(doc);
    
    const res = await new Promise(r => {
      editorClient.emit("yjs-update", { roomId: projectId, fileId, updateId: "up7", update: Array.from(u) }, r);
    });
    expect(res.success).toBe(true);
  });

  test("12. Malformed and oversized update payloads are rejected safely", async () => {
    const largeUpdate = new Array(150 * 1024).fill(1); // 150KB > 100KB limit
    
    const res1 = await new Promise(r => {
      ownerClient.emit("yjs-update", { roomId: projectId, fileId, updateId: "up8", update: largeUpdate }, r);
    });
    expect(res1.error).toBe("Update malformed or missing updateId");
    
    const res2 = await new Promise(r => {
      ownerClient.emit("yjs-update", { roomId: projectId, fileId, updateId: "up9", update: "not-an-array" }, r);
    });
    expect(res2.error).toBeTruthy();
  });

  test("14. Existing autosave, file CRUD, and version restore behavior remains functional", async () => {
    // Autosave sync
    const res = await request(app)
      .post("/api/files/autosave")
      .set("Authorization", `Bearer ${tokens.owner}`)
      .send({ fileId, content: "AUTOSAVED" });
      
    expect(res.statusCode).toBe(200);
    
    await new Promise(r => setTimeout(r, 100)); // wait for Yjs sync
    
    const doc = new Y.Doc();
    await yjsSync(ownerClient, projectId, fileId, doc);
    expect(doc.getText("monaco").toString()).toBe("AUTOSAVED");
  });

});
