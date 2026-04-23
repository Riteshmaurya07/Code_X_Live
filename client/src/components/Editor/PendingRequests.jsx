import React from 'react';
import { Check, X } from 'lucide-react';

/**
 * Renders the list of pending join requests for the admin
 */
const PendingRequests = ({
  approvalRequests,
  onApproveRejoin,
  onDenyRejoin
}) => {
  if (!approvalRequests || approvalRequests.length === 0) {
    return null;
  }

  return (
    <div className="members-section pending-requests">
      <span className="section-label text-[var(--warning)]">
        Pending Requests ({approvalRequests.length})
      </span>
      <div className="members-list">
        {approvalRequests.map((request) => (
          <div key={request.requesterSocketId} className="client pending-client mb-2 flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">{request.username}</span>
            <div className="client-controls flex gap-1">
              <button
                className="btn btn-outline px-1.5 py-0.5 text-xs text-[var(--success)] border-[var(--success)]"
                title="Approve"
                onClick={() => onApproveRejoin(request)}
              >
                <Check size={14} />
              </button>
              <button
                className="btn btn-danger px-1.5 py-0.5 text-xs"
                title="Deny"
                onClick={() => onDenyRejoin(request)}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PendingRequests;
