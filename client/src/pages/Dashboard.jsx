import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import ShareModal from "../components/ShareModal";
import {
  getProjects,
  createProject,
  deleteProject,
  importGitHubRepo,
} from "../services/projectService";
import { getMyInvitations, acceptInvitation, declineInvitation } from "../services/sharingService";
import toast from "react-hot-toast";
import Navbar from "../components/layout/Navbar";
import ProjectCard from "../components/Dashboard/ProjectCard";
import NewProjectForm from "../components/Dashboard/NewProjectForm";

const LANGUAGES = [
  "javascript",
  "python3",
  "java",
  "cpp",
  "c",
  "ruby",
  "go",
  "rust",
  "csharp",
  "php",
  "swift",
  "scala",
  "bash",
  "r",
];

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectLang, setNewProjectLang] = useState("javascript");

  // GitHub import
  const [showGitHubImport, setShowGitHubImport] = useState(false);
  const [githubUrl, setGithubUrl] = useState("");
  const [importing, setImporting] = useState(false);

  // Share modal
  const [shareProjectId, setShareProjectId] = useState(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const [projData, invData] = await Promise.all([
        getProjects(),
        getMyInvitations()
      ]);
      setProjects(projData);
      if (invData && invData.invitations) {
        setInvitations(invData.invitations);
      }
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async (invitationId) => {
    try {
      const res = await acceptInvitation(invitationId);
      toast.success(res.message);
      setInvitations(invitations.filter((inv) => inv._id !== invitationId));
      loadProjects(); // Reload projects to show the new one
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to accept");
    }
  };

  const handleDeclineInvite = async (invitationId) => {
    try {
      await declineInvitation(invitationId);
      toast.success("Invitation declined");
      setInvitations(invitations.filter((inv) => inv._id !== invitationId));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to decline");
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      toast.error("Project name is required");
      return;
    }
    try {
      const project = await createProject(newProjectName, newProjectLang);
      toast.success("Project created!");
      setProjects([project, ...projects]);
      setShowNewProject(false);
      setNewProjectName("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create project");
    }
  };

  const handleDeleteProject = async (id) => {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    try {
      await deleteProject(id);
      setProjects(projects.filter((p) => p._id !== id));
      toast.success("Project deleted");
    } catch {
      toast.error("Failed to delete project");
    }
  };

  const handleGitHubImport = async (e) => {
    e.preventDefault();
    if (!githubUrl.trim()) {
      toast.error("GitHub URL is required");
      return;
    }
    setImporting(true);
    try {
      const data = await importGitHubRepo(githubUrl.trim());
      toast.success(`Imported ${data.filesImported} files!`);
      setGithubUrl("");
      setShowGitHubImport(false);
      loadProjects();
    } catch (err) {
      toast.error(err.response?.data?.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
    toast.success("Logged out");
  };

  return (
    <div className="dashboard-page">
      <Navbar variant="dashboard" />

      <div className="dashboard-content">
        <NewProjectForm
          showNewProject={showNewProject}
          setShowNewProject={setShowNewProject}
          newProjectName={newProjectName}
          setNewProjectName={setNewProjectName}
          newProjectLang={newProjectLang}
          setNewProjectLang={setNewProjectLang}
          onHandleCreateProject={handleCreateProject}
          languages={LANGUAGES}
          showGitHubImport={showGitHubImport}
          setShowGitHubImport={setShowGitHubImport}
          githubUrl={githubUrl}
          setGithubUrl={setGithubUrl}
          onHandleGitHubImport={handleGitHubImport}
          importing={importing}
        />

        {/* Quick join room */}
        <div className="quick-join-section">
          <Link to="/" className="btn-outline">
            Join a Room (Guest Mode)
          </Link>
        </div>

        {/* Pending Invitations Section */}
        {!loading && invitations.length > 0 && (
          <div className="invitations-section" style={{ marginBottom: "2rem" }}>
            <h2 style={{ marginBottom: "1rem", fontSize: "1.25rem", color: "var(--text-primary)" }}>Pending Invitations</h2>
            <div className="invitations-list" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {invitations.map((inv) => (
                <div key={inv._id} className="invitation-card" style={{ padding: "1rem", background: "var(--bg-secondary)", borderRadius: "var(--radius-lg)", border: "var(--ghost-border)", boxShadow: "var(--depth-1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem" }}>{inv.project.name}</h3>
                    <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.875rem" }}>
                      Invited by <strong>{inv.invitedBy.username}</strong>
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="btn btn-primary btn-sm" onClick={() => handleAcceptInvite(inv._id)}>Accept</button>
                    <button className="btn btn-outline btn-sm" onClick={() => handleDeclineInvite(inv._id)}>Decline</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projects grid */}
        {loading ? (
          <div className="loading-state">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <h3>No projects yet</h3>
            <p>Create your first project or import from GitHub!</p>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map((project) => (
              <ProjectCard
                key={project._id}
                project={project}
                onOpen={(p) => navigate(`/editor/${p.roomId || p._id}`, {
                  state: { username: user.username, projectId: p._id },
                })}
                onShare={setShareProjectId}
                onDelete={handleDeleteProject}
              />
            ))}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {shareProjectId && (
        <ShareModal
          projectId={shareProjectId}
          onClose={() => setShareProjectId(null)}
        />
      )}
    </div>
  );
}

export default Dashboard;
