import React from "react";
import { toast } from "react-hot-toast";

const MeetingPanel = ({ meetings, onClose, onSchedule, onViewMeeting, onEditMeeting, currentUsername }) => {
  const getStatusBadge = (status) => {
    switch (status) {
      case "scheduled":
        return <span className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-300">Scheduled</span>;
      case "ongoing":
        return <span className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">Ongoing</span>;
      case "completed":
        return <span className="rounded-xl border border-slate-500/20 bg-slate-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">Completed</span>;
      default:
        return <span className="rounded-xl border border-slate-500/20 bg-slate-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">{status}</span>;
    }
  };

  const copyLink = async (link) => {
    try {
      await navigator.clipboard.writeText(link || "");
      toast.success("Link copied!");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const isMeetingActive = (startTime, endTime, status) => {
    if (status === "completed") return false;
    const now = new Date();
    const start = new Date(startTime);
    // Button active if current time is within 5 minutes before start
    return now.getTime() >= start.getTime() - 5 * 60000;
  };

  return (
    <div className="panel flex h-full w-80 shrink-0 flex-col border-l border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="panel-header">
        <div className="panel-title-container">
          <span className="panel-icon">📅</span>
          <h3>Meetings</h3>
        </div>
        <button className="icon-btn" onClick={onClose} title="Close Panel">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="panel-content">
        <button
          className="mb-5 w-full rounded-lg bg-gradient-to-r from-[var(--accent)] to-[#818cf8] px-3 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:brightness-110"
          onClick={onSchedule}
        >
          🗓️ Schedule New Meeting
        </button>

        <div className="flex flex-col gap-4 overflow-y-auto pr-1">
          {meetings.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📅</span>
              <p>No upcoming meetings</p>
              <span>Schedule one to collaborate with your team</span>
            </div>
          ) : (
            meetings.map((meeting) => (
              <div
                key={meeting._id}
                className="flex flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-tertiary)] p-4 transition-colors hover:border-[var(--accent)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold leading-snug text-[var(--text-primary)]">{meeting.title}</h4>
                  {getStatusBadge(meeting.status)}
                </div>
                
                {meeting.description && (
                  <p className="line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">{meeting.description}</p>
                )}

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                    <span>⏰</span>
                    <span>{new Date(meeting.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} ({meeting.duration}m)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                    <span>👥</span>
                    <span>{meeting.participants.length} participant{meeting.participants.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                <div className="mt-1">
                {meeting.createdBy?.username === currentUsername && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className="rounded-md border border-[var(--border)] px-2.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent)]"
                      onClick={() => onViewMeeting?.(meeting)}
                    >
                      Details
                    </button>
                    <button
                      className="rounded-md border border-[var(--border)] px-2.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent)]"
                      onClick={() => onEditMeeting?.(meeting)}
                    >
                      Edit
                    </button>
                  </div>
                )}
                {meeting.createdBy?.username !== currentUsername && (
                  <button
                    className="w-full rounded-md border border-[var(--border)] px-2.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent)]"
                    onClick={() => onViewMeeting?.(meeting)}
                  >
                    Details
                  </button>
                )}
                  <button 
                    className={`mt-2 block w-full rounded-md border px-2.5 py-2 text-center text-xs font-semibold transition ${
                      isMeetingActive(meeting.startTime, meeting.endTime, meeting.status)
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        : "cursor-not-allowed border-[var(--border)] bg-[var(--bg-hover)] text-[var(--text-muted)] opacity-70"
                    }`}
                    onClick={(e) => {
                      if (!isMeetingActive(meeting.startTime, meeting.endTime, meeting.status)) {
                        e.preventDefault();
                        return;
                      }
                      if (meeting.meetingLink) {
                        window.open(meeting.meetingLink, "_blank");
                      }
                    }}
                  >
                    🚀 Join Meeting
                  </button>
                  <button
                    className="mt-2 block w-full rounded-md border border-[var(--border)] px-2.5 py-2 text-center text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--accent)]"
                    onClick={() => copyLink(meeting.meetingLink)}
                  >
                    Copy Link
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MeetingPanel;
