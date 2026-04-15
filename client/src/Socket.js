import { io } from "socket.io-client";

export const initSocket = async (inviteToken) => {
  const token = localStorage.getItem("token");
  const backendURL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  const options = {
    forceNew: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000,
    // Start with polling so HTTP proxies & cold-starts work, then upgrade to WS
    transports: ["polling", "websocket"],
    auth: {
      token,
      inviteToken,
    },
  };

  return io(backendURL, options);
};
