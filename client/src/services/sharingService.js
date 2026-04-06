import api from "./api";

// ===== Sharing & Invitations =====

export const getMyInvitations = async () => {
  const { data } = await api.get("/api/sharing/invitations/my");
  return data;
};

export const acceptInvitation = async (invitationId) => {
  const { data } = await api.post(`/api/sharing/invitations/${invitationId}/accept`);
  return data;
};

export const declineInvitation = async (invitationId) => {
  const { data } = await api.post(`/api/sharing/invitations/${invitationId}/decline`);
  return data;
};

export const inviteCollaborator = async (projectId, emailOrUsername, role = "editor") => {
  const { data } = await api.post(`/api/sharing/${projectId}/invite`, { emailOrUsername, role });
  return data;
};

export const getProjectInvitations = async (projectId) => {
  const { data } = await api.get(`/api/sharing/${projectId}/invitations`);
  return data;
};

export const generateShareLink = async (projectId) => {
  const { data } = await api.post(`/api/sharing/${projectId}/link`);
  return data;
};
