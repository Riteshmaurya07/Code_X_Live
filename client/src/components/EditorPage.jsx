import React, { useEffect, useRef, useState, useCallback } from "react";
import Client from "./Client";
import Editor from "./Editor";
import AIPanel from "./AIPanel";
import ChatPanel from "./ChatPanel";
import FileExplorer from "./FileExplorer";
import VersionHistory from "./VersionHistory";
import { initSocket } from "../Socket";
import { ACTIONS } from "../Actions";
import {
  useNavigate,
  useLocation,
  Navigate,
  useParams,
} from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import {
  autosaveFile,
  formatCode as formatCodeAPI,
  getProject,
  createFile as createFileAPI,
  deleteFile as deleteFileAPI,
  updateFile as updateFileAPI,
} from "../services/projectService";

const LANGUAGES = [
  "python3",
  "java",
  "cpp",
  "nodejs",
  "c",
  "ruby",
  "go",
  "scala",
  "bash",
  "sql",
  "pascal",
  "csharp",
  "php",
  "swift",
  "rust",
  "r",
];

const AUTOSAVE_DELAY = 5000;

function EditorPage() {
  const { user: authUser } = useAuth();
  const [clients, setClients] = useState([]);
  const [output, setOutput] = useState("");
  const [isCompileWindowOpen, setIsCompileWindowOpen] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("python3");
  const [socket, setSocket] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [executionTime, setExecutionTime] = useState("");

  // Chat State
  const [roomMessages, setRoomMessages] = useState([]);
  const [privateMessages, setPrivateMessages] = useState({});
  const [activeChatTab, setActiveChatTab] = useState("Everyone");
  const [unreadChatCounts, setUnreadChatCounts] = useState({ Everyone: 0 });

  // Refs for Chat to avoid stale closures in socket listeners
  const showChatPanelRef = useRef(false);
  const activeChatTabRef = useRef("Everyone");

  useEffect(() => { showChatPanelRef.current = showChatPanel; }, [showChatPanel]);
  useEffect(() => { activeChatTabRef.current = activeChatTab; }, [activeChatTab]);

  // Admin Room Control state
  const [adminUsername, setAdminUsername] = useState(null);
  const [kickedModal, setKickedModal] = useState(null);       // { message }
  const [bannedModal, setBannedModal] = useState(null);        // { message, roomId }
  const [approvalRequest, setApprovalRequest] = useState(null); // { username, requesterSocketId, roomId }

  // Permission management state
  const [permissions, setPermissions] = useState({});
  const [rejoinPending, setRejoinPending] = useState(false);   // waiting for admin approval

  // Autosave state
  const [saveStatus, setSaveStatus] = useState("");
  const autosaveTimer = useRef(null);
  const hasUnsavedChanges = useRef(false);

  // Multi-file state
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [projectLoaded, setProjectLoaded] = useState(false);

  const [isCreatingFile, setIsCreatingFile] = useState(false); // FIX: BUG1

  const codeRef = useRef(null);
  const socketRef = useRef(null);
  const editorRef = useRef(null);
  const fileCodeCache = useRef({}); // FIX: BUG2
  const activeFileIdRef = useRef(activeFileId); // FIX: Fix stale closure

  useEffect(() => {
    activeFileIdRef.current = activeFileId;
  }, [activeFileId]);

  const Location = useLocation();
  const navigate = useNavigate();
  const { roomId } = useParams();

  // Determine username with persistence
  const [username, setUsername] = useState(() => {
    // 1. From Location state (first join)
    if (Location.state?.username) {
      sessionStorage.setItem(`username_${roomId}`, Location.state.username);
      return Location.state.username;
    }
    // 2. From Auth (if logged in)
    if (authUser?.username) return authUser.username;
    // 3. From Session Storage (on refresh)
    return sessionStorage.getItem(`username_${roomId}`);
  });

  // Determine projectId
  const [projectId, setProjectId] = useState(() => {
    // 1. From Location state
    if (Location.state?.projectId) return Location.state.projectId;
    // 2. Fallback: if roomId is 24 chars (MongoID), assume it's a project
    if (roomId && roomId.length === 24) return roomId;
    return null;
  });

  const isAdmin = adminUsername === username;
  const isReadOnly = !isAdmin && permissions[username] === 'viewer';

  // Update username if authUser changes
  useEffect(() => {
    if (authUser?.username && !username) {
      setUsername(authUser.username);
    }
  }, [authUser, username]);

  // Load project files from database
  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) {
        // Guest mode — use a local default file
        setFiles([
          { _id: "local-default", name: "main.py", content: "# Start coding here\n" },
        ]);
        setActiveFileId("local-default");
        setProjectLoaded(true);
        return;
      }

      try {
        const data = await getProject(projectId);
        const dbFiles = data.files || [];

        if (dbFiles.length > 0) {
          setFiles(dbFiles);
          setActiveFileId(dbFiles[0]._id);
          if (data.project?.language) {
            setSelectedLanguage(data.project.language);
          }
        } else {
          // Project exists but no files — create a default
          setFiles([
            { _id: "local-default", name: "main.py", content: "# Start coding here\n" },
          ]);
          setActiveFileId("local-default");
        }
      } catch (err) {
        console.error("Failed to load project:", err);
        // Fallback to local mode
        setFiles([
          { _id: "local-default", name: "main.py", content: "# Start coding here\n" },
        ]);
        setActiveFileId("local-default");
      } finally {
        setProjectLoaded(true);
      }
    };

    loadProject();
  }, [projectId]);

  // Check if a file ID is a real MongoDB ID (not local)
  const isDbFile = (fileId) => {
    return fileId && !fileId.startsWith("local-") && String(fileId).length === 24;
  };

  // Autosave logic — only for database-backed files
  const triggerAutosave = useCallback(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);

    autosaveTimer.current = setTimeout(async () => {
      if (!hasUnsavedChanges.current || !activeFileId) return;

      // Only autosave database-backed files
      if (!isDbFile(activeFileId)) {
        hasUnsavedChanges.current = false;
        setSaveStatus("");
        return;
      }

      try {
        setSaveStatus("Saving...");
        await autosaveFile(activeFileId, codeRef.current || "");
        setSaveStatus("Saved ✓");
        hasUnsavedChanges.current = false;
        setTimeout(() => setSaveStatus(""), 2000);
      } catch {
        setSaveStatus("Save failed");
        setTimeout(() => setSaveStatus(""), 3000);
      }
    }, AUTOSAVE_DELAY);
  }, [activeFileId]);

  // Socket initialization
  useEffect(() => {
    if (!username || !roomId) return;

    const init = async () => {
      const handleErrors = (err) => {
        console.log("Socket error:", err);
        toast.error("Socket connection failed, Try again later");
        navigate("/");
      };

      const s = await initSocket();
      socketRef.current = s;
      setSocket(s);

      s.on("connect_error", handleErrors);
      s.on("connect_failed", handleErrors);

      s.emit(ACTIONS.JOIN, {
        roomId,
        username,
      });

      s.on(ACTIONS.JOINED, ({ clients: joinedClients, username: joinedUser, socketId, admin }) => {
        if (joinedUser !== username) {
          toast.success(`${joinedUser} joined the room.`);
        }
        setClients(joinedClients);

        // Track admin
        if (admin) {
          setAdminUsername(admin);
        }
      });

      // --- FIX: BUG2: Listen for SYNC_CODE on join ---
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

      // --- FIX: BUG2: Scoped CODE_CHANGE tracking ---
      s.on(ACTIONS.CODE_CHANGE, ({ fileId, code, language }) => {
        if (fileId === activeFileIdRef.current) {
          if (editorRef.current && code != null) {
            editorRef.current.setValue(code);
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
      });

      // --- ADMIN ROOM CONTROL LISTENERS ---

      // KICKED: This user was removed by the admin
      s.on(ACTIONS.KICKED, ({ message }) => {
        setKickedModal({ message: message || "You have been removed by the admin" });
        // Redirect after 3 seconds
        setTimeout(() => {
          setKickedModal(null);
          navigate("/");
        }, 3000);
      });

      // ROOM_BANNED: This user tried to join but is banned
      s.on(ACTIONS.ROOM_BANNED, ({ message }) => {
        setBannedModal({
          message: message || "You are banned from this room",
          roomId,
        });
      });

      // ROOM_UPDATE: Someone was kicked or admin changed
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

      // APPROVAL_REQUEST: Admin receives a rejoin request
      s.on(ACTIONS.APPROVAL_REQUEST, ({ username: reqUser, requesterSocketId, roomId: reqRoom }) => {
        setApprovalRequest({ username: reqUser, requesterSocketId, roomId: reqRoom });
      });

      // REJOIN_APPROVED: Banned user was approved
      s.on(ACTIONS.REJOIN_APPROVED, ({ message }) => {
        setRejoinPending(false);
        setBannedModal(null);
        toast.success(message || "Rejoin approved! Joining room...");
        // Re-emit JOIN now that ban is lifted
        s.emit(ACTIONS.JOIN, { roomId, username });
      });

      // REJOIN_DENIED: Banned user was denied
      s.on(ACTIONS.REJOIN_DENIED, ({ message }) => {
        setRejoinPending(false);
        toast.error(message || "Rejoin request denied");
      });

      // --- CHAT LISTENERS ---

      // Initial chat history for room
      s.on(ACTIONS.CHAT_HISTORY, ({ messages }) => {
        setRoomMessages(messages || []);
      });

      // Receiving a broadcasted room message
      s.on(ACTIONS.RECEIVE_ROOM_MESSAGE, (msg) => {
        setRoomMessages((prev) => [...prev, msg]);
        
        // If not looking at the Everyone tab, bump the unread badge
        if (!showChatPanelRef.current || activeChatTabRef.current !== "Everyone") {
          setUnreadChatCounts((prev) => ({ ...prev, Everyone: (prev.Everyone || 0) + 1 }));
        }
      });

      // Receiving a private message (either directed to us, or echo of what we sent)
      s.on(ACTIONS.RECEIVE_PRIVATE_MESSAGE, (msg) => {
        const isFromMe = msg.senderName === username;
        const otherUser = isFromMe ? msg.recipientId : msg.senderName;

        setPrivateMessages((prev) => {
          const existing = prev[otherUser] || [];
          return { ...prev, [otherUser]: [...existing, msg] };
        });

        // Notifications & unread counts for inbound messages
        if (!isFromMe) {
          if (!showChatPanelRef.current) {
            toast(
              (t) => (
                <div 
                  style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: "4px" }} 
                  onClick={() => {
                    setShowChatPanel(true);
                    setShowAIPanel(false);
                    setShowHistory(false);
                    setActiveChatTab(msg.senderName);
                    toast.dismiss(t.id);
                  }}
                >
                  <strong style={{ fontSize: "0.9rem" }}>👤 {msg.senderName}</strong>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    {msg.message.length > 40 ? msg.message.substring(0, 40) + "..." : msg.message}
                  </span>
                </div>
              ),
              { duration: 4000, position: "bottom-right", id: `dm_${msg.timestamp}` }
            );
          }

          if (!showChatPanelRef.current || activeChatTabRef.current !== msg.senderName) {
            setUnreadChatCounts((prev) => ({ ...prev, [msg.senderName]: (prev[msg.senderName] || 0) + 1 }));
          }
        }
      });

      // --- PERMISSION LISTENERS ---
      s.on(ACTIONS.PERMISSION_UPDATED, ({ permissions: perms }) => {
        setPermissions(perms || {});
      });

      s.on(ACTIONS.PERMISSION_DENIED, ({ message }) => {
        toast.error(message || "View-only mode: you don't have edit permissions", {
          icon: "👁",
          duration: 3000,
        });
      });

      // --- BUG 2 FIX: File sync listeners ---
      s.on(ACTIONS.FILE_CREATED, ({ file }) => {
        if (file) {
          setFiles((prev) => {
            // FIX: BUG1 duplicate check
            if (prev.some((f) => f._id === file._id)) return prev;
            return [...prev, file];
          });
          toast.success(`File created: ${file.name}`, { icon: "📄" });
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
          // If the deleted file was the active file, switch to the first remaining
          setActiveFileId((prevId) => {
            if (prevId === fileId) {
              // We need to find another file; use a timeout so state has updated
              return null; // will be handled below
            }
            return prevId;
          });
        }
      });
    };

    init();

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      if (socketRef.current) {
        socketRef.current.off(ACTIONS.JOINED);
        socketRef.current.off(ACTIONS.SYNC_CODE);
        socketRef.current.off(ACTIONS.CODE_CHANGE);
        socketRef.current.off(ACTIONS.DISCONNECTED);
        socketRef.current.off(ACTIONS.KICKED);
        socketRef.current.off(ACTIONS.ROOM_BANNED);
        socketRef.current.off(ACTIONS.ROOM_UPDATE);
        socketRef.current.off(ACTIONS.APPROVAL_REQUEST);
        socketRef.current.off(ACTIONS.REJOIN_APPROVED);
        socketRef.current.off(ACTIONS.REJOIN_DENIED);
        socketRef.current.off(ACTIONS.CHAT_HISTORY);
        socketRef.current.off(ACTIONS.RECEIVE_ROOM_MESSAGE);
        socketRef.current.off(ACTIONS.RECEIVE_PRIVATE_MESSAGE);
        socketRef.current.off(ACTIONS.PERMISSION_UPDATED);
        socketRef.current.off(ACTIONS.PERMISSION_DENIED);
        socketRef.current.off(ACTIONS.FILE_CREATED);
        socketRef.current.off(ACTIONS.FILE_RENAMED);
        socketRef.current.off(ACTIONS.FILE_DELETED);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [username, navigate, roomId]);

  // Handle kick action from Client component
  const handleKickUser = (targetUsername) => {
    if (!socketRef.current || !isAdmin) return;
    socketRef.current.emit(ACTIONS.KICK_USER, {
      roomId,
      targetUsername,
    });
  };

  // Handle permission change from Client component
  const handleSetPermission = (targetUsername, permission) => {
    if (!socketRef.current || !isAdmin) return;
    socketRef.current.emit(ACTIONS.SET_PERMISSION, {
      roomId,
      targetUsername,
      permission,
    });
  };

  // Handle rejoin request
  const handleRejoinRequest = () => {
    if (!socketRef.current) return;
    setRejoinPending(true);
    socketRef.current.emit(ACTIONS.REJOIN_REQUEST, { roomId, username });
    toast("Rejoin request sent to admin...", { icon: "⏳" });
  };

  // Handle admin approval/denial
  const handleApproveRejoin = () => {
    if (!socketRef.current || !approvalRequest) return;
    socketRef.current.emit(ACTIONS.APPROVE_REJOIN, {
      roomId: approvalRequest.roomId,
      username: approvalRequest.username,
      requesterSocketId: approvalRequest.requesterSocketId,
    });
    toast.success(`Approved ${approvalRequest.username}`);
    setApprovalRequest(null);
  };

  const handleDenyRejoin = () => {
    if (!socketRef.current || !approvalRequest) return;
    socketRef.current.emit(ACTIONS.DENY_REJOIN, {
      roomId: approvalRequest.roomId,
      username: approvalRequest.username,
      requesterSocketId: approvalRequest.requesterSocketId,
    });
    toast(`Denied ${approvalRequest.username}`, { icon: "🚫" });
    setApprovalRequest(null);
  };

  // --- CHAT LOGIC ---
  const handleSendMessage = (messageText, targetTab) => {
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
  };

  const handleJoinDM = (targetUsername) => {
    if (targetUsername === username) return;
    setActiveChatTab(targetUsername);
    setShowChatPanel(true);
    setShowAIPanel(false);
    setShowHistory(false);
    // Clear unread badge
    setUnreadChatCounts((prev) => ({ ...prev, [targetUsername]: 0 }));
  };

  const handleTabChange = (tabName) => {
    setActiveChatTab(tabName);
    // Clear unread badge when viewing the tab
    setUnreadChatCounts((prev) => ({ ...prev, [tabName]: 0 }));
  };

  // Redirect only if we truly have no identity
  if (!username && !authUser && !projectLoaded) {
    // Wait for project load or auth before redirecting
    return null;
  }

  if (!username && projectLoaded) {
    return <Navigate to="/" />;
  }

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success("Room ID is copied");
    } catch {
      toast.error("Unable to copy the room ID");
    }
  };

  const leaveRoom = () => navigate("/");

  const runCode = async () => {
    setIsCompiling(true);
    setIsCompileWindowOpen(true);
    try {
      const response = await api.post("/compile", {
        code: codeRef.current,
        language: selectedLanguage,
        projectId,
      });

      setOutput(response.data.output || JSON.stringify(response.data));
      setExecutionTime(response.data.executionTime || "");
    } catch (error) {
      setOutput(
        error.response?.data?.message ||
        error.response?.data?.error ||
        "An error occurred"
      );
    } finally {
      setIsCompiling(false);
    }
  };

  const handleFormat = async () => {
    try {
      const { formatted, supported } = await formatCodeAPI(
        codeRef.current || "",
        selectedLanguage
      );
      if (editorRef.current) {
        editorRef.current.setValue(formatted);
      }
      toast.success(supported ? "Code formatted!" : "Language not supported by Prettier");
    } catch (err) {
      toast.error(err.response?.data?.message || "Formatting failed");
    }
  };

  // Explicit save — creates version snapshot
  const handleSave = async () => {
    if (!activeFileId || !isDbFile(activeFileId)) {
      toast.error("Save is only available for project files");
      return;
    }
    try {
      setSaveStatus("Saving...");
      await updateFileAPI(activeFileId, { content: codeRef.current || "" });
      setSaveStatus("Saved ✓");
      hasUnsavedChanges.current = false;
      toast.success("File saved with version snapshot");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch {
      toast.error("Failed to save");
      setSaveStatus("");
    }
  };

  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  const handleApplyFix = (fixedCode) => {
    if (editorRef.current) {
      editorRef.current.setValue(fixedCode);
    }
    toast.success("Fix applied!");
  };

  const handleVersionRestore = (content) => {
    if (editorRef.current) {
      editorRef.current.setValue(content);
    }
  };

  // Handle code changes — trigger autosave
  const handleCodeChange = (code) => {
    codeRef.current = code;
    if (isDbFile(activeFileId)) {
      hasUnsavedChanges.current = true;
      setSaveStatus("Unsaved");
      triggerAutosave();
    }
  };

  // Multi-file handlers
  const handleSelectFile = async (fileId) => {
    // FIX: BUG2 - file switch caching logic
    if (activeFileId && editorRef.current) {
      fileCodeCache.current[activeFileId] = {
        code: editorRef.current.getValue(),
        language: selectedLanguage
      };
    }

    setActiveFileId(fileId);
    
    setTimeout(async () => {
      const cached = fileCodeCache.current[fileId];
      if (cached !== undefined && cached.code !== undefined) {
        if (editorRef.current) {
          editorRef.current.setValue(cached.code);
        }
      } else {
        // Find local content or fetch
        const file = files.find(f => f._id === fileId);
        if (file && editorRef.current) {
          editorRef.current.setValue(file.content || "");
          fileCodeCache.current[fileId] = { code: file.content || "", language: selectedLanguage };
        }
      }
    }, 50); // Small timeout to allow activeFileId state to settle for the Editor component rewrite
  };

  const handleCreateFile = async (name) => {
    // FIX: BUG1 - loading guard
    if (isCreatingFile) return;
    setIsCreatingFile(true);

    try {
      if (projectId && isDbFile(projectId) || (projectId && projectId.length === 24)) {
        // Database-backed project — create in DB
        const newFile = await createFileAPI(projectId, name, selectedLanguage);
        // FIX: BUG1 - Removed optimistic UI update here. The socket matches files[].
        setActiveFileId(newFile._id); // We can still optimistically open it
      } else {
        // Guest mode — create locally
        const newFile = {
          _id: `local-${Date.now()}`,
          name,
          content: "",
        };
        setFiles((prev) => {
          if (prev.find(f => f._id === newFile._id)) return prev;
          return [...prev, newFile];
        });
        setActiveFileId(newFile._id);
        toast.success(`Created ${name}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create file");
    } finally {
      setIsCreatingFile(false);
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (files.length <= 1) {
      toast.error("Cannot delete the last file");
      return;
    }

    if (isDbFile(fileId)) {
      try {
        await deleteFileAPI(fileId);
      } catch {
        toast.error("Failed to delete file from server");
        return;
      }
    }

    setFiles((prev) => prev.filter((f) => f._id !== fileId));
    if (activeFileId === fileId) {
      setActiveFileId(files.find((f) => f._id !== fileId)?._id);
    }
    toast.success("File deleted");
  };

  const handleRenameFile = async (fileId, newName) => {
    if (isDbFile(fileId)) {
      try {
        await updateFileAPI(fileId, { name: newName });
      } catch {
        toast.error("Failed to rename");
        return;
      }
    }
    setFiles((prev) =>
      prev.map((f) => (f._id === fileId ? { ...f, name: newName } : f))
    );
    toast.success("File renamed");
  };

  const activeFile = files.find((f) => f._id === activeFileId);

  if (!projectLoaded) {
    return (
      <div className="editor-page" data-theme={theme}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100vh" }}>
          <p style={{ color: "var(--text-muted)" }}>Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-page" data-theme={theme}>
      {/* ===== KICKED MODAL ===== */}
      {kickedModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal kicked-modal">
            <div className="admin-modal-icon">🚫</div>
            <h3>Removed from Session</h3>
            <p>{kickedModal.message}</p>
            <p className="admin-modal-sub">Redirecting to home in 3 seconds...</p>
          </div>
        </div>
      )}

      {/* ===== BANNED MODAL ===== */}
      {bannedModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal banned-modal">
            <div className="admin-modal-icon">⛔</div>
            <h3>Access Denied</h3>
            <p>{bannedModal.message}</p>
            <div className="admin-modal-actions">
              <button
                className="admin-modal-btn secondary"
                onClick={() => { setBannedModal(null); navigate("/"); }}
              >
                Go Home
              </button>
              <button
                className="admin-modal-btn primary"
                onClick={handleRejoinRequest}
                disabled={rejoinPending}
              >
                {rejoinPending ? "Request Sent..." : "Request to Rejoin"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== APPROVAL REQUEST MODAL (Admin only) ===== */}
      {approvalRequest && (
        <div className="admin-modal-overlay">
          <div className="admin-modal approval-modal">
            <div className="admin-modal-icon">🔔</div>
            <h3>Rejoin Request</h3>
            <p>
              <strong>{approvalRequest.username}</strong> wants to rejoin the session.
            </p>
            <div className="admin-modal-actions">
              <button className="admin-modal-btn danger" onClick={handleDenyRejoin}>
                Deny
              </button>
              <button className="admin-modal-btn primary" onClick={handleApproveRejoin}>
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="editor-sidebar">
        <img src="/images/codeXlive.png" alt="Logo" className="sidebar-logo" />
        <hr />

        <FileExplorer
          files={files}
          activeFileId={activeFileId}
          onSelectFile={handleSelectFile}
          onCreateFile={handleCreateFile}
          onDeleteFile={handleDeleteFile}
          onRenameFile={handleRenameFile}
        />

        <hr />

        <div className="members-section">
          <span className="section-label">
            Members
            {isAdmin && (
              <span style={{
                marginLeft: "6px",
                fontSize: "0.65rem",
                color: "var(--accent)",
                fontWeight: 600,
              }}>
                👑 Admin
              </span>
            )}
          </span>
          <div className="members-list">
            {clients.map((client) => (
              <Client
                key={client.socketId}
                username={client.username}
                isAdmin={isAdmin}
                isCurrentUser={client.username === username}
                isAdminUser={client.username === adminUsername}
                permission={client.username === adminUsername ? 'admin' : (permissions[client.username] || 'editor')}
                onKick={handleKickUser}
                onSetPermission={handleSetPermission}
                onMessageUser={handleJoinDM}
              />
            ))}
          </div>
        </div>

        <hr />

        <div className="sidebar-actions">
          <button className="btn-success" onClick={copyRoomId}>
            Copy Room ID
          </button>
          <button className="btn-danger" onClick={leaveRoom}>
            Leave Room
          </button>
        </div>
      </div>

      {/* Main editor area */}
      <div className="editor-main">
        {/* Toolbar */}
        <div className="editor-toolbar">
          <div className="toolbar-left">
            <button className="toolbar-btn" onClick={toggleTheme}>
              {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
            </button>
            <select
              className="toolbar-select"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            <span className="active-file-name">
              {activeFile?.name || "untitled"}
            </span>
            {saveStatus && (
              <span className={`save-indicator ${saveStatus.includes("✓") ? "saved" : ""}`}>
                {saveStatus}
              </span>
            )}
          </div>

          <div className="toolbar-right">
            {isDbFile(activeFileId) && (
              <button className="toolbar-btn" onClick={handleSave}>
                💾 Save
              </button>
            )}
            <button className="toolbar-btn" onClick={handleFormat}>
              🎨 Format
            </button>
            {isDbFile(activeFileId) && (
              <button
                className={`toolbar-btn ${showHistory ? "active" : ""}`}
                onClick={() => { setShowHistory(!showHistory); setShowAIPanel(false); }}
              >
                📜 History
              </button>
            )}
            <button className="toolbar-btn run-btn" onClick={runCode} disabled={isCompiling}>
              {isCompiling ? "⏳ Running..." : "▶ Run"}
            </button>
            <button
              className={`toolbar-btn ai-toggle ${showChatPanel ? "active" : ""}`}
              onClick={() => { 
                setShowChatPanel(!showChatPanel); 
                setShowAIPanel(false); 
                setShowHistory(false);
                if (!showChatPanel) {
                  // Mark active tab as read when opening panel
                  setUnreadChatCounts((prev) => ({ ...prev, [activeChatTab]: 0 }));
                }
              }}
              style={{ position: "relative" }}
            >
              💬 Chat
              {Object.values(unreadChatCounts).reduce((a, b) => a + b, 0) > 0 && !showChatPanel && (
                <span className="chat-badge">
                  {Object.values(unreadChatCounts).reduce((a, b) => a + b, 0)}
                </span>
              )}
            </button>
            <button
              className={`toolbar-btn ai-toggle ${showAIPanel ? "active" : ""}`}
              onClick={() => { setShowAIPanel(!showAIPanel); setShowHistory(false); setShowChatPanel(false); }}
            >
              🤖 AI
            </button>
          </div>
        </div>

        {/* Editor + side panels */}
        {/* View-only banner */}
        {isReadOnly && (
          <div className="readonly-banner">
            👁 View Only — Contact the admin for edit access
          </div>
        )}

        <div className="editor-workspace">
          {/* FIX: BUG2 - Use activeFile?._id as Key to lock isolated rendering block */}
          <div className="editor-container with-panel">
            <Editor
              key={activeFileId}
              ref={editorRef}
              socket={socket}
              roomId={roomId}
              fileId={activeFileId}
              onCodeChange={handleCodeChange}
              theme={theme}
              language={selectedLanguage}
              readOnly={isReadOnly}
            />
          </div>

          {showAIPanel && (
            <AIPanel
              code={codeRef.current}
              language={selectedLanguage}
              onApplyFix={handleApplyFix}
            />
          )}

          {showChatPanel && (
            <ChatPanel 
              roomMessages={roomMessages}
              privateMessages={privateMessages}
              activeTab={activeChatTab}
              onTabChange={handleTabChange}
              onSendMessage={handleSendMessage}
              onClose={() => setShowChatPanel(false)}
              currentUser={username}
              unreadCounts={unreadChatCounts}
            />
          )}

          {showHistory && activeFileId && (
            <VersionHistory
              fileId={activeFileId}
              onRestore={handleVersionRestore}
              onClose={() => setShowHistory(false)}
            />
          )}
        </div>

        {/* Compiler output */}
        {isCompileWindowOpen && (
          <div className="compiler-output">
            <div className="compiler-header">
              <h4>
                Output ({selectedLanguage})
                {executionTime && (
                  <span className="exec-time"> — {executionTime}</span>
                )}
              </h4>
              <div className="compiler-actions">
                <button className="toolbar-btn run-btn" onClick={runCode} disabled={isCompiling}>
                  {isCompiling ? "Running..." : "▶ Run"}
                </button>
                <button
                  className="toolbar-btn"
                  onClick={() => setIsCompileWindowOpen(false)}
                >
                  ✕
                </button>
              </div>
            </div>
            <pre className="output-content">
              {output || "Output will appear here after compilation"}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default EditorPage;
