import api from "./api";

export const reviewCode = async (code, language) => {
  const { data } = await api.post("/api/ai/review", { code, language });
  return data;
};

export const explainCode = async (code, language) => {
  const { data } = await api.post("/api/ai/explain", { code, language });
  return data;
};

export const fixCode = async (code, language, errorMessage) => {
  const { data } = await api.post("/api/ai/fix", {
    code,
    language,
    errorMessage,
  });
  return data;
};

export const generateTests = async (code, language) => {
  const { data } = await api.post("/api/ai/tests", { code, language });
  return data;
};

export const chatWithAI = async (message, code, language, history) => {
  const { data } = await api.post("/api/ai/chat", {
    message,
    code,
    language,
    history,
  });
  return data;
};
