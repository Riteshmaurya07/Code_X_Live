import { useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { initSocket } from '../../Socket';
import { ACTIONS } from '../../Actions';

/**
 * Hook to manage Socket.io room lifecycle, collaboration events, and administrative controls.
 */
export const useRoomSocket = ({
  username,
  roomId,
  searchParams,
  navigate,
  isNewRoom,
  activeChatTab,
  showChatPanel,
  setFiles,
  setActiveFileId,
  setClients,
  setAdminUsername,
  setPermissions,
  setRoomMessages,
  setPrivateMessages,
  setUnreadChatCounts,
  setKickedModal,
  setBannedModal,
  setApprovalRequests,
  setRejoinPending,
  setWaitingApproval,
  editorRef,
  codeRef,
  fileCodeCache,
  activeFileIdRef
}) => {
  const socketRef = useRef(null);
  const activeChatTabRef = useRef(activeChatTab);
  const showChatPanelRef = useRef(showChatPanel);

  useEffect(() => {
    activeChatTabRef.current = activeChatTab;
    showChatPanelRef.current = showChatPanel;
  }, [activeChatTab, showChatPanel]);

  useEffect(() => {
    if (!username || !roomId) return;

    const init = async () => {
      const handleErrors = (err) => {
        console.log("Socket error:", err);
        // Extract exact message if middleware fails validation
        const msg = err?.message || err || "Try again later";
        toast.error(`Socket connection failed: ${msg}`);
        navigate("/");
      };

      const searchToken = searchParams.get("token");
      const s = await initSocket(searchToken);
      socketRef.current = s;

      s.on("connect_error", handleErrors);
      s.on("connect_failed", handleErrors);

      // Handle new room creation flow vs normal join
      if (isNewRoom) {
        s.emit(ACTIONS.CREATE_ROOM, { roomId });
      } else {
        s.emit(ACTIONS.JOIN, { roomId, inviteToken: searchToken });
      }

      s.on(ACTIONS.ROOM_CREATED, ({ inviteToken }) => {
        window.history.replaceState({}, '', `/editor/${roomId}?token=${inviteToken}`);
        toast.success("Room created! Copy the URL to invite others.");
        s.emit(ACTIONS.JOIN, { roomId, inviteToken });
      });

      s.on(ACTIONS.INVALID_INVITE, ({ message }) => {
        toast.error(message || "Invalid invite");
        navigate("/");
      });

      s.on(ACTIONS.JOINED, ({ clients: joinedClients, username: joinedUser, socketId, admin }) => {
        if (joinedUser !== username) {
          toast.success(`${joinedUser} joined the room.`);
        }
        setClients(joinedClients);
        if (admin) {
          setAdminUsername(admin);
        }
      });

      s.on(ACTIONS.SYNC_CODE, ({ files }) => {
        fileCodeCache.current = { ...files };
        const currentActiveFileId = activeFileIdRef.current;
        if (currentActiveFileId && files[currentActiveFileId]) {
          if (editorRef.current) {
            editorRef.current.setValue(files[currentActiveFileId].code);
          }
          codeRef.current = files[currentActiveFileId].code;
        }
      });

      s.on(ACTIONS.CODE_CHANGE, ({ fileId, code, language }) => {
        if (fileId === activeFileIdRef.current) {
          if (editorRef.current && code != null) {
            // Use applyRemoteChange to preserve local cursor position
            if (editorRef.current.applyRemoteChange) {
              editorRef.current.applyRemoteChange(code);
            } else {
              editorRef.current.setValue(code);
            }
          }
          codeRef.current = code;
        } else {
          fileCodeCache.current[fileId] = { code, language };
        }
      });

      s.on(ACTIONS.DISCONNECTED, ({ socketId, username: leftUser }) => {
        toast.success(`${leftUser} left the room`);
        setClients((prev) =>
          prev.filter((client) => client.socketId !== socketId)
        );
        // Tell the editor to clear the cursor for this socket
        s.emit("cursor-remove", { socketId });
      });

      s.on(ACTIONS.KICKED, ({ message }) => {
        setKickedModal({ message: message || "You have been removed by the admin" });
        setTimeout(() => {
          setKickedModal(null);
          navigate("/");
        }, 3000);
      });

      s.on(ACTIONS.ROOM_BANNED, ({ message }) => {
        setBannedModal({
          message: message || "You are banned from this room",
          roomId,
        });
      });

      s.on(ACTIONS.ROOM_UPDATE, ({ clients: updatedClients, kickedUser, newAdmin }) => {
        if (updatedClients) {
          setClients(updatedClients);
        }
        if (kickedUser) {
          toast(`${kickedUser} was removed from the session`, { icon: "🚫" });
        }
        if (newAdmin) {
          setAdminUsername(newAdmin);
          toast(`${newAdmin} is now the room admin`, { icon: "👑" });
        }
      });

      s.on(ACTIONS.APPROVAL_REQUEST, ({ username: reqUser, requesterSocketId, roomId: reqRoom }) => {
        setApprovalRequests(prev => {
          if (prev.some(req => req.username === reqUser)) return prev;
          return [...prev, { username: reqUser, requesterSocketId, roomId: reqRoom }];
        });
      });

      s.on(ACTIONS.WAIT_FOR_APPROVAL, ({ message }) => {
        if (setWaitingApproval) setWaitingApproval({ message });
      });

      s.on(ACTIONS.REJOIN_APPROVED, ({ message, inviteToken }) => {
        setRejoinPending(false);
        setBannedModal(null);
        if (setWaitingApproval) setWaitingApproval(null);
        toast.success(message || "Rejoin approved! Joining room...");
        s.emit(ACTIONS.JOIN, { roomId, username, inviteToken });
      });

      s.on(ACTIONS.REJOIN_DENIED, ({ message }) => {
        setRejoinPending(false);
        toast.error(message || "Rejoin request denied");
      });

      s.on(ACTIONS.CHAT_HISTORY, ({ messages }) => {
        setRoomMessages(messages || []);
      });

      s.on(ACTIONS.RECEIVE_ROOM_MESSAGE, (msg) => {
        setRoomMessages((prev) => [...prev, msg]);
        if (!showChatPanelRef.current || activeChatTabRef.current !== "Everyone") {
          setUnreadChatCounts((prev) => ({ ...prev, Everyone: (prev.Everyone || 0) + 1 }));
        }
      });

      s.on(ACTIONS.RECEIVE_PRIVATE_MESSAGE, (msg) => {
        const isFromMe = msg.senderName === username;
        const otherUser = isFromMe ? msg.recipientId : msg.senderName;

        setPrivateMessages((prev) => {
          const existing = prev[otherUser] || [];
          return { ...prev, [otherUser]: [...existing, msg] };
        });

        if (!isFromMe) {
          if (!showChatPanelRef.current || activeChatTabRef.current !== msg.senderName) {
            setUnreadChatCounts((prev) => ({ ...prev, [msg.senderName]: (prev[msg.senderName] || 0) + 1 }));
          }
        }
      });

      s.on(ACTIONS.PERMISSION_UPDATED, ({ permissions: perms }) => {
        setPermissions(perms || {});
      });

      s.on(ACTIONS.ROLE_UPDATED, ({ targetUsername, newRole, message }) => {
        if (targetUsername === username) {
          toast(message, { icon: newRole === "editor" ? "🚀" : "🔒" });
        }
      });

      s.on(ACTIONS.PERMISSION_DENIED, ({ message }) => {
        toast.error(message || "Permission Denied", { icon: "👁" });
      });

      s.on(ACTIONS.FILE_CREATED, ({ file }) => {
        if (file) {
          setFiles((prev) => {
            if (prev.some((f) => f._id === file._id)) return prev;
            return [...prev, file];
          });
        }
      });

      s.on(ACTIONS.FILE_RENAMED, ({ fileId, newName }) => {
        if (fileId && newName) {
          setFiles((prev) =>
            prev.map((f) => (f._id === fileId ? { ...f, name: newName } : f))
          );
        }
      });

      s.on(ACTIONS.FILE_DELETED, ({ fileId }) => {
        if (fileId) {
          setFiles((prev) => prev.filter((f) => f._id !== fileId));
          setActiveFileId((prevId) => {
            if (prevId === fileId) return null;
            return prevId;
          });
        }
      });
    };

    init();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [username, roomId, navigate, isNewRoom, searchParams]);

  const kickUser = useCallback((targetUsername) => {
    if (!socketRef.current) return;
    socketRef.current.emit(ACTIONS.KICK_USER, { roomId, targetUsername });
  }, [roomId]);

  const setRole = useCallback((targetUsername, permission) => {
    if (!socketRef.current) return;
    const action = permission === "editor" ? ACTIONS.PROMOTE_TO_EDITOR : ACTIONS.DEMOTE_TO_VIEWER;
    socketRef.current.emit(action, { roomId, targetUsername });
  }, [roomId]);

  const requestRejoin = useCallback(() => {
    if (!socketRef.current) return;
    setRejoinPending(true);
    socketRef.current.emit(ACTIONS.REJOIN_REQUEST, { roomId, username });
    toast("Rejoin request sent to admin...", { icon: "⏳" });
  }, [roomId, username, setRejoinPending]);

  const approveRejoin = useCallback((approvalRequest) => {
    if (!socketRef.current || !approvalRequest) return;
    socketRef.current.emit(ACTIONS.APPROVE_REJOIN, {
      roomId: approvalRequest.roomId,
      username: approvalRequest.username,
      requesterSocketId: approvalRequest.requesterSocketId,
    });
    setApprovalRequests(prev => prev.filter(req => req.username !== approvalRequest.username));
    toast.success(`Approved ${approvalRequest.username}`);
  }, [setApprovalRequests]);

  const denyRejoin = useCallback((approvalRequest) => {
    if (!socketRef.current || !approvalRequest) return;
    socketRef.current.emit(ACTIONS.DENY_REJOIN, {
      roomId: approvalRequest.roomId,
      username: approvalRequest.username,
      requesterSocketId: approvalRequest.requesterSocketId,
    });
    setApprovalRequests(prev => prev.filter(req => req.username !== approvalRequest.username));
    toast(`Denied ${approvalRequest.username}`, { icon: "🚫" });
  }, [setApprovalRequests]);

  const sendMessage = useCallback((messageText, targetTab) => {
    if (!socketRef.current || !messageText.trim() || !username) return;

    if (targetTab === "Everyone") {
      socketRef.current.emit(ACTIONS.SEND_ROOM_MESSAGE, {
        roomId,
        senderId: socketRef.current.id,
        senderName: username,
        message: messageText,
      });
    } else {
      socketRef.current.emit(ACTIONS.SEND_PRIVATE_MESSAGE, {
        roomId,
        senderId: socketRef.current.id,
        senderName: username,
        recipientId: targetTab,
        message: messageText,
      });
    }
  }, [roomId, username]);

  return {
    socketRef,
    kickUser,
    setRole,
    requestRejoin,
    approveRejoin,
    denyRejoin,
    sendMessage
  };
};
