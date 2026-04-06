import api from "./api";

export const getNotifications = async (limit = 20) => {
  const { data } = await api.get(`/api/notifications?limit=${limit}`);
  return data;
};

export const markAsRead = async (id) => {
  const { data } = await api.put(`/api/notifications/${id}/read`);
  return data;
};

export const markAllAsRead = async () => {
  const { data } = await api.put("/api/notifications/read-all");
  return data;
};
