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
import toast from "react-hot-toast";

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
      const data = await getProjects();
      setProjects(data);
    } catch {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
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
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <img src="/images/codeXlive.png" alt="Logo" className="nav-logo" />
        </div>
        <div className="nav-actions">
          <span className="nav-user">Hi, {user?.username}</span>
          <button className="btn-outline" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Your Projects</h1>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="btn-outline"
              onClick={() => { setShowGitHubImport(!showGitHubImport); setShowNewProject(false); }}
            >
              📦 Import GitHub
            </button>
            <button
              className="btn-primary"
              onClick={() => { setShowNewProject(!showNewProject); setShowGitHubImport(false); }}
            >
              + New Project
            </button>
          </div>
        </div>

        {/* New project form */}
        {showNewProject && (
          <form className="new-project-form" onSubmit={handleCreateProject}>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project name"
              autoFocus
            />
            <select
              value={newProjectLang}
              onChange={(e) => setNewProjectLang(e.target.value)}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            <button type="submit" className="btn-primary">
              Create
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setShowNewProject(false)}
            >
              Cancel
            </button>
          </form>
        )}

        {/* GitHub import form */}
        {showGitHubImport && (
          <form className="new-project-form" onSubmit={handleGitHubImport}>
            <input
              type="text"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              autoFocus
              style={{ flex: 2 }}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={importing}
            >
              {importing ? "Importing..." : "Import"}
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setShowGitHubImport(false)}
            >
              Cancel
            </button>
          </form>
        )}

        {/* Quick join room */}
        <div className="quick-join-section">
          <Link to="/" className="btn-outline">
            Join a Room (Guest Mode)
          </Link>
        </div>

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
              <div key={project._id} className="project-card">
                <div className="project-card-header">
                  <h3>{project.name}</h3>
                  <span className="lang-badge">{project.language}</span>
                </div>
                <div className="project-card-meta">
                  <span>
                    Updated{" "}
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </span>
                  {project.collaborators?.length > 0 && (
                    <span> · {project.collaborators.length} collaborator(s)</span>
                  )}
                </div>
                <div className="project-card-actions">
                  <button
                    className="btn-primary btn-sm"
                    onClick={() =>
                      navigate(`/editor/${project.roomId || project._id}`, {
                        state: { username: user.username, projectId: project._id },
                      })
                    }
                  >
                    Open
                  </button>
                  <button
                    className="btn-outline btn-sm"
                    onClick={() => setShareProjectId(project._id)}
                  >
                    Share
                  </button>
                  <button
                    className="btn-danger btn-sm"
                    onClick={() => handleDeleteProject(project._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
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
