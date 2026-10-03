const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const jwt = require("jsonwebtoken");
const app = require("../index");
const User = require("../models/User");
const Project = require("../models/Project");
const File = require("../models/File");
const Version = require("../models/Version");

jest.mock("../controllers/aiController", () => ({
  reviewCode: (req, res) => res.status(200).json({ success: true }),
  explainCode: (req, res) => res.status(200).json({ success: true }),
  fixCode: (req, res) => res.status(200).json({ success: true }),
  generateTests: (req, res) => res.status(200).json({ success: true }),
  chat: (req, res) => res.status(200).json({ success: true }),
  autocomplete: (req, res) => res.status(200).json({ success: true })
}));

jest.mock("../controllers/compileController", () => ({
  compileCode: (req, res) => res.status(200).json({ success: true })
}));

jest.setTimeout(60000); // Allow time for mongodb-memory-server to download binaries

let mongoServer;

// Users
let owner, editor, viewer, unrelatedUser;
let ownerToken, editorToken, viewerToken, unrelatedToken;

// Projects/Files
let projectA, fileA, versionA;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Generate a mock JWT secret
  process.env.JWT_SECRET = "testsecret";
  process.env.NODE_ENV = "test";

  // Create Users
  owner = await User.create({ username: "owner", email: "owner@test.com", password: "password123" });
  editor = await User.create({ username: "editor", email: "editor@test.com", password: "password123" });
  viewer = await User.create({ username: "viewer", email: "viewer@test.com", password: "password123" });
  unrelatedUser = await User.create({ username: "unrelated", email: "unrelated@test.com", password: "password123" });

  const getToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1h" });
  ownerToken = getToken(owner._id);
  editorToken = getToken(editor._id);
  viewerToken = getToken(viewer._id);
  unrelatedToken = getToken(unrelatedUser._id);

  // Create Project
  projectA = await Project.create({
    name: "Project A",
    owner: owner._id,
    collaborators: [
      { user: editor._id, role: "editor" },
      { user: viewer._id, role: "viewer" }
    ]
  });

  // Create File
  fileA = await File.create({
    name: "index.js",
    project: projectA._id,
    content: "console.log('hello');",
    language: "nodejs"
  });

  // Create Version
  versionA = await Version.create({
    project: projectA._id,
    file: fileA._id,
    author: owner._id,
    content: "console.log('v1');",
    label: "v1"
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("Authorization Tests", () => {

  describe("Authentication", () => {
    it("1. missing JWT -> 401", async () => {
      const res = await request(app).get(`/api/projects/${projectA._id}`);
      expect(res.status).toBe(401);
    });

    it("2. invalid JWT -> 401", async () => {
      const res = await request(app)
        .get(`/api/projects/${projectA._id}`)
        .set("Authorization", "Bearer invalidtoken");
      expect(res.status).toBe(401);
    });

    it("3. expired JWT -> 401", async () => {
      const expiredToken = jwt.sign({ id: owner._id }, process.env.JWT_SECRET, { expiresIn: "0s" });
      const res = await request(app)
        .get(`/api/projects/${projectA._id}`)
        .set("Authorization", `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
    });
  });

  describe("Project Authorization", () => {
    it("4. owner can access project", async () => {
      const res = await request(app)
        .get(`/api/projects/${projectA._id}`)
        .set("Authorization", `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
    });

    it("5. collaborator can access project", async () => {
      const res = await request(app)
        .get(`/api/projects/${projectA._id}`)
        .set("Authorization", `Bearer ${editorToken}`);
      expect(res.status).toBe(200);
    });

    it("6. unrelated user cannot access project", async () => {
      const res = await request(app)
        .get(`/api/projects/${projectA._id}`)
        .set("Authorization", `Bearer ${unrelatedToken}`);
      expect(res.status).toBe(403);
    });

    it("7. owner can update project", async () => {
      const res = await request(app)
        .put(`/api/projects/${projectA._id}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ name: "Updated Project" });
      expect(res.status).toBe(200);
    });

    it("8. editor cannot update project metadata", async () => {
      const res = await request(app)
        .put(`/api/projects/${projectA._id}`)
        .set("Authorization", `Bearer ${editorToken}`)
        .send({ name: "Hacked Project" });
      expect(res.status).toBe(403);
    });

    it("9. viewer cannot update project metadata", async () => {
      const res = await request(app)
        .put(`/api/projects/${projectA._id}`)
        .set("Authorization", `Bearer ${viewerToken}`)
        .send({ name: "Hacked Project" });
      expect(res.status).toBe(403);
    });

    it("11. editor cannot delete project", async () => {
      const res = await request(app)
        .delete(`/api/projects/${projectA._id}`)
        .set("Authorization", `Bearer ${editorToken}`);
      expect(res.status).toBe(403);
    });

    it("unrelated user cannot download project", async () => {
      const res = await request(app)
        .get(`/api/projects/${projectA._id}/download`)
        .set("Authorization", `Bearer ${unrelatedToken}`);
      expect(res.status).toBe(403);
    });

    it("authorized viewer can download project", async () => {
      const res = await request(app)
        .get(`/api/projects/${projectA._id}/download`)
        .set("Authorization", `Bearer ${viewerToken}`);
      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(401);
    });
    
    // Note: 10 (owner delete) will be tested last or we mock it, to avoid breaking other tests
  });

  describe("File Authorization", () => {
    it("12. owner can read file", async () => {
      const res = await request(app)
        .get(`/api/files/${fileA._id}`)
        .set("Authorization", `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
    });

    it("13. collaborator can read file", async () => {
      const res = await request(app)
        .get(`/api/files/${fileA._id}`)
        .set("Authorization", `Bearer ${viewerToken}`);
      expect(res.status).toBe(200);
    });

    it("14. unrelated user cannot read file", async () => {
      const res = await request(app)
        .get(`/api/files/${fileA._id}`)
        .set("Authorization", `Bearer ${unrelatedToken}`);
      expect(res.status).toBe(403); // or 404
    });

    it("15. owner can edit file", async () => {
      const res = await request(app)
        .put(`/api/files/${fileA._id}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ content: "new content" });
      expect(res.status).toBe(200);
    });

    it("16. editor can edit file", async () => {
      const res = await request(app)
        .put(`/api/files/${fileA._id}`)
        .set("Authorization", `Bearer ${editorToken}`)
        .send({ content: "newer content" });
      expect(res.status).toBe(200);
    });

    it("17. viewer cannot edit file", async () => {
      const res = await request(app)
        .put(`/api/files/${fileA._id}`)
        .set("Authorization", `Bearer ${viewerToken}`)
        .send({ content: "hacked content" });
      expect(res.status).toBe(403);
    });

    it("19. editor can delete file", async () => {
      // create a temp file to delete
      const tempFile = await File.create({ name: "temp", project: projectA._id, language: "nodejs" });
      const res = await request(app)
        .delete(`/api/files/${tempFile._id}`)
        .set("Authorization", `Bearer ${editorToken}`);
      expect(res.status).toBe(200);
    });

    it("20. viewer cannot delete file", async () => {
      const res = await request(app)
        .delete(`/api/files/${fileA._id}`)
        .set("Authorization", `Bearer ${viewerToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe("Sharing", () => {
    it("editor cannot invite collaborator", async () => {
      const res = await request(app)
        .post(`/api/sharing/${projectA._id}/invite`)
        .set("Authorization", `Bearer ${editorToken}`)
        .send({ inviteeId: unrelatedUser._id, role: "viewer" });
      expect(res.status).toBe(403);
    });

    it("viewer cannot invite collaborator", async () => {
      const res = await request(app)
        .post(`/api/sharing/${projectA._id}/invite`)
        .set("Authorization", `Bearer ${viewerToken}`)
        .send({ inviteeId: unrelatedUser._id, role: "viewer" });
      expect(res.status).toBe(403);
    });

    it("editor cannot remove collaborator", async () => {
      const res = await request(app)
        .delete(`/api/sharing/${projectA._id}/collaborator/${viewer._id}`)
        .set("Authorization", `Bearer ${editorToken}`);
      expect(res.status).toBe(403);
    });

    it("viewer cannot remove collaborator", async () => {
      const res = await request(app)
        .delete(`/api/sharing/${projectA._id}/collaborator/${editor._id}`)
        .set("Authorization", `Bearer ${viewerToken}`);
      expect(res.status).toBe(403);
    });

    it("editor cannot generate share link", async () => {
      const res = await request(app)
        .post(`/api/sharing/${projectA._id}/share-link`)
        .set("Authorization", `Bearer ${editorToken}`);
      expect(res.status).toBe(403);
    });

    it("viewer cannot generate share link", async () => {
      const res = await request(app)
        .post(`/api/sharing/${projectA._id}/share-link`)
        .set("Authorization", `Bearer ${viewerToken}`);
      expect(res.status).toBe(403);
    });

    it("unrelated user cannot list collaborators", async () => {
      const res = await request(app)
        .get(`/api/sharing/${projectA._id}/collaborators`)
        .set("Authorization", `Bearer ${unrelatedToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe("Versions", () => {
    it("21. authorized user can read versions", async () => {
      const res = await request(app)
        .get(`/api/files/${fileA._id}/versions`)
        .set("Authorization", `Bearer ${viewerToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
    });

    it("22. unrelated user cannot read versions", async () => {
      const res = await request(app)
        .get(`/api/files/${fileA._id}/versions`)
        .set("Authorization", `Bearer ${unrelatedToken}`);
      expect(res.status).toBe(403);
    });

    it("23. editor can restore version", async () => {
      const res = await request(app)
        .post(`/api/files/versions/${versionA._id}/restore`)
        .set("Authorization", `Bearer ${editorToken}`);
      expect(res.status).toBe(200);
    });

    it("24. viewer cannot restore version", async () => {
      const res = await request(app)
        .post(`/api/files/versions/${versionA._id}/restore`)
        .set("Authorization", `Bearer ${viewerToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe("Autosave", () => {
    it("25. editor can autosave", async () => {
      const res = await request(app)
        .post(`/api/files/autosave`)
        .set("Authorization", `Bearer ${editorToken}`)
        .send({ fileId: fileA._id, content: "autosave content" });
      expect(res.status).toBe(200);
    });

    it("26. viewer cannot autosave", async () => {
      const res = await request(app)
        .post(`/api/files/autosave`)
        .set("Authorization", `Bearer ${viewerToken}`)
        .send({ fileId: fileA._id, content: "autosave viewer content" });
      expect(res.status).toBe(403);
    });

    it("27. unrelated user cannot autosave", async () => {
      const res = await request(app)
        .post(`/api/files/autosave`)
        .set("Authorization", `Bearer ${unrelatedToken}`)
        .send({ fileId: fileA._id, content: "autosave unrelated content" });
      expect(res.status).toBe(403);
    });
  });

  describe("AI / Compiler", () => {
    it("28. unauthenticated AI request rejected", async () => {
      const res = await request(app)
        .post(`/api/ai/review`)
        .send({ code: "test", projectId: projectA._id });
      expect(res.status).toBe(401);
    });

    it("29. unauthenticated compiler request rejected", async () => {
      const res = await request(app)
        .post(`/compile`)
        .send({ code: "test", projectId: projectA._id });
      expect(res.status).toBe(401);
    });

    it("30. authenticated user cannot use another user's projectId", async () => {
      const res = await request(app)
        .post(`/api/ai/review`)
        .set("Authorization", `Bearer ${unrelatedToken}`)
        .send({ code: "test", projectId: projectA._id });
      expect(res.status).toBe(403);
    });

    it("owner can use AI with projectId", async () => {
      const res = await request(app)
        .post(`/api/ai/review`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ code: "test", projectId: projectA._id });
      expect(res.status).toBe(200);
    });

    it("editor can use AI with projectId", async () => {
      const res = await request(app)
        .post(`/api/ai/review`)
        .set("Authorization", `Bearer ${editorToken}`)
        .send({ code: "test", projectId: projectA._id });
      expect(res.status).toBe(200);
    });

    it("viewer can use AI with projectId", async () => {
      const res = await request(app)
        .post(`/api/ai/review`)
        .set("Authorization", `Bearer ${viewerToken}`)
        .send({ code: "test", projectId: projectA._id });
      expect(res.status).toBe(200);
    });

    it("owner can compile with projectId", async () => {
      const res = await request(app)
        .post(`/compile`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ code: "test", language: "nodejs", projectId: projectA._id });
      expect(res.status).toBe(200);
    });

    it("editor can compile with projectId", async () => {
      const res = await request(app)
        .post(`/compile`)
        .set("Authorization", `Bearer ${editorToken}`)
        .send({ code: "test", language: "nodejs", projectId: projectA._id });
      expect(res.status).toBe(200);
    });

    it("viewer can compile with projectId", async () => {
      const res = await request(app)
        .post(`/compile`)
        .set("Authorization", `Bearer ${viewerToken}`)
        .send({ code: "test", language: "nodejs", projectId: projectA._id });
      expect(res.status).toBe(200);
    });

    it("unrelated user cannot compile using another projectId", async () => {
      const res = await request(app)
        .post(`/compile`)
        .set("Authorization", `Bearer ${unrelatedToken}`)
        .send({ code: "test", language: "nodejs", projectId: projectA._id });
      expect(res.status).toBe(403);
    });

    it("authenticated standalone AI request works without projectId", async () => {
      const res = await request(app)
        .post(`/api/ai/review`)
        .set("Authorization", `Bearer ${unrelatedToken}`)
        .send({ code: "test" });
      expect(res.status).toBe(200);
    });

    it("authenticated standalone compile request works without projectId", async () => {
      const res = await request(app)
        .post(`/compile`)
        .set("Authorization", `Bearer ${unrelatedToken}`)
        .send({ code: "test", language: "nodejs" });
      expect(res.status).toBe(200);
    });
  });

  describe("IDOR", () => {
    let projectB, fileB;
    beforeAll(async () => {
      projectB = await Project.create({ name: "Project B", owner: unrelatedUser._id });
      fileB = await File.create({ name: "indexB.js", project: projectB._id, content: "foo", language: "nodejs" });
    });

    it("31. User A cannot access User B's file by changing the file ID", async () => {
      const res = await request(app)
        .get(`/api/files/${fileB._id}`)
        .set("Authorization", `Bearer ${ownerToken}`);
      expect(res.status).toBe(403);
    });

    it("32. User A cannot modify User B's file by changing the file ID", async () => {
      const res = await request(app)
        .put(`/api/files/${fileB._id}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ content: "pwned" });
      expect(res.status).toBe(403);
    });

    it("33. User A cannot restore User B's version by changing the version ID", async () => {
      const versionB = await Version.create({ project: projectB._id, file: fileB._id, content: "v1", label: "v1" });
      const res = await request(app)
        .post(`/api/files/versions/${versionB._id}/restore`)
        .set("Authorization", `Bearer ${ownerToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe("Cleanup", () => {
    it("10. owner can delete project", async () => {
      const res = await request(app)
        .delete(`/api/projects/${projectA._id}`)
        .set("Authorization", `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
    });

    it("18. owner can delete file", async () => {
      // Create a temp project/file for this because we just deleted projectA
      const p = await Project.create({ name: "Temp", owner: owner._id });
      const f = await File.create({ name: "temp", project: p._id, language: "nodejs" });
      const res = await request(app)
        .delete(`/api/files/${f._id}`)
        .set("Authorization", `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
    });
  });
});
