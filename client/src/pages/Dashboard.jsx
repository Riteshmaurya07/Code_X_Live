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
