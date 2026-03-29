import React, { useEffect, useRef, useState, useCallback } from "react";
import Client from "./Client";
import Editor from "./Editor";
import AIPanel from "./AIPanel";
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
  const [executionTime, setExecutionTime] = useState("");

  // Autosave state
  const [saveStatus, setSaveStatus] = useState("");
  const autosaveTimer = useRef(null);
  const hasUnsavedChanges = useRef(false);

  // Multi-file state
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [projectLoaded, setProjectLoaded] = useState(false);

  const codeRef = useRef(null);
  const socketRef = useRef(null);
  const editorRef = useRef(null);

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

      s.on(ACTIONS.JOINED, ({ clients: joinedClients, username: joinedUser, socketId }) => {
        if (joinedUser !== username) {
          toast.success(`${joinedUser} joined the room.`);
        }
        setClients(joinedClients);

        if (codeRef.current) {
          s.emit(ACTIONS.SYNC_CODE, {
            code: codeRef.current,
            socketId,
          });
        }
      });

      s.on(ACTIONS.DISCONNECTED, ({ socketId, username: leftUser }) => {
        toast.success(`${leftUser} left the room`);
        setClients((prev) =>
          prev.filter((client) => client.socketId !== socketId)
        );
      });
    };

    init();

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      if (socketRef.current) {
        socketRef.current.off(ACTIONS.JOINED);
        socketRef.current.off(ACTIONS.DISCONNECTED);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [username, navigate, roomId]);

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
  const handleSelectFile = (fileId) => {
    // Save content of current file in local state
    setFiles((prev) =>
      prev.map((f) =>
        f._id === activeFileId ? { ...f, content: codeRef.current || "" } : f
      )
    );
    setActiveFileId(fileId);
  };

  const handleCreateFile = async (name) => {
    if (projectId && isDbFile(projectId) || (projectId && projectId.length === 24)) {
      // Database-backed project — create in DB
      try {
        const newFile = await createFileAPI(projectId, name, selectedLanguage);
        setFiles((prev) => [...prev, newFile]);
        setActiveFileId(newFile._id);
        toast.success(`Created ${name}`);
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to create file");
      }
    } else {
      // Guest mode — create locally
      const newFile = {
        _id: `local-${Date.now()}`,
        name,
        content: "",
      };
      setFiles((prev) => [...prev, newFile]);
      setActiveFileId(newFile._id);
      toast.success(`Created ${name}`);
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
          <span className="section-label">Members</span>
          <div className="members-list">
            {clients.map((client) => (
              <Client key={client.socketId} username={client.username} />
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
              className={`toolbar-btn ai-toggle ${showAIPanel ? "active" : ""}`}
              onClick={() => { setShowAIPanel(!showAIPanel); setShowHistory(false); }}
            >
              🤖 AI
            </button>
          </div>
        </div>

        {/* Editor + side panels */}
        <div className="editor-workspace">
          <div className={`editor-container ${(showAIPanel || showHistory) ? "with-panel" : ""}`}>
            <Editor
              socket={socket}
              roomId={roomId}
              theme={theme}
              language={selectedLanguage}
              initialValue={activeFile?.content || ""}
              onCodeChange={handleCodeChange}
              ref={editorRef}
            />
          </div>

          {showAIPanel && (
            <AIPanel
              code={codeRef.current}
              language={selectedLanguage}
              onApplyFix={handleApplyFix}
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
