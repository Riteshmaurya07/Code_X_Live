import React from 'react';
import Avatar from 'react-avatar';
import { Phone, Video, X, Check } from 'lucide-react';
import Button from '../ui/Button';

const IncomingCallModal = ({ 
  incomingCall, 
  acceptCall, 
  declineCall 
}) => {
  if (!incomingCall) return null;

  return (
    <div className="incoming-call-modal">
      <div className="incoming-call-content">
        <div className="caller-info">
          <Avatar 
            name={incomingCall.username} 
            size="50" 
            round={true} 
            className="caller-avatar"
          />
          <div className="caller-details">
            <h4 className="caller-name">{incomingCall.username}</h4>
            <p className="call-type-label">
              {incomingCall.callType === 'video' ? (
                <><Video size={14} className="inline mr-1" /> Incoming video call...</>
              ) : (
                <><Phone size={14} className="inline mr-1" /> Incoming audio call...</>
              )}
            </p>
          </div>
        </div>
        
        <div className="incoming-call-actions">
          <Button 
            variant="danger" 
            size="sm" 
            className="action-btn decline"
            onClick={declineCall}
          >
            <X size={20} className="mr-1" /> Decline
          </Button>
          <Button 
            variant="success" 
            size="sm" 
            className="action-btn accept"
            onClick={acceptCall}
          >
            <Check size={20} className="mr-1" /> Accept
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
