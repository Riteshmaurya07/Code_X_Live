import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, 
  ChevronDown, ChevronUp, Monitor, GripHorizontal
} from 'lucide-react';
import Button from '../ui/Button';
import ParticipantTile from './ParticipantTile';

const CallPanel = ({ 
  localStream, 
  remoteStreams, 
  isAudioEnabled, 
  isVideoEnabled, 
  toggleAudio, 
  toggleVideo, 
  endCall,
  username,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [timer, setTimer] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const panelRef = useRef(null);
  const dragState = useRef({ dragging: false, startX: 0, startY: 0, startPosX: 0, startPosY: 0 });

  // Call duration timer
  useEffect(() => {
    const interval = setInterval(() => setTimer(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Position panel at bottom-right on mount
  useEffect(() => {
    setPosition({ x: window.innerWidth - 420, y: window.innerHeight - 500 });
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Custom drag via pointer events — no library needed
  const onPointerDown = useCallback((e) => {
    // Only drag from the handle, not from buttons inside it
    if (e.target.closest('button')) return;
    dragState.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [position]);

  const onPointerMove = useCallback((e) => {
    if (!dragState.current.dragging) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setPosition({
      x: dragState.current.startPosX + dx,
      y: dragState.current.startPosY + dy,
    });
  }, []);

  const onPointerUp = useCallback(() => {
    dragState.current.dragging = false;
  }, []);

  const remoteParticipants = remoteStreams instanceof Map
    ? Array.from(remoteStreams.entries())
    : [];

  return (
    <div
      ref={panelRef}
      className={`call-panel ${isExpanded ? 'expanded' : 'minimized'}`}
      style={{ left: position.x, top: position.y }}
    >
      {/* Header / Drag Handle */}
      <div
        className="call-drag-handle"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="call-info">
          <GripHorizontal size={14} className="drag-grip" />
          <span className="call-timer">{formatTime(timer)}</span>
          {!isExpanded && (
            <span className="participant-count">
              {remoteParticipants.length + 1} participants
            </span>
          )}
        </div>
        <button 
          className="panel-toggle-btn" 
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </div>

      {isExpanded && (
        <div className="call-content">
          <div className={`participants-grid grid-${Math.min(remoteParticipants.length + 1, 4)}`}>
            <ParticipantTile 
              stream={localStream}
              username={username}
              isLocal={true}
              audioEnabled={isAudioEnabled}
              videoEnabled={isVideoEnabled}
            />
            {remoteParticipants.map(([socketId, data]) => (
              <ParticipantTile 
                key={socketId}
                stream={data.stream}
                username={data.username || 'User'}
                isLocal={false}
                audioEnabled={data.audioEnabled}
                videoEnabled={data.videoEnabled}
              />
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="call-controls">
        <Button 
          variant="none" 
          className={`control-btn ${!isAudioEnabled ? 'disabled' : ''}`}
          onClick={toggleAudio}
          title={isAudioEnabled ? 'Mute' : 'Unmute'}
        >
          {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
        </Button>
        <Button 
          variant="none" 
          className={`control-btn ${!isVideoEnabled ? 'disabled' : ''}`}
          onClick={toggleVideo}
          title={isVideoEnabled ? 'Stop Video' : 'Start Video'}
        >
          {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
        </Button>
        <Button 
          variant="none" 
          className="control-btn"
          disabled
          title="Screen Share (Coming Soon)"
        >
          <Monitor size={20} />
        </Button>
        <Button 
          variant="danger" 
          className="control-btn end-call-btn"
          onClick={endCall}
          title="End Call"
        >
          <PhoneOff size={20} />
        </Button>
      </div>
    </div>
  );
};

export default CallPanel;
