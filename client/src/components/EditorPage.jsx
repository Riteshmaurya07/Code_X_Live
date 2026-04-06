import React, { useEffect, useRef, useState, useCallback } from "react";
import Editor from "./Editor";
import AIPanel from "./AIPanel";
import ChatPanel from "./ChatPanel";
import VersionHistory from "./VersionHistory";
import EditorModals from "./Editor/EditorModals";
import EditorSidebar from "./Editor/EditorSidebar";
import EditorToolbar from "./Editor/EditorToolbar";
import CompilerOutput from "./Editor/CompilerOutput";
import { initSocket } from "../Socket";
import { ACTIONS } from "../Actions";
import {
  useNavigate,
  useLocation,
  Navigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import api from "../services/api";
import { getProject, formatCode as formatCodeAPI } from "../services/projectService";
import { useFileTree } from "../hooks/editor/useFileTree";
import { useRoomSocket } from "../hooks/editor/useRoomSocket";

const LANGUAGES = [
  "python3", "java", "cpp", "nodejs", "c", "ruby", "go", "scala", 
  "bash", "sql", "pascal", "csharp", "php", "swift", "rust", "r"
];

function EditorPage() {
  const { user: authUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const username = authUser?.username;

  // --- UI State ---
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [isCompileWindowOpen, setIsCompileWindowOpen] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [output, setOutput] = useState("");
  const [executionTime, setExecutionTime] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("python3");

  // --- Project State ---
  const [projectId, setProjectId] = useState(() => {
    if (location.state?.projectId) return location.state.projectId;
    return roomId || null;
  });
  const [projectLoaded, setProjectLoaded] = useState(false);

  // --- File Management Hook ---
  const {
    files, setFiles,
    activeFileId, setActiveFileId,
    saveStatus, 
    codeRef, fileCodeCache,
    isDbFile, handleCodeChange,
    createFile, deleteFile, renameFile, saveFileExplicitly
  } = useFileTree(projectId, selectedLanguage);

  // --- Member & Room State ---
  const [clients, setClients] = useState([]);
  const [adminUsername, setAdminUsername] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [rejoinPending, setRejoinPending] = useState(false);
  const [kickedModal, setKickedModal] = useState(null);
  const [bannedModal, setBannedModal] = useState(null);
  const [approvalRequests, setApprovalRequests] = useState([]);
  const [waitingApproval, setWaitingApproval] = useState(null);

  // --- Chat State ---
  const [roomMessages, setRoomMessages] = useState([]);
  const [privateMessages, setPrivateMessages] = useState({});
  const [activeChatTab, setActiveChatTab] = useState("Everyone");
  const [unreadChatCounts, setUnreadChatCounts] = useState({ Everyone: 0 });

  // --- Refs ---
  const editorRef = useRef(null);
  const activeFileIdRef = useRef(activeFileId);
  useEffect(() => { activeFileIdRef.current = activeFileId; }, [activeFileId]);

  // --- Socket Hook ---
  const { 
    socketRef, kickUser, setRole, requestRejoin, approveRejoin, denyRejoin, sendMessage 
  } = useRoomSocket({
    username, roomId, searchParams, navigate,
    isNewRoom: location.state?.isNewRoom,
    activeChatTab, showChatPanel,
    setFiles, setActiveFileId, setClients, setAdminUsername, setPermissions,
    setRoomMessages, setPrivateMessages, setUnreadChatCounts,
    setKickedModal, setBannedModal, setApprovalRequests, setRejoinPending,
    setWaitingApproval,
    editorRef, codeRef, fileCodeCache, activeFileIdRef
  });

  const isAdmin = adminUsername === username;
  const isReadOnly = !isAdmin && permissions[username] === 'viewer';

  // Load project on mount
  useEffect(() => {
    const load = async () => {
      if (!projectId) {
        setFiles([{ _id: "local-default", name: "main.py", content: "# Guest Mode\n" }]);
        setActiveFileId("local-default");
        setProjectLoaded(true);
        return;
      }
      try {
        const data = await getProject(projectId);
        if (data.files?.length > 0) {
          setFiles(data.files);
          setActiveFileId(data.files[0]._id);
          if (data.project?.language) setSelectedLanguage(data.project.language);
        } else {
          setFiles([{ _id: "local-default", name: "main.py", content: "" }]);
          setActiveFileId("local-default");
        }
      } catch {
        setFiles([{ _id: "local-default", name: "main.py", content: "" }]);
        setActiveFileId("local-default");
      } finally {
        setProjectLoaded(true);
      }
    };
    load();
  }, [projectId]);

  // --- Handlers ---
  const runCode = async () => {
    setIsCompiling(true);
    setIsCompileWindowOpen(true);
    try {
      const { data } = await api.post("/compile", {
        code: codeRef.current,
        language: selectedLanguage,
        projectId,
      });
      setOutput(data.output || JSON.stringify(data));
      setExecutionTime(data.executionTime || "");
    } catch (error) {
      setOutput(error.response?.data?.message || "Execution error");
    } finally {
      setIsCompiling(false);
    }
  };

  const handleFormat = async () => {
    try {
      const { formatted, supported } = await formatCodeAPI(codeRef.current || "", selectedLanguage);
      if (editorRef.current) editorRef.current.setValue(formatted);
      toast.success(supported ? "Formatted!" : "Not supported");
    } catch {
      toast.error("Formatting failed");
    }
  };

  const handleJoinDM = (target) => {
    if (target === username) return;
    setActiveChatTab(target);
    setShowChatPanel(true);
    setShowAIPanel(false);
    setShowHistory(false);
    setUnreadChatCounts(prev => ({ ...prev, [target]: 0 }));
  };

  if (!projectLoaded && !username) return null;
  if (projectLoaded && !username) return <Navigate to="/" />;

  if (!projectLoaded) {
    return (
      <div className="editor-page">
        <div className="loading-screen">
          <p>Loading project...</p>
        </div>
      </div>
    );
  }

  const activeFile = files.find(f => f._id === activeFileId);

  return (
    <div className="editor-page">
      <EditorModals 
        kickedModal={kickedModal}
        bannedModal={bannedModal}
        waitingApproval={waitingApproval}
        rejoinPending={rejoinPending}
        onRejoinRequest={requestRejoin}
        navigate={navigate}
      />

      <EditorSidebar 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        files={files}
        activeFileId={activeFileId}
        onSelectFile={setActiveFileId}
        onCreateFile={createFile}
        onDeleteFile={deleteFile}
        onRenameFile={renameFile}
        clients={clients}
        username={username}
        adminUsername={adminUsername}
        isAdmin={isAdmin}
        permissions={permissions}
        approvalRequests={approvalRequests}
        onApproveRejoin={approveRejoin}
        onDenyRejoin={denyRejoin}
        onKick={kickUser}
        onSetPermission={setRole}
        onMessageUser={handleJoinDM}
        onCopyRoomId={() => { navigator.clipboard.writeText(roomId); toast.success("Copied!"); }}
        onLeaveRoom={() => navigate("/")}
      />

      <div className="editor-main">
        <EditorToolbar 
          theme={theme}
          onToggleTheme={toggleTheme}
          selectedLanguage={selectedLanguage}
          onSelectLanguage={setSelectedLanguage}
          languages={LANGUAGES}
          activeFileName={activeFile?.name}
          saveStatus={saveStatus}
          isDbFile={isDbFile(activeFileId)}
          onSave={saveFileExplicitly}
          onFormat={handleFormat}
          showHistory={showHistory}
          onToggleHistory={() => { setShowHistory(!showHistory); setShowAIPanel(false); setShowChatPanel(false); }}
          showChatPanel={showChatPanel}
          onToggleChat={() => { setShowChatPanel(!showChatPanel); setShowAIPanel(false); setShowHistory(false); }}
          onRun={runCode}
          isCompiling={isCompiling}
          unreadChatCount={Object.values(unreadChatCounts).reduce((a, b) => a + b, 0)}
          showAIPanel={showAIPanel}
          onToggleAI={() => { setShowAIPanel(!showAIPanel); setShowHistory(false); setShowChatPanel(false); }}
          onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        />

        {isReadOnly && <div className="readonly-banner">👁 View Only</div>}

        <div className="editor-workspace">
          <div className="editor-container">
            <Editor
              key={activeFileId}
              ref={editorRef}
              socket={socketRef.current}
              roomId={roomId}
              fileId={activeFileId}
              initialValue={fileCodeCache.current[activeFileId]?.code ?? activeFile?.content ?? ""}
              onCodeChange={handleCodeChange}
              theme={theme}
              language={selectedLanguage}
              readOnly={isReadOnly}
            />
          </div>

          {showAIPanel && <AIPanel code={codeRef.current} language={selectedLanguage} onApplyFix={c => editorRef.current?.setValue(c)} />}
          {showChatPanel && (
            <ChatPanel 
              roomMessages={roomMessages} privateMessages={privateMessages}
              activeTab={activeChatTab} onTabChange={t => { setActiveChatTab(t); setUnreadChatCounts(p => ({ ...p, [t]: 0 })); }}
              onSendMessage={sendMessage} onClose={() => setShowChatPanel(false)}
              currentUser={username} unreadCounts={unreadChatCounts}
            />
          )}
          {showHistory && activeFileId && <VersionHistory fileId={activeFileId} onRestore={c => editorRef.current?.setValue(c)} onClose={() => setShowHistory(false)} />}
        </div>

        {isCompileWindowOpen && <CompilerOutput output={output} executionTime={executionTime} onClose={() => setIsCompileWindowOpen(false)} />}
      </div>
    </div>
  );
}

export default EditorPage;
