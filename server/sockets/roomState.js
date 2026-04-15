/**
 * roomState.js — Shared in-memory state for all socket handlers.
 * All Maps/objects here reset on server restart (by design — they are ephemeral session state).
 */

const userSocketMap = {};                   // socketId  → username
const globalUserSockets = new Map();        // userId    → socketId

const roomBanList = new Map();              // roomId    → Set<username>
const roomAdmins = new Map();              // roomId    → { socketId, username }
const roomApprovedJoiners = new Map();     // roomId    → Set<username>
const roomState = new Map();               // roomId    → Map<fileId, { code, language }>
const roomPermissions = new Map();         // roomId    → Map<username, 'editor'|'viewer'>
const roomInviteTokens = new Map();        // roomId    → inviteToken
const roomCleanupTimers = new Map();       // roomId    → TimeoutHandle

const roomMessages = new Map();            // roomId    → Array<msg>
const privateMessages = new Map();         // "userA__userB" → Array<msg>
const MAX_ROOM_MESSAGES = 50;

const cursorPositions = {};                // roomId    → { socketId: { username, line, ch } }
const cursorThrottle = {};                 // socketId  → lastEmitTimestamp
const CURSOR_THROTTLE_MS = 50;

const getAllConnectedClients = (io, roomId) =>
  Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => ({
    socketId,
    username: userSocketMap[socketId],
  }));

module.exports = {
  userSocketMap,
  globalUserSockets,
  roomBanList,
  roomAdmins,
  roomApprovedJoiners,
  roomState,
  roomPermissions,
  roomInviteTokens,
  roomCleanupTimers,
  roomMessages,
  privateMessages,
  MAX_ROOM_MESSAGES,
  cursorPositions,
  cursorThrottle,
  CURSOR_THROTTLE_MS,
  getAllConnectedClients,
};
