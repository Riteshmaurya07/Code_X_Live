import React from "react";
import Avatar from "react-avatar";

function Client({ username }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      padding: "6px 4px",
      borderRadius: "6px",
      gap: "8px",
    }}>
      <Avatar
        name={username}
        size={28}
        round="6px"
        textSizeRatio={2.5}
      />
      <span style={{
        fontSize: "0.82rem",
        color: "var(--text-secondary)",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {username}
      </span>
    </div>
  );
}

export default Client;
