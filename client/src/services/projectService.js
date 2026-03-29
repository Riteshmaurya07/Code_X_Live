import api from "./api";

// ===== Project operations =====
export const createProject = async (name, language) => {
  const { data } = await api.post("/api/projects", { name, language });
  return data;
};

export const getProjects = async () => {
  const { data } = await api.get("/api/projects");
  return data;
};

export const getProject = async (id) => {
  const { data } = await api.get(`/api/projects/${id}`);
  return data;
};

export const updateProject = async (id, updates) => {
  const { data } = await api.put(`/api/projects/${id}`, updates);
  return data;
};

export const deleteProject = async (id) => {
  const { data } = await api.delete(`/api/projects/${id}`);
  return data;
};

// ===== File operations =====
export const createFile = async (projectId, name, language) => {
  const { data } = await api.post(`/api/files/${projectId}`, {
    name,
    language,
  });
  return data;
};

export const getFile = async (id) => {
  const { data } = await api.get(`/api/files/${id}`);
  return data;
};

export const updateFile = async (id, updates) => {
  const { data } = await api.put(`/api/files/${id}`, updates);
  return data;
};

export const deleteFile = async (id) => {
  const { data } = await api.delete(`/api/files/${id}`);
  return data;
};

// ===== Autosave =====
export const autosaveFile = async (fileId, content) => {
  const { data } = await api.post("/api/files/autosave", { fileId, content });
  return data;
};

// ===== Version History =====
export const getFileVersions = async (fileId) => {
  const { data } = await api.get(`/api/files/${fileId}/versions`);
  return data;
};

export const restoreVersion = async (versionId) => {
  const { data } = await api.post(`/api/files/versions/${versionId}/restore`);
  return data;
};

// ===== Code Formatting =====
export const formatCode = async (code, language) => {
  const { data } = await api.post("/api/format", { code, language });
  return data;
};

// ===== GitHub Import =====
export const importGitHubRepo = async (repoUrl) => {
  const { data } = await api.post("/api/github/import", { repoUrl });
  return data;
};

// ===== Activity Logs =====
export const getProjectActivity = async (projectId, page = 1) => {
  const { data } = await api.get(`/api/projects/${projectId}/activity?page=${page}`);
  return data;
};
