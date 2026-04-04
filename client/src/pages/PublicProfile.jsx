import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getUserProfile } from "../services/userService";
import Navbar from "../components/layout/Navbar";
import ProjectCard from "../components/Dashboard/ProjectCard";
import toast from "react-hot-toast";

function PublicProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getUserProfile(username);
        setProfileData(data);
      } catch (err) {
        toast.error(err.response?.data?.error || "Failed to load profile");
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [username, navigate]);

  return (
    <div className="dashboard-page profile-page">
      <Navbar variant="dashboard" />
      
      <div className="dashboard-content">
        {loading ? (
          <div className="loading-state">Loading profile...</div>
        ) : profileData ? (
          <>
            <div className="profile-header" style={{ marginBottom: "2rem", padding: "1rem", background: "var(--bg-secondary)", borderRadius: "var(--radius-lg)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ width: "80px", height: "80px", background: "var(--primary)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", color: "#fff", fontWeight: "bold" }}>
                  {profileData.profile.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 style={{ margin: 0, fontSize: "2rem", color: "var(--text)" }}>@{profileData.profile.username}</h1>
                  <p style={{ margin: 0, color: "var(--text-muted)" }}>Member since {new Date(profileData.profile.createdAt).getFullYear()}</p>
                </div>
              </div>
            </div>

            <h2 style={{ marginBottom: "1rem" }}>Public Projects</h2>

            {profileData.publicProjects.length === 0 ? (
              <div className="empty-state">
                <h3>No public projects</h3>
                <p>@{profileData.profile.username} hasn't published any public projects yet.</p>
              </div>
            ) : (
              <div className="projects-grid">
                {profileData.publicProjects.map((project) => (
                  <ProjectCard
                    key={project._id}
                    project={project}
                    onOpen={(p) => navigate(`/editor/${p.roomId || p._id}`, {
                      state: { username: profileData.profile.username, projectId: p._id },
                    })}
                    // Hide delete and share options for visitors
                    onShare={() => toast.error("You cannot share someone else's public project")}
                    onDelete={() => toast.error("You cannot delete someone else's public project")}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <h3>Profile not found</h3>
          </div>
        )}
      </div>
    </div>
  );
}

export default PublicProfile;
