import React from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';

const NewProjectForm = ({
  showNewProject, setShowNewProject,
  newProjectName, setNewProjectName,
  newProjectLang, setNewProjectLang,
  onHandleCreateProject, languages,
  showGitHubImport, setShowGitHubImport,
  githubUrl, setGithubUrl,
  onHandleGitHubImport, importing
}) => {
  return (
    <>
      <div className="dashboard-header">
        <h1>Your Projects</h1>
        <div className="header-actions">
          <Button
            variant="outline"
            onClick={() => { setShowGitHubImport(!showGitHubImport); setShowNewProject(false); }}
          >
            📦 Import GitHub
          </Button>
          <Button
            onClick={() => { setShowNewProject(!showNewProject); setShowGitHubImport(false); }}
          >
            + New Project
          </Button>
        </div>
      </div>

      {showNewProject && (
        <form className="new-project-form" onSubmit={onHandleCreateProject}>
          <Input
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Project name"
            autoFocus
          />
          <select
            value={newProjectLang}
            onChange={(e) => setNewProjectLang(e.target.value)}
            className="lang-select"
          >
            {languages.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
          <div className="form-actions">
            <Button type="submit">Create</Button>
            <Button variant="outline" onClick={() => setShowNewProject(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {showGitHubImport && (
        <form className="new-project-form" onSubmit={onHandleGitHubImport}>
          <Input
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            autoFocus
          />
          <div className="form-actions">
            <Button type="submit" disabled={importing}>
              {importing ? "Importing..." : "Import"}
            </Button>
            <Button variant="outline" onClick={() => setShowGitHubImport(false)}>Cancel</Button>
          </div>
        </form>
      )}
    </>
  );
};

export default NewProjectForm;
