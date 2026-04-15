import React from "react";

const MeetingPanel = ({ meetings, onClose, onSchedule }) => {
  const getStatusBadge = (status) => {
    switch (status) {
      case "scheduled":
        return <span className="badge badge-info">Scheduled</span>;
      case "ongoing":
        return <span className="badge badge-success">Ongoing</span>;
      case "completed":
        return <span className="badge badge-secondary">Completed</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
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
    <div className="panel meeting-panel">
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
        <button className="schedule-btn-full" onClick={onSchedule}>
          🗓️ Schedule New Meeting
        </button>

        <div className="meetings-list">
          {meetings.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📅</span>
              <p>No upcoming meetings</p>
              <span>Schedule one to collaborate with your team</span>
            </div>
          ) : (
            meetings.map((meeting) => (
              <div key={meeting._id} className="meeting-card">
                <div className="meeting-card-header">
                  <h4>{meeting.title}</h4>
                  {getStatusBadge(meeting.status)}
                </div>
                
                {meeting.description && (
                  <p className="meeting-desc">{meeting.description}</p>
                )}

                <div className="meeting-meta">
                  <div className="meta-item">
                    <span className="meta-icon">⏰</span>
                    <span>{new Date(meeting.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} ({meeting.duration}m)</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-icon">👥</span>
                    <span>{meeting.participants.length} participant{meeting.participants.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                <div className="meeting-actions">
                  <button 
                    className={`btn-join ${isMeetingActive(meeting.startTime, meeting.endTime, meeting.status) ? "active" : "disabled"}`}
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
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        .meeting-panel { display: flex; flex-direction: column; height: 100%; border-left: 1px solid var(--border-color); background: var(--bg-sidebar); width: 320px; flex-shrink: 0; }
        .schedule-btn-full { width: 100%; padding: 12px; background: linear-gradient(135deg, var(--accent-primary), #818cf8); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: transform 0.2s, background 0.2s; margin-bottom: 20px; }
        .schedule-btn-full:hover { transform: translateY(-1px); filter: brightness(1.1); }
        .meetings-list { display: flex; flex-direction: column; gap: 16px; overflow-y: auto; padding-right: 4px; }
        .meeting-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 12px; transition: border-color 0.2s; }
        .meeting-card:hover { border-color: var(--accent-primary); }
        .meeting-card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
        .meeting-card-header h4 { font-size: 15px; margin: 0; color: var(--text-primary); font-weight: 600; line-height: 1.3; }
        .badge { padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .badge-info { background: rgba(99, 102, 241, 0.1); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.2); }
        .badge-success { background: rgba(16, 185, 129, 0.1); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.2); }
        .badge-secondary { background: rgba(148, 163, 184, 0.1); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.2); }
        .meeting-desc { font-size: 13px; color: var(--text-secondary); margin: 0; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .meeting-meta { display: flex; flex-direction: column; gap: 6px; }
        .meta-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }
        .meta-icon { font-size: 14px; }
        .meeting-actions { margin-top: 4px; }
        .btn-join { display: block; text-align: center; width: 100%; padding: 10px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 13px; transition: all 0.2s; cursor: pointer; border: none; font-family: inherit; }
        .btn-join.active { background: rgba(16, 185, 129, 0.1); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
        .btn-join.active:hover { background: rgba(16, 185, 129, 0.2); border-color: rgba(16, 185, 129, 0.5); }
        .btn-join.disabled { background: var(--bg-hover); color: var(--text-muted); cursor: not-allowed; opacity: 0.7; pointer-events: none; }
      `}</style>
    </div>
  );
};

export default MeetingPanel;
