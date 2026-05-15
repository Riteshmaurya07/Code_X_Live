/**
 * videoHandlers.js — Handles WebRTC signaling for audio/video calls.
 * 
 * Peer connection topology: Full Mesh (every peer connects to every other peer).
 * Max participants: 8
 */

const ACTIONS = require("../../Actions");
const logger = require("../../utils/logger");
const { activeCallRooms, userSocketMap } = require("../roomState");

const registerVideoHandlers = (io, socket) => {
  
  // 1. INITIATE CALL
  socket.on(ACTIONS.CALL_INITIATE, ({ roomId, callType }) => {
    // Security check: Verify socket is in the room
    if (!socket.rooms.has(roomId)) {
      return socket.emit("error", { message: "Unauthorized: You are not in this room." });
    }

    let callParticipants = activeCallRooms.get(roomId);
    
    // Check if a call is already active and if it's full
    if (callParticipants && callParticipants.size >= 8) {
      return socket.emit("error", { message: "Call is full (max 8 participants)." });
    }

    if (!callParticipants) {
      callParticipants = new Set();
      activeCallRooms.set(roomId, callParticipants);
    }

    const username = userSocketMap[socket.id];
    
    // Add initiator to call participants
    callParticipants.add(socket.id);

    // Notify others in the room about the incoming call
    socket.to(roomId).emit(ACTIONS.INCOMING_CALL, {
      from: socket.id,
      username,
      callType
    });

    logger.info(`Call initiated in room ${roomId} by ${username} (${socket.id})`);
  });

  // 2. ANSWER CALL
  socket.on(ACTIONS.CALL_ANSWER, ({ roomId, from, accept }) => {
    if (!socket.rooms.has(roomId)) return;

    const callParticipants = activeCallRooms.get(roomId);
    if (!callParticipants) return;

    if (accept) {
      callParticipants.add(socket.id);
      // Notify the initiator that the call was accepted
      io.to(from).emit(ACTIONS.CALL_ANSWER, {
        from: socket.id,
        username: userSocketMap[socket.id],
        accept: true
      });
      
      // Notify everyone in the call that a new participant joined
      socket.to(roomId).emit(ACTIONS.PARTICIPANT_JOINED_CALL, {
        socketId: socket.id,
        username: userSocketMap[socket.id]
      });
    } else {
      // If declined and only initiator is left, we might want to clean up, 
      // but usually the initiator just waits. 
      // However, per requirements: "If declined and only initiator in call, remove room from map."
      if (callParticipants.size <= 1) {
        activeCallRooms.delete(roomId);
      }
      
      io.to(from).emit(ACTIONS.CALL_ANSWER, {
        from: socket.id,
        username: userSocketMap[socket.id],
        accept: false
      });
    }
  });

  // 3. JOIN ACTIVE CALL (Late joiner)
  socket.on(ACTIONS.JOIN_CALL, ({ roomId }) => {
    if (!socket.rooms.has(roomId)) return;

    let callParticipants = activeCallRooms.get(roomId);
    if (!callParticipants) {
      // If no call active, maybe start one? 
      // But typically user joins an active one.
      return socket.emit("error", { message: "No active call in this room." });
    }

    if (callParticipants.size >= 8) {
      return socket.emit("error", { message: "Call is full." });
    }

    const existingParticipants = Array.from(callParticipants);
    callParticipants.add(socket.id);

    // Send back list of existing participants so late joiner can initiate peers with them
    socket.emit(ACTIONS.JOIN_CALL, {
      existingParticipants
    });

    // Notify existing participants that someone new is joining
    socket.to(roomId).emit(ACTIONS.PARTICIPANT_JOINED_CALL, {
      socketId: socket.id,
      username: userSocketMap[socket.id]
    });

    logger.info(`${userSocketMap[socket.id]} joined active call in room ${roomId}`);
  });

  // 4. LEAVE CALL
  socket.on(ACTIONS.LEAVE_CALL, ({ roomId }) => {
    const callParticipants = activeCallRooms.get(roomId);
    if (callParticipants) {
      callParticipants.delete(socket.id);
      if (callParticipants.size === 0) {
        activeCallRooms.delete(roomId);
      }
    }

    socket.to(roomId).emit(ACTIONS.PARTICIPANT_LEFT_CALL, {
      socketId: socket.id,
      username: userSocketMap[socket.id]
    });
    
    logger.info(`${userSocketMap[socket.id]} left call in room ${roomId}`);
  });

  // 5. WEBRTC SIGNALING (Forwarding)
  socket.on(ACTIONS.WEBRTC_OFFER, ({ to, offer }) => {
    io.to(to).emit(ACTIONS.WEBRTC_OFFER, {
      from: socket.id,
      offer
    });
  });

  socket.on(ACTIONS.WEBRTC_ANSWER, ({ to, answer }) => {
    io.to(to).emit(ACTIONS.WEBRTC_ANSWER, {
      from: socket.id,
      answer
    });
  });

  socket.on(ACTIONS.WEBRTC_ICE_CANDIDATE, ({ to, candidate }) => {
    io.to(to).emit(ACTIONS.WEBRTC_ICE_CANDIDATE, {
      from: socket.id,
      candidate
    });
  });

  // 6. MEDIA TOGGLE (Mute/Video off)
  socket.on(ACTIONS.TOGGLE_MEDIA, ({ roomId, type, enabled }) => {
    socket.to(roomId).emit(ACTIONS.PARTICIPANT_MEDIA_TOGGLE, {
      socketId: socket.id,
      type,
      enabled
    });
  });
};

module.exports = { registerVideoHandlers };
