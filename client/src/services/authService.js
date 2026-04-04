import api from "./api";

export const loginUser = async (email, password) => {
  const { data } = await api.post("/api/auth/login", { email, password });
  return data;
};

export const registerUser = async (username, email, password) => {
  const { data } = await api.post("/api/auth/register", {
    username,
    email,
    password,
  });
  return data;
};

export const getProfile = async () => {
  const { data } = await api.get("/api/auth/profile");
  return data;
};
