import React from 'react';
import { GitBranch, Plus } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Your Projects</h1>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => { setShowGitHubImport(!showGitHubImport); setShowNewProject(false); }}
          >
            <GitBranch size={18} className="mr-2" /> Import GitHub
          </Button>
          <Button
            onClick={() => { setShowNewProject(!showNewProject); setShowGitHubImport(false); }}
          >
            <Plus size={18} className="mr-1" /> New Project
          </Button>
        </div>
      </div>

      {showNewProject && (
        <form className="mb-8 p-6 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-lg animate-in slide-in-from-top-4 duration-200" onSubmit={onHandleCreateProject}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <Input
              label="Project Name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="e.g. My Awesome App"
              autoFocus
              required
            />
            <Select
              label="Language"
              value={newProjectLang}
              onChange={(e) => setNewProjectLang(e.target.value)}
              options={languages.map(lang => ({ value: lang, label: lang }))}
            />
            <div className="flex gap-3 h-[38px]">
              <Button type="submit" className="flex-1">Create</Button>
              <Button variant="outline" onClick={() => setShowNewProject(false)}>Cancel</Button>
            </div>
          </div>
        </form>
      )}

      {showGitHubImport && (
        <form className="mb-8 p-6 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-lg animate-in slide-in-from-top-4 duration-200" onSubmit={onHandleGitHubImport}>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <Input
              label="GitHub Repository URL"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              autoFocus
              required
            />
            <div className="flex gap-3 h-[38px] w-full md:w-auto">
              <Button type="submit" disabled={importing} className="flex-1 md:flex-none md:min-w-[120px]">
                {importing ? "Importing..." : "Import"}
              </Button>
              <Button variant="outline" onClick={() => setShowGitHubImport(false)}>Cancel</Button>
            </div>
          </div>
        </form>
      )}
    </>
  );
};

export default NewProjectForm;
