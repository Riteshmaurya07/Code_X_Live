import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'simple-peer';
import { ACTIONS } from '../Actions';
import toast from 'react-hot-toast';

/**
 * useWebRTC — manages WebRTC audio/video calling via simple-peer (full mesh).
 *
 * Key design decisions vs the broken first draft:
 *   - All mutable state that socket/peer callbacks need is stored in refs,
 *     NOT read from useState closures, to avoid stale-closure bugs.
 *   - Every exposed method is wrapped in useCallback with stable deps.
 *   - Socket listeners are registered ONCE (deps: [socket]) and read
 *     current state through refs, so they never go stale.
 *   - Signal routing inspects the signal data's `type` field instead of
 *     blindly using the `initiator` boolean.
 */
export const useWebRTC = (socket, roomId, username) => {
  // ── React state (drives UI) ────────────────────────────────────────
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [callStatus, setCallStatus] = useState('idle');
  const [callType, setCallType] = useState(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeParticipants, setActiveParticipants] = useState(new Set());

  // ── Refs (stable across renders — used inside callbacks) ───────────
  const peersRef = useRef(new Map());
  const localStreamRef = useRef(null);
  const callStatusRef = useRef('idle');
  const incomingCallRef = useRef(null);
  const isAudioEnabledRef = useRef(true);
  const isVideoEnabledRef = useRef(true);
  const socketRef = useRef(socket);
  const roomIdRef = useRef(roomId);
  const usernameRef = useRef(username);
  const incomingCallTimeoutRef = useRef(null);

  // Keep refs in sync with latest values
  useEffect(() => { socketRef.current = socket; }, [socket]);
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);
  useEffect(() => { usernameRef.current = username; }, [username]);
  useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);
  useEffect(() => { incomingCallRef.current = incomingCall; }, [incomingCall]);
  useEffect(() => { isAudioEnabledRef.current = isAudioEnabled; }, [isAudioEnabled]);
  useEffect(() => { isVideoEnabledRef.current = isVideoEnabled; }, [isVideoEnabled]);

  // ── Helpers ────────────────────────────────────────────────────────
  const stopStream = useCallback((stream) => {
    if (stream) stream.getTracks().forEach(t => t.stop());
  }, []);

  const cleanupPeers = useCallback(() => {
    peersRef.current.forEach(peer => {
      try { peer.destroy(); } catch (_) { /* already destroyed */ }
    });
    peersRef.current.clear();
    setRemoteStreams(new Map());
    setActiveParticipants(new Set());
  }, []);

  // ── Get user media ─────────────────────────────────────────────────
  const getMedia = useCallback(async (type) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Your browser does not support audio/video calls.');
      return null;
    }
    try {
      const constraints = {
        audio: true,
        video: type === 'video'
          ? { width: { ideal: 640 }, height: { ideal: 480 } }
          : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      localStreamRef.current = stream;
      setIsVideoEnabled(type === 'video');
      isVideoEnabledRef.current = type === 'video';
      return stream;
    } catch (err) {
      console.error('Media error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error('Camera/Microphone permission denied.');
      } else {
        toast.error('Failed to access media devices.');
      }
      // Fallback: try audio-only when video was requested
      if (type === 'video') {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setLocalStream(audioStream);
          localStreamRef.current = audioStream;
          setIsVideoEnabled(false);
          isVideoEnabledRef.current = false;
          toast('Falling back to audio only.');
          return audioStream;
        } catch (audioErr) {
          console.error('Audio fallback failed:', audioErr);
          toast.error('Could not access microphone either.');
        }
      }
      return null;
    }
  }, []);

  // ── Create a simple-peer instance ──────────────────────────────────
  const createPeer = useCallback((targetSocketId, initiator, stream) => {
    const s = socketRef.current;
    if (!s) {
      console.error('createPeer: socket is null');
      return null;
    }

    const peer = new Peer({
      initiator,
      trickle: true,
      stream: stream || undefined,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });

    // Route signals by inspecting the data, NOT the `initiator` flag.
    // simple-peer's `signal` event emits:
    //   { type: 'offer', sdp: ... }
    //   { type: 'answer', sdp: ... }
    //   { candidate: ... }              (trickle ICE)
    peer.on('signal', (data) => {
      if (data.type === 'offer') {
        s.emit(ACTIONS.WEBRTC_OFFER, { to: targetSocketId, offer: data });
      } else if (data.type === 'answer') {
        s.emit(ACTIONS.WEBRTC_ANSWER, { to: targetSocketId, answer: data });
      } else if (data.candidate) {
        s.emit(ACTIONS.WEBRTC_ICE_CANDIDATE, { to: targetSocketId, candidate: data });
      }
    });

    peer.on('stream', (remoteStream) => {
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.set(targetSocketId, {
          stream: remoteStream,
          username: 'Participant',
          audioEnabled: true,
          videoEnabled: true,
        });
        return next;
      });
    });

    peer.on('close', () => {
      peersRef.current.delete(targetSocketId);
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.delete(targetSocketId);
        return next;
      });
    });

    peer.on('error', (err) => {
      console.error(`Peer error (${targetSocketId}):`, err.message);
      // Destroy only the broken peer, don't end the entire call
      try { peer.destroy(); } catch (_) {}
      peersRef.current.delete(targetSocketId);
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.delete(targetSocketId);
        return next;
      });
    });

    peersRef.current.set(targetSocketId, peer);
    return peer;
  }, []); // no deps — reads socket from ref

  // ── Exposed methods ────────────────────────────────────────────────

  const startCall = useCallback(async (type) => {
    if (callStatusRef.current !== 'idle') return;
    const s = socketRef.current;
    if (!s) { toast.error('Not connected to room.'); return; }

    const stream = await getMedia(type);
    if (!stream) return;

    setCallType(type);
    setCallStatus('active');
    s.emit(ACTIONS.CALL_INITIATE, { roomId: roomIdRef.current, callType: type });
  }, [getMedia]);

  const declineCall = useCallback(() => {
    const s = socketRef.current;
    const ic = incomingCallRef.current;
    if (s && ic) {
      s.emit(ACTIONS.CALL_ANSWER, { roomId: roomIdRef.current, from: ic.from, accept: false });
    }
    if (incomingCallTimeoutRef.current) {
      clearTimeout(incomingCallTimeoutRef.current);
      incomingCallTimeoutRef.current = null;
    }
    setIncomingCall(null);
    setCallStatus('idle');
  }, []);

  const acceptCall = useCallback(async () => {
    const ic = incomingCallRef.current;
    if (!ic) return;
    const s = socketRef.current;
    if (!s) return;

    if (incomingCallTimeoutRef.current) {
      clearTimeout(incomingCallTimeoutRef.current);
      incomingCallTimeoutRef.current = null;
    }

    const stream = await getMedia(ic.callType);
    if (!stream) {
      declineCall();
      return;
    }

    setCallType(ic.callType);
    setCallStatus('active');
    s.emit(ACTIONS.CALL_ANSWER, { roomId: roomIdRef.current, from: ic.from, accept: true });

    // Callee creates a NON-initiator peer — waits for the offer from the initiator.
    // The initiator will create their peer when they receive CALL_ANSWER(accept:true).
    createPeer(ic.from, false, stream);

    setIncomingCall(null);
  }, [getMedia, declineCall, createPeer]);

  const joinCall = useCallback(async () => {
    const s = socketRef.current;
    if (!s) { toast.error('Not connected to room.'); return; }
    if (callStatusRef.current === 'active') return; // already in call

    const stream = await getMedia('video');
    if (!stream) return;

    setCallType('video');
    setCallStatus('active');
    s.emit(ACTIONS.JOIN_CALL, { roomId: roomIdRef.current });
  }, [getMedia]);

  const endCall = useCallback(() => {
    const s = socketRef.current;
    if (s) {
      s.emit(ACTIONS.LEAVE_CALL, { roomId: roomIdRef.current });
    }
    cleanupPeers();
    stopStream(localStreamRef.current);
    setLocalStream(null);
    localStreamRef.current = null;
    setCallStatus('idle');
    setCallType(null);
    setIsAudioEnabled(true);
    setIsVideoEnabled(true);
    isAudioEnabledRef.current = true;
    isVideoEnabledRef.current = true;
  }, [cleanupPeers, stopStream]);

  const toggleAudio = useCallback(() => {
    const stream = localStreamRef.current;
    const s = socketRef.current;
    if (!stream) return;
    const enabled = !isAudioEnabledRef.current;
    stream.getAudioTracks().forEach((t) => { t.enabled = enabled; });
    setIsAudioEnabled(enabled);
    isAudioEnabledRef.current = enabled;
    if (s) s.emit(ACTIONS.TOGGLE_MEDIA, { roomId: roomIdRef.current, type: 'audio', enabled });
  }, []);

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    const s = socketRef.current;
    if (!stream) return;
    const enabled = !isVideoEnabledRef.current;
    stream.getVideoTracks().forEach((t) => { t.enabled = enabled; });
    setIsVideoEnabled(enabled);
    isVideoEnabledRef.current = enabled;
    if (s) s.emit(ACTIONS.TOGGLE_MEDIA, { roomId: roomIdRef.current, type: 'video', enabled });
  }, []);

  // ── Socket listeners (registered ONCE per socket) ──────────────────
  useEffect(() => {
    if (!socket) return;

    const onIncomingCall = ({ from, username: callerName, callType: ct }) => {
      if (callStatusRef.current !== 'idle') {
        // Already busy — auto-decline
        socket.emit(ACTIONS.CALL_ANSWER, {
          roomId: roomIdRef.current, from, accept: false,
        });
        return;
      }

      setIncomingCall({ from, username: callerName, callType: ct });
      setCallStatus('incoming');

      // Auto-dismiss after 30 s
      incomingCallTimeoutRef.current = setTimeout(() => {
        if (callStatusRef.current === 'incoming') {
          // Use ref-based decline logic directly to avoid stale closure
          const s = socketRef.current;
          const ic = incomingCallRef.current;
          if (s && ic) {
            s.emit(ACTIONS.CALL_ANSWER, { roomId: roomIdRef.current, from: ic.from, accept: false });
          }
          setIncomingCall(null);
          setCallStatus('idle');
        }
      }, 30000);
    };

    const onCallAnswer = ({ from, username: name, accept }) => {
      if (accept) {
        toast.success(`${name} joined the call.`);
        // Initiator creates their peer NOW (the callee already created a non-initiator peer)
        if (!peersRef.current.has(from)) {
          createPeer(from, true, localStreamRef.current);
        }
      } else {
        toast(`${name} declined the call.`);
      }
    };

    const onJoinCallResponse = ({ existingParticipants }) => {
      // Late joiner initiates peers to everyone already in the call
      (existingParticipants || []).forEach((targetId) => {
        if (targetId !== socket.id && !peersRef.current.has(targetId)) {
          createPeer(targetId, true, localStreamRef.current);
        }
      });
    };

    const onParticipantJoinedCall = ({ socketId: sid }) => {
      setActiveParticipants((prev) => new Set(prev).add(sid));
      // The joiner will initiate peers to us — we just wait for their offer.
    };

    const onParticipantLeftCall = ({ socketId: sid }) => {
      setActiveParticipants((prev) => {
        const n = new Set(prev);
        n.delete(sid);
        return n;
      });
      const peer = peersRef.current.get(sid);
      if (peer) {
        try { peer.destroy(); } catch (_) {}
        peersRef.current.delete(sid);
      }
      setRemoteStreams((prev) => {
        const n = new Map(prev);
        n.delete(sid);
        return n;
      });
    };

    const onWebRTCOffer = ({ from, offer }) => {
      const existing = peersRef.current.get(from);
      if (existing) {
        // Feed the offer/ICE into the existing peer
        existing.signal(offer);
      } else {
        // We don't have a peer for this socket — create a non-initiator peer
        const peer = createPeer(from, false, localStreamRef.current);
        if (peer) peer.signal(offer);
      }
    };

    const onWebRTCAnswer = ({ from, answer }) => {
      const peer = peersRef.current.get(from);
      if (peer) peer.signal(answer);
    };

    const onWebRTCICECandidate = ({ from, candidate }) => {
      const peer = peersRef.current.get(from);
      if (peer) peer.signal(candidate);
    };

    const onParticipantMediaToggle = ({ socketId: sid, type, enabled }) => {
      setRemoteStreams((prev) => {
        const n = new Map(prev);
        const p = n.get(sid);
        if (p) {
          n.set(sid, {
            ...p,
            [type === 'audio' ? 'audioEnabled' : 'videoEnabled']: enabled,
          });
        }
        return n;
      });
    };

    socket.on(ACTIONS.INCOMING_CALL, onIncomingCall);
    socket.on(ACTIONS.CALL_ANSWER, onCallAnswer);
    socket.on(ACTIONS.JOIN_CALL, onJoinCallResponse);
    socket.on(ACTIONS.PARTICIPANT_JOINED_CALL, onParticipantJoinedCall);
    socket.on(ACTIONS.PARTICIPANT_LEFT_CALL, onParticipantLeftCall);
    socket.on(ACTIONS.WEBRTC_OFFER, onWebRTCOffer);
    socket.on(ACTIONS.WEBRTC_ANSWER, onWebRTCAnswer);
    socket.on(ACTIONS.WEBRTC_ICE_CANDIDATE, onWebRTCICECandidate);
    socket.on(ACTIONS.PARTICIPANT_MEDIA_TOGGLE, onParticipantMediaToggle);

    return () => {
      socket.off(ACTIONS.INCOMING_CALL, onIncomingCall);
      socket.off(ACTIONS.CALL_ANSWER, onCallAnswer);
      socket.off(ACTIONS.JOIN_CALL, onJoinCallResponse);
      socket.off(ACTIONS.PARTICIPANT_JOINED_CALL, onParticipantJoinedCall);
      socket.off(ACTIONS.PARTICIPANT_LEFT_CALL, onParticipantLeftCall);
      socket.off(ACTIONS.WEBRTC_OFFER, onWebRTCOffer);
      socket.off(ACTIONS.WEBRTC_ANSWER, onWebRTCAnswer);
      socket.off(ACTIONS.WEBRTC_ICE_CANDIDATE, onWebRTCICECandidate);
      socket.off(ACTIONS.PARTICIPANT_MEDIA_TOGGLE, onParticipantMediaToggle);
      if (incomingCallTimeoutRef.current) clearTimeout(incomingCallTimeoutRef.current);
    };
  }, [socket, createPeer]); // only re-register when socket instance changes

  // ── Cleanup on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cleanupPeers();
      stopStream(localStreamRef.current);
      localStreamRef.current = null;
      if (incomingCallTimeoutRef.current) clearTimeout(incomingCallTimeoutRef.current);
    };
  }, [cleanupPeers, stopStream]);

  return {
    localStream,
    remoteStreams,
    callStatus,
    callType,
    isAudioEnabled,
    isVideoEnabled,
    incomingCall,
    activeParticipants,
    startCall,
    acceptCall,
    declineCall,
    joinCall,
    endCall,
    toggleAudio,
    toggleVideo,
  };
};
