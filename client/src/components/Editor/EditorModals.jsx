import React from 'react';
import { Slash, Octagon, LoaderCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

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
      <Modal 
        isOpen={!!kickedModal}
        icon={<Slash size={24} />}
        title="Removed from Session"
      >
        <p className="text-base">{kickedModal?.message}</p>
        <p className="mt-4 text-sm text-[var(--text-muted)] italic">Redirecting to home in 3 seconds...</p>
      </Modal>

      <Modal 
        isOpen={!!bannedModal}
        icon={<Octagon size={24} />}
        title="Access Denied"
        footer={
          <>
            <Button variant="outline" onClick={() => navigate("/")}>Go Home</Button>
            <Button onClick={onRejoinRequest} disabled={rejoinPending}>
              {rejoinPending ? "Request Sent..." : "Request to Rejoin"}
            </Button>
          </>
        }
      >
        <p>{bannedModal?.message}</p>
      </Modal>

      <Modal 
        isOpen={!!waitingApproval}
        icon={<LoaderCircle size={24} className="animate-spin text-[var(--accent)]" />}
        title="Waiting Room"
        footer={<Button variant="outline" onClick={() => navigate("/")}>Cancel</Button>}
      >
        <p>{waitingApproval?.message || "Waiting for the room admin to approve your request..."}</p>
      </Modal>
    </>
  );
};

export default EditorModals;
