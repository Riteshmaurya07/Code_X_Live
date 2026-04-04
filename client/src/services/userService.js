import api from "./api";

export const getUserProfile = async (username) => {
  const { data } = await api.get(`/api/users/${username}/profile`);
  return data;
};
