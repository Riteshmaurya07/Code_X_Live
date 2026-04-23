import React from 'react';
import Logo from '../ui/Logo';
import FileExplorer from '../FileExplorer';
import MembersList from './MembersList';
import PendingRequests from './PendingRequests';
import Button from '../ui/Button';

const EditorSidebar = ({
  isOpen, onClose,
  files, knownFolders, activeFileId, onSelectFile,
  onCreateFile, onCreateFolder, onDeleteFile, onRenameFile, onDeleteFolder,
  clients, username, adminUsername, isAdmin, permissions,
  approvalRequests, onApproveRejoin, onDenyRejoin,
  onKick, onSetPermission, onMessageUser,
  onCopyRoomId, onLeaveRoom
}) => {
  return (
    <>
      {/* Mobile overlay backdrop */}
      <div
        className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
      />

      <div className={`editor-sidebar ${isOpen ? 'open' : ''}`}>
        <Logo className="sidebar-logo" />
        <hr />
        
        <div className="sidebar-scroll-content">
          <FileExplorer
            files={files}
            knownFolders={knownFolders}
            activeFileId={activeFileId}
            onSelectFile={(id) => { onSelectFile(id); if (onClose) onClose(); }}
            onCreateFile={onCreateFile}
            onCreateFolder={onCreateFolder}
            onDeleteFile={onDeleteFile}
            onRenameFile={onRenameFile}
            onDeleteFolder={onDeleteFolder}
          />

          <hr />

          <MembersList 
            clients={clients}
            username={username}
            adminUsername={adminUsername}
            isAdmin={isAdmin}
            permissions={permissions}
            onKick={onKick}
            onSetPermission={onSetPermission}
            onMessageUser={onMessageUser}
          />

          {isAdmin && approvalRequests && approvalRequests.length > 0 && (
            <>
              <hr />
              <PendingRequests 
                approvalRequests={approvalRequests}
                onApproveRejoin={onApproveRejoin}
                onDenyRejoin={onDenyRejoin}
              />
            </>
          )}
        </div>

        <div className="sidebar-footer">
          <Button variant="outline" fullWidth onClick={onCopyRoomId}>
            Copy Room ID
          </Button>
          <Button variant="danger" fullWidth onClick={onLeaveRoom}>
            Leave Room
          </Button>
        </div>
      </div>
    </>
  );
};

export default EditorSidebar;
