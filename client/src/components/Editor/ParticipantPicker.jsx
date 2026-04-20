import React, { useMemo, useState } from "react";

const ParticipantPicker = ({ members = [], selectedIds = [], onToggle }) => {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((member) => {
      const name = (member.fullName || member.username || "").toLowerCase();
      const username = (member.username || "").toLowerCase();
      return name.includes(q) || username.includes(q);
    });
  }, [members, query]);

  const selectedMembers = useMemo(
    () => members.filter((m) => selectedIds.includes(m._id)),
    [members, selectedIds]
  );

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search collaborators..."
        className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
      />

      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedMembers.map((member) => (
            <button
              key={member._id}
              type="button"
              onClick={() => onToggle(member._id)}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-2.5 py-1 text-xs text-[var(--text-primary)]"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-semibold text-white">
                {(member.username || "?").charAt(0).toUpperCase()}
              </span>
              <span>@{member.username}</span>
              <span className="text-[var(--text-muted)]">×</span>
            </button>
          ))}
        </div>
      )}

      <div className="max-h-44 space-y-1 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-tertiary)] p-2">
        {filtered.length === 0 ? (
          <p className="p-2 text-xs text-[var(--text-muted)]">No collaborators found.</p>
        ) : (
          filtered.map((member) => {
            const isSelected = selectedIds.includes(member._id);
            return (
              <button
                key={member._id}
                type="button"
                onClick={() => onToggle(member._id)}
                className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-left transition ${
                  isSelected ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--bg-hover)]"
                }`}
              >
                <span className="flex items-center gap-2">
                  {member.avatar ? (
                    <img
                      src={member.avatar}
                      alt={member.username}
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-semibold text-white">
                      {(member.username || "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="text-sm text-[var(--text-primary)]">
                    {member.fullName || member.username}
                    <span className="ml-1 text-xs text-[var(--text-muted)]">@{member.username}</span>
                  </span>
                </span>
                {isSelected && <span className="text-xs text-[var(--accent)]">Selected</span>}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ParticipantPicker;
