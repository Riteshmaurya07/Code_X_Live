import React from 'react';
import { ShieldCheck } from 'lucide-react';
import Client from '../Client';

/**
 * Renders the list of active members in the room with their roles
 */
const MembersList = ({
  clients,
  username,
  adminUsername,
  isAdmin,
  permissions,
  onKick,
  onSetPermission,
  onMessageUser
}) => {
  return (
    <div className="members-section">
      <span className="section-label">
        Members
        {isAdmin && (
          <span className="admin-badge-label">
            <ShieldCheck size={14} className="inline mr-1" /> Admin
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
            onKick={onKick}
            onSetPermission={onSetPermission}
            onMessageUser={onMessageUser}
          />
        ))}
      </div>
    </div>
  );
};

export default MembersList;
