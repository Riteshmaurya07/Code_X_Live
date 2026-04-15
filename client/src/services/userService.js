import api from "./api";

export const getUserProfile = async (username) => {
  const { data } = await api.get(`/api/users/${username}/profile`);
  return data;
};

export const followUser = async (userId) => {
  const { data } = await api.post(`/api/users/${userId}/follow`);
  return data;
};

export const unfollowUser = async (userId) => {
  const { data } = await api.post(`/api/users/${userId}/unfollow`);
  return data;
};

export const searchUsers = async (query) => {
  const { data } = await api.get(`/api/users/search?query=${query}`);
  return data;
};

export const getFollowers = async (username, page = 1) => {
  const { data } = await api.get(`/api/users/${username}/followers?page=${page}&limit=20`);
  return data;
};

export const getFollowing = async (username, page = 1) => {
  const { data } = await api.get(`/api/users/${username}/following?page=${page}&limit=20`);
  return data;
};

export const getActivityDashboard = async (username) => {
  const { data } = await api.get(`/api/users/${username}/activity-dashboard`);
  return data;
};

export const uploadAvatar = async (file) => {
  const formData = new FormData();
  formData.append("avatar", file);
  const { data } = await api.post("/api/users/me/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data; // { success, avatar }
};

export const updateProfile = async (fields) => {
  const { data } = await api.patch("/api/users/me/profile", fields);
  return data;
};
