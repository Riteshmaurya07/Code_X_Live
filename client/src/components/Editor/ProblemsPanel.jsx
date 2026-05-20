import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Search, Terminal, AlertTriangle, Info, X, ChevronDown, ChevronRight } from "lucide-react";

/**
 * ProblemsPanel — VS Code–style diagnostics panel.
 * Shows errors, warnings, and info markers from Monaco.
 */
function ProblemsPanel({ markers = [], onNavigate, onClose }) {
  const [filter, setFilter] = useState("");
  const [collapsed, setCollapsed] = useState({});

  const errorCount = markers.filter(m => m.severity === 8).length;
  const warnCount = markers.filter(m => m.severity === 4).length;
  const infoCount = markers.filter(m => m.severity === 2).length;

  const filtered = useMemo(() => {
    if (!filter) return markers;
    const lf = filter.toLowerCase();
    return markers.filter(m =>
      m.message?.toLowerCase().includes(lf) ||
      m.source?.toLowerCase().includes(lf)
    );
  }, [markers, filter]);

  // Group by source
  const grouped = useMemo(() => {
    const groups = {};
    for (const m of filtered) {
      const src = m.source || "Editor";
      if (!groups[src]) groups[src] = [];
      groups[src].push(m);
    }
    return groups;
  }, [filtered]);

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 8: return <span className="problem-icon error">●</span>;
      case 4: return <span className="problem-icon warning">●</span>;
      case 2: return <span className="problem-icon info">●</span>;
      default: return <span className="problem-icon hint">●</span>;
    }
  };

  const toggleGroup = (src) => {
    setCollapsed(prev => ({ ...prev, [src]: !prev[src] }));
  };

  return (
    <div className="problems-panel">
      <div className="problems-header">
        <div className="problems-title">
          <Terminal size={14} />
          <span>Problems</span>
          <span className="problems-counts">
            {errorCount > 0 && <span className="count-error">● {errorCount}</span>}
            {warnCount > 0 && <span className="count-warning">▲ {warnCount}</span>}
            {infoCount > 0 && <span className="count-info">ℹ {infoCount}</span>}
            {errorCount === 0 && warnCount === 0 && infoCount === 0 && (
              <span className="count-ok">✓ No problems</span>
            )}
          </span>
        </div>
        <div className="problems-actions">
          <div className="problems-filter">
            <Search size={12} />
            <input
              type="text"
              placeholder="Filter..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
          <button className="problems-close" onClick={onClose} title="Close">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="problems-body">
        {Object.keys(grouped).length === 0 && (
          <div className="problems-empty">
            <Info size={16} />
            <span>No problems detected in this file.</span>
          </div>
        )}
        {Object.entries(grouped).map(([src, items]) => (
          <div key={src} className="problems-group">
            <div className="problems-group-header" onClick={() => toggleGroup(src)}>
              {collapsed[src] ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              <span className="problems-group-name">{src}</span>
              <span className="problems-group-count">{items.length}</span>
            </div>
            {!collapsed[src] && items.map((m, i) => (
              <div
                key={i}
                className="problem-item"
                onClick={() => onNavigate?.(m.startLineNumber, m.startColumn)}
              >
                {getSeverityIcon(m.severity)}
                <span className="problem-message">{m.message}</span>
                <span className="problem-location">
                  [{m.startLineNumber}:{m.startColumn}]
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProblemsPanel;
