import React from "react";
import { Terminal, Cpu, Users, Wifi } from "lucide-react";

function StatusBar({ language, cursor, clientsCount, status = "connected" }) {
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
