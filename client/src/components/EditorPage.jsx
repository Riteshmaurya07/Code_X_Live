import React, { useEffect, useRef, useState, useCallback } from "react";
import Editor from "./Editor";
import AIPanel from "./AIPanel";
import ChatPanel from "./ChatPanel";
import VersionHistory from "./VersionHistory";
import EditorModals from "./Editor/EditorModals";
import EditorSidebar from "./Editor/EditorSidebar";
import EditorToolbar from "./Editor/EditorToolbar";
import CompilerOutput from "./Editor/CompilerOutput";
import MeetingPanel from "./Editor/MeetingPanel";
import MeetingModal from "./Editor/MeetingModal";
import MeetingDetailsModal from "./Editor/MeetingDetailsModal";
import InviteParticipantsModal from "./Editor/InviteParticipantsModal";
import StatusBar from "./Editor/StatusBar";
import Breadcrumbs from "./Editor/Breadcrumbs";
import { ACTIONS } from "../Actions";
import {
  useNavigate,
  useLocation,
  Navigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { toast } from "react-hot-toast";
import { Eye } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import api from "../services/api";
import { getProject, formatCode as formatCodeAPI } from "../services/projectService";
import { getProjectMeetings, deleteMeeting } from "../services/meetingService";
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
  const [showMeetingPanel, setShowMeetingPanel] = useState(false);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [meetingModalMode, setMeetingModalMode] = useState("create");
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [isMeetingDetailsOpen, setIsMeetingDetailsOpen] = useState(false);
  const [isInviteMoreOpen, setIsInviteMoreOpen] = useState(false);
  const [isCompileWindowOpen, setIsCompileWindowOpen] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [output, setOutput] = useState("");
  const [executionTime, setExecutionTime] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("python3");
  const [cursor, setCursor] = useState({ line: 0, ch: 0 });

  // --- Project State ---
  const [projectId, setProjectId] = useState(() => {
    if (location.state?.projectId) return location.state.projectId;
    return roomId || null;
  });
  const [projectLoaded, setProjectLoaded] = useState(false);
  const [projectObj, setProjectObj] = useState(null);
  const [meetings, setMeetings] = useState([]);

  // --- File Management Hook ---
  const {
    files, setFiles,
    activeFileId, setActiveFileId,
    saveStatus,
    codeRef, fileCodeCache,
    isDbFile, handleCodeChange,
    createFile, deleteFile, renameFile, saveFileExplicitly,
    knownFolders, setKnownFolders, createFolder, deleteFolder,
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
    username, 
    roomId: projectObj?._id || roomId,
    searchParams, navigate,
    isNewRoom: location.state?.isNewRoom,
    activeChatTab, showChatPanel,
    setFiles, setActiveFileId, setClients, setAdminUsername, setPermissions,
    setRoomMessages, setPrivateMessages, setUnreadChatCounts,
    setKickedModal, setBannedModal, setApprovalRequests, setRejoinPending,
    setWaitingApproval,
    editorRef, codeRef, fileCodeCache, activeFileIdRef,
    onRoomCreated: (proj) => {
      setProjectObj(proj);
      if (proj._id) setProjectId(proj._id);
    }
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
        setProjectObj(data.project);
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

  // Sync canonical roomId to URL
  useEffect(() => {
    if (projectObj?.roomId && roomId && projectObj.roomId !== roomId) {
      const search = window.location.search;
      navigate(`/editor/${projectObj.roomId}${search}`, { replace: true });
    }
  }, [projectObj, roomId, navigate]);

  // Load meetings
  useEffect(() => {
    if (projectId) {
      getProjectMeetings(projectId).then(setMeetings).catch(err => console.error(err));
    }
  }, [projectId]);

  // --- Folder handlers (virtual — no DB write) ---
  const handleCreateFolder = useCallback((parentPath, folderName) => {
    const path = createFolder(parentPath, folderName);
    // Broadcast to room peers
    if (socketRef.current && roomId) {
      socketRef.current.emit(ACTIONS.FOLDER_CREATED, { roomId, path });
    }
  }, [createFolder, socketRef, roomId]);

  const handleDeleteFolder = useCallback((folderPath) => {
    deleteFolder(folderPath);
    if (socketRef.current && roomId) {
      socketRef.current.emit(ACTIONS.FOLDER_DELETED, { roomId, path: folderPath });
    }
  }, [deleteFolder, socketRef, roomId]);

  // Listen for peer folder events
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;
    const onFolderCreated = ({ path }) => {
      setKnownFolders(prev => { const n = new Set(prev); n.add(path); return n; });
    };
    const onFolderDeleted = ({ path }) => {
      deleteFolder(path);
    };
    s.on(ACTIONS.FOLDER_CREATED, onFolderCreated);
    s.on(ACTIONS.FOLDER_DELETED, onFolderDeleted);
    return () => {
      s.off(ACTIONS.FOLDER_CREATED, onFolderCreated);
      s.off(ACTIONS.FOLDER_DELETED, onFolderDeleted);
    };
  }, [socketRef, deleteFolder, setKnownFolders]);

  // Handle meeting socket events
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    const onMeetingCreated = ({ meeting }) => {
      setMeetings(prev => [...prev, meeting].sort((a, b) => new Date(a.startTime) - new Date(b.startTime)));
      toast.success(`Meeting scheduled: ${meeting.title}`);
    };

    const onMeetingUpdated = ({ meeting }) => {
      setMeetings(prev => prev.map(m => m._id === meeting._id ? meeting : m).sort((a, b) => new Date(a.startTime) - new Date(b.startTime)));
    };

    const onMeetingDeleted = ({ meetingId }) => {
      setMeetings(prev => prev.filter(m => m._id !== meetingId));
    };

    s.on(ACTIONS.MEETING_CREATED, onMeetingCreated);
    s.on(ACTIONS.MEETING_UPDATED, onMeetingUpdated);
    s.on(ACTIONS.MEETING_DELETED, onMeetingDeleted);

    return () => {
      s.off(ACTIONS.MEETING_CREATED, onMeetingCreated);
      s.off(ACTIONS.MEETING_UPDATED, onMeetingUpdated);
      s.off(ACTIONS.MEETING_DELETED, onMeetingDeleted);
    };
  }, [socketRef]);

  useEffect(() => {
    if (!selectedMeeting?._id) return;
    const next = meetings.find((m) => m._id === selectedMeeting._id);
    if (next) {
      setSelectedMeeting(next);
    } else {
      setIsMeetingDetailsOpen(false);
      setIsInviteMoreOpen(false);
      setSelectedMeeting(null);
    }
  }, [meetings, selectedMeeting?._id]);

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

  const openCreateMeetingModal = () => {
    setMeetingModalMode("create");
    setSelectedMeeting(null);
    setIsMeetingModalOpen(true);
  };

  const openEditMeetingModal = (meeting) => {
    setMeetingModalMode("edit");
    setSelectedMeeting(meeting);
    setIsMeetingModalOpen(true);
  };

  const openMeetingDetails = (meeting) => {
    setSelectedMeeting(meeting);
    setIsMeetingDetailsOpen(true);
  };

  const handleDeleteMeeting = async () => {
    if (!selectedMeeting?._id) return;
    if (!confirm("Cancel this meeting?")) return;
    try {
      await deleteMeeting(selectedMeeting._id);
      toast.success("Meeting cancelled");
      setIsMeetingDetailsOpen(false);
      setSelectedMeeting(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel meeting");
    }
  };

  const handleFormat = async () => {
    try {
      const { formatted, supported } = await formatCodeAPI(codeRef.current || "", selectedLanguage);

      if (editorRef.current) {
        // Preserve cursor/scroll position across the format replace
        editorRef.current.setValue(formatted);
      }

      // Update local code ref and autosave pipeline — setValue bypasses onCodeChange
      handleCodeChange(formatted);

      // Broadcast formatted code to all other room participants.
      // We can't rely on the editor's "change" listener because it intentionally
      // ignores origin==="setValue" to prevent remote-update loops.
      if (socketRef.current && roomId && activeFileId) {
        socketRef.current.emit(ACTIONS.CODE_CHANGE, {
          roomId,
          fileId: activeFileId,
          code: formatted,
          language: selectedLanguage,
        });
      }

      toast.success(supported ? "Formatted!" : "Not supported — returned as-is");
    } catch {
      toast.error("Formatting failed");
    }
  };

  const handleDownloadProject = async () => {
    if (!projectId) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/projects/${projectId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Download failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectObj?.name || "project"}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed");
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

  if (!username) return projectLoaded ? <Navigate to="/" /> : null;

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
        knownFolders={knownFolders}
        activeFileId={activeFileId}
        onSelectFile={setActiveFileId}
        onCreateFile={createFile}
        onCreateFolder={handleCreateFolder}
        onDeleteFile={deleteFile}
        onRenameFile={renameFile}
        onDeleteFolder={handleDeleteFolder}
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
        onCopyRoomId={() => {
          const url = new URL(window.location.href);
          // Ensure we copy the current editor URL which includes the token if present
          const inviteLink = url.origin + url.pathname + url.search;
          navigator.clipboard.writeText(inviteLink);
          toast.success("Invite link copied!");
        }}
        onLeaveRoom={() => navigate("/dashboard")}
      />

      <div className="editor-main">
        <EditorToolbar 
          theme={theme}
          onToggleTheme={toggleTheme}
          selectedLanguage={selectedLanguage}
          onSelectLanguage={setSelectedLanguage}
          languages={LANGUAGES}
          files={files}
          activeFileId={activeFileId}
          onSelectFile={setActiveFileId}
          saveStatus={saveStatus}
          isDbFile={isDbFile(activeFileId)}
          onSave={saveFileExplicitly}
          onFormat={handleFormat}
          showHistory={showHistory}
          onToggleHistory={() => { setShowHistory(!showHistory); setShowAIPanel(false); setShowChatPanel(false); setShowMeetingPanel(false); }}
          showChatPanel={showChatPanel}
          onToggleChat={() => { setShowChatPanel(!showChatPanel); setShowAIPanel(false); setShowHistory(false); setShowMeetingPanel(false); }}
          showMeetingPanel={showMeetingPanel}
          onToggleMeetings={() => { setShowMeetingPanel(!showMeetingPanel); setShowAIPanel(false); setShowHistory(false); setShowChatPanel(false); }}
          onRun={runCode}
          isCompiling={isCompiling}
          unreadChatCount={Object.values(unreadChatCounts).reduce((a, b) => a + b, 0)}
          showAIPanel={showAIPanel}
          onToggleAI={() => { setShowAIPanel(!showAIPanel); setShowHistory(false); setShowChatPanel(false); setShowMeetingPanel(false); }}
          onToggleSidebar={() => setSidebarOpen(prev => !prev)}
          onDownloadProject={handleDownloadProject}
        />

        {isReadOnly && <div className="readonly-banner"><Eye size={14} className="inline mr-1" /> View Only</div>}

        <div className="editor-workspace">
          <div className="editor-container">
            <Breadcrumbs activeFile={activeFile} />
            <Editor
              key={activeFileId}
              ref={editorRef}
              socket={socketRef.current}
              roomId={roomId}
              fileId={activeFileId}
              initialValue={fileCodeCache.current[activeFileId]?.code ?? activeFile?.content ?? ""}
              onCodeChange={handleCodeChange}
              onCursorChange={setCursor}
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
          {showMeetingPanel && (
            <MeetingPanel
              meetings={meetings}
              onClose={() => setShowMeetingPanel(false)}
              onSchedule={openCreateMeetingModal}
              onViewMeeting={openMeetingDetails}
              onEditMeeting={openEditMeetingModal}
              currentUsername={username}
            />
          )}
          {showHistory && activeFileId && <VersionHistory fileId={activeFileId} onRestore={c => editorRef.current?.setValue(c)} onClose={() => setShowHistory(false)} />}
        </div>

        <MeetingModal 
          isOpen={isMeetingModalOpen} 
          onClose={() => setIsMeetingModalOpen(false)} 
          projectId={projectId} 
          project={projectObj} 
          mode={meetingModalMode}
          initialMeeting={selectedMeeting}
        />

        <MeetingDetailsModal
          meeting={selectedMeeting}
          isOpen={isMeetingDetailsOpen}
          onClose={() => setIsMeetingDetailsOpen(false)}
          onEdit={() => {
            setIsMeetingDetailsOpen(false);
            openEditMeetingModal(selectedMeeting);
          }}
          onInviteMore={() => {
            setIsMeetingDetailsOpen(false);
            setIsInviteMoreOpen(true);
          }}
          onDelete={handleDeleteMeeting}
          currentUsername={username}
        />

        <InviteParticipantsModal
          isOpen={isInviteMoreOpen}
          onClose={(didUpdate) => {
            setIsInviteMoreOpen(false);
            if (didUpdate && selectedMeeting) {
              setIsMeetingDetailsOpen(true);
            }
          }}
          meeting={selectedMeeting}
          projectMembers={[
            ...(projectObj?.owner ? [projectObj.owner] : []),
            ...((projectObj?.collaborators || []).map((c) => c.user).filter(Boolean)),
          ].filter((user, index, arr) => user?._id && arr.findIndex((u) => u._id === user._id) === index)}
        />

        {isCompileWindowOpen && <CompilerOutput output={output} executionTime={executionTime} onClose={() => setIsCompileWindowOpen(false)} />}
        
        <StatusBar 
          language={selectedLanguage} 
          cursor={cursor} 
          clientsCount={clients.length} 
          status={socketRef.current?.connected ? "connected" : "disconnected"} 
        />
      </div>
    </div>
  );
}

export default EditorPage;
