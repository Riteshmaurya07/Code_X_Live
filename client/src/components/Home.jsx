import React, { useState } from "react";
import { v4 as uuid } from "uuid";
import toast from "react-hot-toast";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function Home() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  const generateRoomId = (e) => {
    e.preventDefault();
    const Id = uuid();
    setRoomId(Id);
    toast.success("Room Id is generated");
  };

  const joinRoom = () => {
    if (!roomId || !username) {
      toast.error("Both fields are required");
      return;
    }
    navigate(`/editor/${roomId}`, {
      state: { username },
    });
    toast.success("Room is created");
  };

  const handleInputEnter = (e) => {
    if (e.code === "Enter") {
      joinRoom();
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <img
              src="/images/codeXlive.png"
              alt="CodeXLive"
              className="auth-logo"
            />
            <h2>Join a Room</h2>
            <p>Collaborate in real-time with your team</p>
          </div>

          <div className="auth-form">
            <div className="form-group">
              <label htmlFor="roomId">Room ID</label>
              <input
                id="roomId"
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Paste or generate a Room ID"
                onKeyUp={handleInputEnter}
              />
            </div>

            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username || user?.username || ""}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your display name"
                onKeyUp={handleInputEnter}
              />
            </div>

            <button
              onClick={joinRoom}
              className="auth-btn"
            >
              Join Room
            </button>
          </div>

          <div className="auth-footer">
            <p>
              Don't have a room ID?{" "}
              <a
                href="#"
                onClick={generateRoomId}
                style={{ cursor: "pointer" }}
              >
                Generate New Room
              </a>
            </p>
            {user ? (
              <p>
                <Link to="/dashboard">← Back to Dashboard</Link>
              </p>
            ) : (
              <p>
                <Link to="/login">Sign in</Link> to save your projects
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
