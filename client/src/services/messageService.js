import api from './api';

export const getConversations = async () => {
  const response = await api.get('/api/messages/conversations');
  return response.data;
};

export const getMessages = async (userId) => {
  const response = await api.get(`/api/messages/${userId}`);
  return response.data;
};

export const approveRequest = async (userId) => {
  const response = await api.post(`/api/messages/approve/${userId}`);
  return response.data;
};

export const declineRequest = async (userId) => {
  const response = await api.post(`/api/messages/decline/${userId}`);
  return response.data;
};
