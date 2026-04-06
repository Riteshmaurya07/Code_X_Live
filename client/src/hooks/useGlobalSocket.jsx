import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { io } from "socket.io-client";
import toast from "react-hot-toast";

const GlobalSocketContext = createContext(null);

export const GlobalSocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [globalSocket, setGlobalSocket] = useState(null);

  useEffect(() => {
    if (!user) {
      if (globalSocket) {
        globalSocket.disconnect();
        setGlobalSocket(null);
      }
      return;
    }

    // Connect to the backend
    const backendURL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
    const token = localStorage.getItem("token");

    const newSocket = io(backendURL, {
      forceNew: true,
      transports: ["websocket"],
      auth: { token },
    });

    newSocket.on("connect", () => {
      newSocket.emit("REGISTER_USER", user.id || user._id);
    });

    // Listen to real-time global notifications everywhere
    newSocket.on("NEW_NOTIFICATION", (notification) => {
      // You can trigger sounds, native notifications, or just a toast here
      if (notification.type === "follow") {
        toast(`${notification.relatedUser?.username || "Someone"} started following you!`, {
          icon: "👀",
        });
      } else if (notification.type === "invitation") {
        toast(`You were invited to collaborate on ${notification.relatedProject?.name || "a project"}!`, {
          icon: "🚀",
        });
      }
    });

    setGlobalSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]); // Re-run when user changes

  return (
    <GlobalSocketContext.Provider value={globalSocket}>
      {children}
    </GlobalSocketContext.Provider>
  );
};

export const useGlobalSocket = () => {
  return useContext(GlobalSocketContext);
};
