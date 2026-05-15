import React, { useEffect, useRef } from 'react';
import Avatar from 'react-avatar';
import { MicOff, VideoOff } from 'lucide-react';

const ParticipantTile = ({ 
  stream, 
  username, 
  isLocal, 
  audioEnabled = true, 
  videoEnabled = true,
  isSpeaking = false
}) => {
  const videoRef = useRef(null);

  // Assign stream to video element via ref — never via useState
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream || null;
    }
  }, [stream]);

  const hasVideoTrack = stream && stream.getVideoTracks().length > 0;
  const showVideo = videoEnabled && hasVideoTrack;

  return (
    <div className={`participant-tile ${isSpeaking ? 'speaking' : ''}`}>
      {/* Always render the video element so srcObject assignment works,
          but hide it when video is off */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="participant-video"
        style={{ display: showVideo ? 'block' : 'none' }}
      />

      {!showVideo && (
        <div className="participant-avatar-container">
          <Avatar 
            name={username} 
            size="80" 
            round={true} 
            className="participant-avatar"
          />
        </div>
      )}
      
      <div className="participant-info">
        <span className="participant-name">
          {username} {isLocal ? '(You)' : ''}
        </span>
        <div className="participant-status-icons">
          {!audioEnabled && <MicOff size={14} className="text-red-500" />}
          {!videoEnabled && <VideoOff size={14} className="text-red-500" />}
        </div>
      </div>
      
      {isSpeaking && <div className="speaking-indicator" />}
    </div>
  );
};

export default ParticipantTile;
