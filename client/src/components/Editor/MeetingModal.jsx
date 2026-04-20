import React, { useMemo, useState, useEffect } from "react";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import ParticipantPicker from "./ParticipantPicker";
import { createMeeting, updateMeeting } from "../../services/meetingService";
import { toast } from "react-hot-toast";

const MeetingModal = ({ isOpen, onClose, projectId, project, mode = "create", initialMeeting = null }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [participants, setParticipants] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMeeting, setSuccessMeeting] = useState(null);

  const isEditMode = mode === "edit" && initialMeeting?._id;
  const projectMembers = useMemo(() => {
    const dedup = new Map();
    if (project?.owner?._id) {
      dedup.set(project.owner._id, project.owner);
    }
    (project?.collaborators || []).forEach((c) => {
      if (c?.user?._id) dedup.set(c.user._id, c.user);
    });
    return [...dedup.values()];
  }, [project]);

  useEffect(() => {
    if (!isOpen) return;
    if (isEditMode && initialMeeting) {
      const start = new Date(initialMeeting.startTime);
      setTitle(initialMeeting.title || "");
      setDescription(initialMeeting.description || "");
      setDate(start.toISOString().slice(0, 10));
      setStartTime(`${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`);
      setDuration(initialMeeting.duration || 30);
      setParticipants((initialMeeting.participants || []).map((p) => p._id || p).filter(Boolean));
      return;
    }

    const now = new Date();
    setTitle("");
    setDescription("");
    setParticipants([]);
    setDate(now.toISOString().split("T")[0]);
    setStartTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
    setDuration(30);
  }, [isOpen, isEditMode, initialMeeting]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !date || !startTime) {
      toast.error("Please fill in required fields.");
      return;
    }

    const startDateTime = new Date(`${date}T${startTime}:00`);
    if (!isEditMode && startDateTime < new Date()) {
      toast.error("Meeting time cannot be in the past.");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        title,
        description,
        participants,
        startTime: startDateTime.toISOString(),
        duration,
      };

      let response;
      if (isEditMode) {
        response = await updateMeeting(initialMeeting._id, payload);
        toast.success("Meeting updated");
        onClose();
      } else {
        response = await createMeeting({ ...payload, projectId });
        setSuccessMeeting(response);
        toast.success("Meeting scheduled successfully!");
      }

    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${isEditMode ? "update" : "schedule"} meeting.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleParticipant = (userId) => {
    setParticipants((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const copyMeetingLink = async (link) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied!");
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <>
      <div className="modal-overlay">
        <div className="modal-content w-full max-w-2xl rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-0">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {isEditMode ? "Edit Meeting" : "Schedule a Meeting"}
            </h2>
            <button className="text-xl text-[var(--text-muted)] hover:text-[var(--text-primary)]" onClick={onClose}>×</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text-secondary)]">Meeting Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Code Review, Pair Programming"
                className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text-secondary)]">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will this meeting be about?"
                rows={3}
                className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--text-secondary)]">Date *</label>
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--text-secondary)]">Start Time *</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text-secondary)]">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              >
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={60}>1 Hour</option>
                <option value={120}>2 Hours</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text-secondary)]">Invite Collaborators</label>
              <ParticipantPicker
                members={projectMembers}
                selectedIds={participants}
                onToggle={handleToggleParticipant}
              />
            </div>

            <div className="flex justify-end gap-3 border-t border-[var(--border)] pt-4">
              <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (isEditMode ? "Saving..." : "Scheduling...") : (isEditMode ? "Save Changes" : "Schedule Meeting")}
              </Button>
            </div>
          </form>
        </div>
      </div>
      <Modal
        isOpen={Boolean(successMeeting)}
        onClose={() => {
          setSuccessMeeting(null);
          onClose();
        }}
        title="Meeting Created"
        icon="✅"
        footer={
          <>
            <button
              className="admin-modal-btn secondary"
              onClick={() => {
                setSuccessMeeting(null);
                onClose();
              }}
            >
              Close
            </button>
            <button
              className="admin-modal-btn primary"
              onClick={() => copyMeetingLink(successMeeting?.meetingLink)}
            >
              Copy Link
            </button>
          </>
        }
      >
        <p className="mb-2 text-sm text-[var(--text-secondary)]">
          Your meeting has been scheduled successfully.
        </p>
        <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-tertiary)] p-2">
          <p className="truncate text-xs text-[var(--text-muted)]">{successMeeting?.meetingLink}</p>
        </div>
        {successMeeting?.meetingLink && (
          <a
            href={`mailto:?subject=${encodeURIComponent(`Meeting: ${successMeeting.title}`)}&body=${encodeURIComponent(`Join meeting: ${successMeeting.meetingLink}`)}`}
            className="mt-3 inline-block text-xs text-[var(--accent)] hover:underline"
          >
            Share via Email
          </a>
        )}
      </Modal>
    </>
  );
};

export default MeetingModal;
