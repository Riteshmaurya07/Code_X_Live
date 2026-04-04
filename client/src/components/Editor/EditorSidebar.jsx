import React from 'react';
import Logo from '../ui/Logo';
import FileExplorer from '../FileExplorer';
import MembersList from './MembersList';
import PendingRequests from './PendingRequests';
import Button from '../ui/Button';

/**
 * Left sidebar for the EditorPage, managing navigation, files, and users.
 */
const EditorSidebar = ({
  files,
  activeFileId,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  clients,
  username,
  adminUsername,
  isAdmin,
  permissions,
  approvalRequests,
  onApproveRejoin,
  onDenyRejoin,
  onKick,
  onSetPermission,
  onMessageUser,
  onCopyRoomId,
  onLeaveRoom
}) => {
  return (
    <div className="editor-sidebar">
      <Logo className="sidebar-logo" />
      <hr />
      
      {/* Scrollable middle section */}
      <div className="sidebar-scroll-content">
        <FileExplorer
          files={files}
          activeFileId={activeFileId}
          onSelectFile={onSelectFile}
          onCreateFile={onCreateFile}
          onDeleteFile={onDeleteFile}
          onRenameFile={onRenameFile}
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

      {/* Fixed bottom actions */}
      <div className="sidebar-footer">
        <Button 
          variant="outline" 
          fullWidth 
          onClick={onCopyRoomId} 
          className="mb-2"
        >
          Copy Room ID
        </Button>
        <Button 
          variant="danger" 
          fullWidth 
          onClick={onLeaveRoom}
        >
          Leave Room
        </Button>
      </div>
    </div>
  );
};

export default EditorSidebar;
