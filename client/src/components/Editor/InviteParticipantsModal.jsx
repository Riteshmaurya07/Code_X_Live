import React, { useMemo, useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { Users } from "lucide-react";
import ParticipantPicker from "./ParticipantPicker";
import { inviteMeetingParticipants } from "../../services/meetingService";
import { toast } from "react-hot-toast";

const InviteParticipantsModal = ({ isOpen, onClose, meeting, projectMembers = [] }) => {
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const alreadyInvited = useMemo(
    () => new Set((meeting?.participants || []).map((p) => (p._id || p).toString())),
    [meeting]
  );
  const selectableMembers = useMemo(
    () => projectMembers.filter((m) => !alreadyInvited.has(m._id?.toString())),
    [projectMembers, alreadyInvited]
  );

  const handleInvite = async () => {
    if (!meeting?._id || selectedIds.length === 0) return toast.error("Select at least one collaborator");
    try {
      setIsSubmitting(true);
      await inviteMeetingParticipants(meeting._id, selectedIds);
      toast.success("Participants invited");
      setSelectedIds([]);
      onClose(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to invite participants");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => onClose(false)}
      title="Invite More People"
      icon={<Users size={24} />}
      footer={
        <>
          <Button variant="outline" onClick={() => onClose(false)} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleInvite} disabled={isSubmitting}>
            {isSubmitting ? "Inviting..." : "Send Invite"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-[var(--text-secondary)]">Select additional collaborators to join this meeting.</p>
        <ParticipantPicker 
          members={selectableMembers} 
          selectedIds={selectedIds} 
          onToggle={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])} 
        />
      </div>
    </Modal>
  );
};

export default InviteParticipantsModal;
