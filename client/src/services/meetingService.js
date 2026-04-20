import api from "./api";

export const createMeeting = async (meetingData) => {
  const { data } = await api.post("/api/meetings", meetingData);
  return data;
};

export const getProjectMeetings = async (projectId) => {
  const { data } = await api.get(`/api/meetings/project/${projectId}`);
  return data;
};

export const getMeeting = async (meetingId) => {
  const { data } = await api.get(`/api/meetings/${meetingId}`);
  return data;
};

export const updateMeeting = async (meetingId, meetingData) => {
  const { data } = await api.put(`/api/meetings/${meetingId}`, meetingData);
  return data;
};

export const inviteMeetingParticipants = async (meetingId, participants) => {
  const { data } = await api.patch(`/api/meetings/${meetingId}/invite`, { participants });
  return data;
};

export const updateMeetingStatus = async (meetingId, status) => {
  const { data } = await api.patch(`/api/meetings/${meetingId}/status`, { status });
  return data;
};

export const deleteMeeting = async (meetingId) => {
  const { data } = await api.delete(`/api/meetings/${meetingId}`);
  return data;
};
