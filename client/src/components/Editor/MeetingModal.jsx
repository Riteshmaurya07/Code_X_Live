import React, { useMemo, useState, useEffect } from "react";
import { CircleCheck } from "lucide-react";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Textarea from "../ui/Textarea";
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
    if (project?.owner?._id) dedup.set(project.owner._id, project.owner);
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
    } else {
      const now = new Date();
      setTitle(""); setDescription(""); setParticipants([]); setDuration(30);
      setDate(now.toISOString().split("T")[0]);
      setStartTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
    }
  }, [isOpen, isEditMode, initialMeeting]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !date || !startTime) return toast.error("Please fill in required fields.");
    
    const startDateTime = new Date(`${date}T${startTime}:00`);
    if (!isEditMode && startDateTime < new Date()) return toast.error("Meeting time cannot be in the past.");

    try {
      setIsSubmitting(true);
      const payload = { title, description, participants, startTime: startDateTime.toISOString(), duration };
      if (isEditMode) {
        await updateMeeting(initialMeeting._id, payload);
        toast.success("Meeting updated");
        onClose();
      } else {
        const response = await createMeeting({ ...payload, projectId });
        setSuccessMeeting(response);
        toast.success("Meeting scheduled!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyMeetingLink = (link) => {
    navigator.clipboard.writeText(link).then(() => toast.success("Link copied!")).catch(() => toast.error("Failed to copy"));
  };

  return (
    <>
      <Modal 
        isOpen={isOpen && !successMeeting} 
        onClose={onClose} 
        title={isEditMode ? "Edit Meeting" : "Schedule Meeting"}
        maxWidth="max-w-xl"
        footer={
          <>
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : (isEditMode ? "Save Changes" : "Schedule")}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Meeting Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Code Review" required />
          <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details..." />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            <Input label="Start Time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          </div>
          <Select 
            label="Duration" 
            value={duration} 
            onChange={(e) => setDuration(parseInt(e.target.value))} 
            options={[
              { value: 15, label: "15 Minutes" }, { value: 30, label: "30 Minutes" },
              { value: 60, label: "1 Hour" }, { value: 120, label: "2 Hours" }
            ]}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text-secondary)] ml-1">Invite Collaborators</label>
            <ParticipantPicker members={projectMembers} selectedIds={participants} onToggle={(id) => setParticipants(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])} />
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(successMeeting)}
        onClose={() => { setSuccessMeeting(null); onClose(); }}
        title="Meeting Created"
        icon={<CircleCheck size={24} className="text-emerald-500" />}
        footer={
          <>
            <Button variant="outline" onClick={() => { setSuccessMeeting(null); onClose(); }}>Close</Button>
            <Button onClick={() => copyMeetingLink(successMeeting?.meetingLink)}>Copy Link</Button>
          </>
        }
      >
        <p className="text-sm text-[var(--text-secondary)] mb-4">Your meeting has been scheduled successfully.</p>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] p-3 mb-4">
          <p className="truncate text-xs font-mono text-[var(--text-muted)]">{successMeeting?.meetingLink}</p>
        </div>
        {successMeeting?.meetingLink && (
          <a href={`mailto:?subject=Meeting: ${successMeeting.title}&body=Join: ${successMeeting.meetingLink}`} className="text-xs text-[var(--accent)] hover:underline">
            Share via Email
          </a>
        )}
      </Modal>
    </>
  );
};

export default MeetingModal;
