// All the events
const ACTIONS = {
  JOIN: "join",
  JOINED: "joined",
  DISCONNECTED: "disconnected",
  CODE_CHANGE: "code-change",   // <-- IMPORTANT
  SYNC_CODE: "sync-code",
  LEAVE: "leave",

  // Admin Room Control
  KICK_USER: "kick-user",
  KICKED: "kicked",
  ROOM_BANNED: "room-banned",
  REJOIN_REQUEST: "rejoin-request",
  APPROVAL_REQUEST: "approval-request",
  APPROVE_REJOIN: "approve-rejoin",
  DENY_REJOIN: "deny-rejoin",
  REJOIN_APPROVED: "rejoin-approved",
  REJOIN_DENIED: "rejoin-denied",
  ROOM_UPDATE: "room-update",

  // File sync events
  FILE_CREATED: "file-created",
  FILE_RENAMED: "file-renamed",
  FILE_DELETED: "file-deleted",

  // Permission management
  SET_PERMISSION: "set-permission",
  PERMISSION_UPDATED: "permission-updated",
  PERMISSION_DENIED: "permission-denied",

  // Chat events
  SEND_ROOM_MESSAGE: "send-room-message",
  RECEIVE_ROOM_MESSAGE: "receive-room-message",
  SEND_PRIVATE_MESSAGE: "send-private-message",
  RECEIVE_PRIVATE_MESSAGE: "receive-private-message",
  CHAT_HISTORY: "chat-history",

  // Room & Role events
  CREATE_ROOM: "create-room",
  ROOM_CREATED: "room-created",
  PROMOTE_TO_EDITOR: "promote-to-editor",
  DEMOTE_TO_VIEWER: "demote-to-viewer",
  ROLE_UPDATED: "role-updated",
  INVALID_INVITE: "invalid-invite",
  WAIT_FOR_APPROVAL: "wait-for-approval",
};

module.exports = ACTIONS;
