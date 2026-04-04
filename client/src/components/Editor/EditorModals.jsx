import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

/**
 * Handles all administrative modals for the Editor (Kicked, Banned, Rejoin Requests)
 */
const EditorModals = ({
  kickedModal,
  bannedModal,
  waitingApproval,
  rejoinPending,
  onRejoinRequest,
  navigate
}) => {
  return (
    <>
      {/* ===== KICKED MODAL ===== */}
      <Modal 
        isOpen={!!kickedModal}
        variant="kicked"
        icon="🚫"
        title="Removed from Session"
      >
        <p>{kickedModal?.message}</p>
        <p className="admin-modal-sub">Redirecting to home in 3 seconds...</p>
      </Modal>

      {/* ===== BANNED MODAL ===== */}
      <Modal 
        isOpen={!!bannedModal}
        variant="banned"
        icon="⛔"
        title="Access Denied"
        footer={
          <>
            <Button variant="outline" onClick={() => navigate("/")}>
              Go Home
            </Button>
            <Button onClick={onRejoinRequest} disabled={rejoinPending}>
              {rejoinPending ? "Request Sent..." : "Request to Rejoin"}
            </Button>
          </>
        }
      >
        <p>{bannedModal?.message}</p>
      </Modal>

      {/* ===== WAITING APPROVAL MODAL (Guest only) ===== */}
      <Modal 
        isOpen={!!waitingApproval}
        variant="approval"
        icon="⏳"
        title="Waiting Room"
        footer={
          <Button variant="outline" onClick={() => navigate("/")}>
            Cancel
          </Button>
        }
      >
        <p>
          {waitingApproval?.message || "Waiting for the room admin to approve your request..."}
        </p>
      </Modal>
    </>
  );
};

export default EditorModals;
