import { io } from "socket.io-client";

export const initSocket = async (inviteToken) => {
  const token = localStorage.getItem("token");

  const options = {
    forceNew: true,
    reconnectionAttempts: Infinity,
    timeout: 10000,
    transports: ["websocket"],
    auth: {
      token,
      inviteToken,
    },
  };

  // Vite environment variable
  const backendURL = import.meta.env.VITE_BACKEND_URL;
// const backendURL = "http://localhost:5000";
  console.log("Connecting to backend URL:", backendURL);

  return io(backendURL, options);
};
