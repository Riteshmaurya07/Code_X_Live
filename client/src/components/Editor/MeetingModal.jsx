import React, { useState, useEffect } from "react";
import Button from "../ui/Button";
import { createMeeting } from "../../services/meetingService";
import { toast } from "react-hot-toast";

const MeetingModal = ({ isOpen, onClose, projectId, project }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [participants, setParticipants] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derive project members for the select list
  const projectMembers = [];
  if (project?.owner) {
    projectMembers.push(project.owner);
  }
  if (project?.collaborators) {
    project.collaborators.forEach((c) => {
      if (c.user && c.user._id !== project.owner?._id) {
        projectMembers.push(c.user);
      }
    });
  }

  // Set default minimum datetime bounds
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setDate(now.toISOString().split("T")[0]);
      
      const timeString = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      setStartTime(timeString);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !date || !startTime) {
      toast.error("Please fill in required fields.");
      return;
    }

    // Combine date and time
    const startDateTime = new Date(`${date}T${startTime}:00`);
    if (startDateTime < new Date()) {
      toast.error("Meeting time cannot be in the past.");
      return;
    }

    try {
      setIsSubmitting(true);
      await createMeeting({
        title,
        description,
        projectId,
        participants,
        startTime: startDateTime.toISOString(),
        duration,
      });

      toast.success("Meeting scheduled successfully!");
      setTitle("");
      setDescription("");
      setParticipants([]);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to schedule meeting.");
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

  return (
    <div className="modal-overlay">
      <div className="modal-content meeting-modal">
        <div className="modal-header">
          <h2>Schedule a Meeting</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="meeting-form">
          <div className="form-group">
            <label>Meeting Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Code Review, Pair Programming"
              required
            />
          </div>

          <div className="form-group">
            <label>Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will this meeting be about?"
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Date *</label>
              <input
                type="date"
                value={date}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Start Time *</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
            >
              <option value={15}>15 Minutes</option>
              <option value={30}>30 Minutes</option>
              <option value={60}>1 Hour</option>
              <option value={120}>2 Hours</option>
            </select>
          </div>

          <div className="form-group">
            <label>Invite Collaborators</label>
            <div className="participants-list">
              {projectMembers.length > 0 ? (
                projectMembers.map((member) => (
                  <label key={member._id} className="participant-item">
                    <input
                      type="checkbox"
                      checked={participants.includes(member._id)}
                      onChange={() => handleToggleParticipant(member._id)}
                    />
                    <span>{member.username}</span>
                  </label>
                ))
              ) : (
                <div className="no-members">No project members available to select.</div>
              )}
            </div>
          </div>

          <div className="modal-actions">
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Scheduling..." : "Schedule Meeting"}
            </Button>
          </div>
        </form>
        
        <style>{`
          .meeting-modal { max-width: 500px; width: 100%; border-radius: 12px; background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border-color); }
          .meeting-form { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
          .form-group { display: flex; flex-direction: column; gap: 6px; }
          .form-group label { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
          .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .form-group input, .form-group textarea, .form-group select { background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); padding: 10px; border-radius: 8px; font-family: inherit; }
          .form-group input:focus, .form-group textarea:focus, .form-group select:focus { border-color: var(--accent-primary); outline: none; }
          .participants-list { max-height: 120px; overflow-y: auto; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
          .participant-item { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 14px; }
          .participant-item input { accent-color: var(--accent-primary); }
          .no-members { font-size: 13px; color: var(--text-muted); font-style: italic; }
          .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 10px; }
        `}</style>
      </div>
    </div>
  );
};

export default MeetingModal;
