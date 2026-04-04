import React from 'react';
import Button from '../ui/Button';

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
      <span className="section-label" style={{ color: "var(--warning)"}}>
        Pending Requests ({approvalRequests.length})
      </span>
      <div className="members-list">
        {approvalRequests.map((request) => (
          <div key={request.requesterSocketId} className="client pending-client" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.9rem", color: "var(--text)" }}>{request.username}</span>
            <div className="client-controls" style={{ display: "flex", gap: "4px" }}>
              <button
                className="btn btn-outline"
                title="Approve"
                style={{ padding: "2px 6px", fontSize: "0.8rem", color: "var(--success)", borderColor: "var(--success)" }}
                onClick={() => onApproveRejoin(request)}
              >
                ✅
              </button>
              <button
                className="btn btn-danger"
                title="Deny"
                style={{ padding: "2px 6px", fontSize: "0.8rem" }}
                onClick={() => onDenyRejoin(request)}
              >
                ❌
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PendingRequests;
