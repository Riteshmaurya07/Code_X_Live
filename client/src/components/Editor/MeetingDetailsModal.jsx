import React from "react";
import Modal from "../ui/Modal";
import { toast } from "react-hot-toast";
import { Calendar } from "lucide-react";

const MeetingDetailsModal = ({ meeting, isOpen, onClose, onEdit, onInviteMore, onDelete, currentUsername }) => {
  if (!isOpen || !meeting) return null;
  const isHost = meeting.createdBy?.username === currentUsername;

  const copyMeetingLink = async () => {
    try {
      await navigator.clipboard.writeText(meeting.meetingLink || "");
      toast.success("Link copied!");
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Meeting Details"
      icon={<Calendar size={24} />}
      footer={
        <>
          <button className="admin-modal-btn secondary" onClick={onClose}>
            Close
          </button>
          {isHost && (
            <>
              <button className="admin-modal-btn secondary" onClick={onInviteMore}>
                Invite More
              </button>
              <button className="admin-modal-btn primary" onClick={onEdit}>
                Edit Meeting
              </button>
            </>
          )}
        </>
      }
    >
      <div className="space-y-3 text-left">
        <div>
          <p className="text-lg font-semibold text-[var(--text-primary)]">{meeting.title}</p>
          {meeting.description && (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{meeting.description}</p>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2 text-sm text-[var(--text-secondary)] sm:grid-cols-2">
          <p><span className="text-[var(--text-muted)]">Date:</span> {new Date(meeting.startTime).toLocaleDateString()}</p>
          <p><span className="text-[var(--text-muted)]">Time:</span> {new Date(meeting.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
          <p><span className="text-[var(--text-muted)]">Duration:</span> {meeting.duration} min</p>
          <p><span className="text-[var(--text-muted)]">Host:</span> @{meeting.createdBy?.username || "Unknown"}</p>
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-[var(--text-muted)]">Participants</p>
          <div className="flex flex-wrap gap-2">
            {(meeting.participants || []).map((person) => (
              <span key={person._id || person} className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-tertiary)] px-2.5 py-1 text-xs text-[var(--text-primary)]">
                {person.avatar ? (
                  <img src={person.avatar} alt={person.username} className="h-5 w-5 rounded-full object-cover" />
                ) : (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] text-white">
                    {(person.username || "?").charAt(0).toUpperCase()}
                  </span>
                )}
                @{person.username || "unknown"}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-[var(--text-muted)]">Meeting Link</p>
          <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-tertiary)] p-2">
            <p className="min-w-0 flex-1 truncate text-xs text-[var(--text-muted)]">{meeting.meetingLink}</p>
            <button className="rounded border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-primary)] hover:border-[var(--accent)]" onClick={copyMeetingLink}>
              Copy
            </button>
          </div>
          {meeting.meetingLink && (
            <a
              className="mt-2 inline-block text-xs text-[var(--accent)] hover:underline"
              href={`mailto:?subject=${encodeURIComponent(`Meeting: ${meeting.title}`)}&body=${encodeURIComponent(`Join meeting: ${meeting.meetingLink}`)}`}
            >
              Share
            </a>
          )}
        </div>

        {isHost && onDelete && (
          <button
            className="mt-2 w-full rounded-[var(--radius-sm)] border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300 hover:bg-red-500/20"
            onClick={onDelete}
          >
            Cancel Meeting
          </button>
        )}
      </div>
    </Modal>
  );
};

export default MeetingDetailsModal;
