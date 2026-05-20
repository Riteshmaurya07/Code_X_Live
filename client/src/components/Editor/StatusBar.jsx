import React, { useMemo } from "react";
import { Terminal, Users, Wifi, AlertTriangle, XCircle, Info, CheckCircle } from "lucide-react";

function StatusBar({
  language, cursor, clientsCount, status = "connected",
  markers = [], onToggleProblems, showProblemsPanel
}) {
  const { errors, warnings, infos } = useMemo(() => {
    let errors = 0, warnings = 0, infos = 0;
    for (const m of markers) {
      if (m.severity === 8) errors++;
      else if (m.severity === 4) warnings++;
      else if (m.severity === 2) infos++;
    }
    return { errors, warnings, infos };
  }, [markers]);

  return (
    <div className="editor-status-bar">
      <div className="status-left">
        <div className="status-item">
          <Terminal size={14} />
          <span>{language || "Plain Text"}</span>
        </div>
        <div className="status-item">
          <span>Ln {cursor.line + 1}, Col {cursor.ch + 1}</span>
        </div>
        <div className="status-item">
          <span>UTF-8</span>
        </div>
        <div className="status-item">
          <span>Spaces: 2</span>
        </div>

        {/* Problems toggle */}
        <button
          className={`status-item status-problems-btn ${showProblemsPanel ? "active" : ""}`}
          onClick={onToggleProblems}
          title="Toggle Problems Panel"
        >
          {errors > 0 ? (
            <><XCircle size={12} className="text-error" /> <span className="text-error">{errors}</span></>
          ) : null}
          {warnings > 0 ? (
            <><AlertTriangle size={12} className="text-warning" /> <span className="text-warning">{warnings}</span></>
          ) : null}
          {infos > 0 ? (
            <><Info size={12} className="text-info" /> <span className="text-info">{infos}</span></>
          ) : null}
          {errors === 0 && warnings === 0 && infos === 0 ? (
            <><CheckCircle size={12} className="text-success" /> <span className="text-success">0</span></>
          ) : null}
        </button>
      </div>

      <div className="status-right">
        <div className="status-item">
          <Users size={14} />
          <span>{clientsCount} Peers</span>
        </div>
        <div className="status-item">
          <Wifi size={14} className={status === "connected" ? "text-success" : "text-error"} />
          <span>{status === "connected" ? "Live" : "Disconnected"}</span>
        </div>
      </div>
    </div>
  );
}

export default StatusBar;
