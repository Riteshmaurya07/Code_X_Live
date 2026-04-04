import { useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { 
  createFile as createFileAPI, 
  deleteFile as deleteFileAPI, 
  updateFile as updateFileAPI,
  autosaveFile 
} from '../../services/projectService';

const AUTOSAVE_DELAY = 5000;

/**
 * Hook to manage file state, CRUD operations, and autosave logic
 */
export const useFileTree = (projectId, selectedLanguage) => {
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  
  const codeRef = useRef(null);
  const autosaveTimer = useRef(null);
  const hasUnsavedChanges = useRef(false);
  const fileCodeCache = useRef({});

  const isDbFile = useCallback((fileId) => {
    if (!fileId) return false;
    return !String(fileId).startsWith("local-");
  }, []);

  const triggerAutosave = useCallback(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);

    autosaveTimer.current = setTimeout(async () => {
      if (!hasUnsavedChanges.current || !activeFileId) return;

      if (!isDbFile(activeFileId)) {
        hasUnsavedChanges.current = false;
        setSaveStatus("");
        return;
      }

      try {
        setSaveStatus("Saving...");
        await autosaveFile(activeFileId, codeRef.current || "");
        setSaveStatus("Saved ✓");
        hasUnsavedChanges.current = false;
        setTimeout(() => setSaveStatus(""), 2000);
      } catch {
        setSaveStatus("Save failed");
        setTimeout(() => setSaveStatus(""), 3000);
      }
    }, AUTOSAVE_DELAY);
  }, [activeFileId, isDbFile]);

  const handleCodeChange = useCallback((code) => {
    codeRef.current = code;
    
    // Save to the per-file cache so switching files doesn't wipe local edits
    if (activeFileId) {
      if (!fileCodeCache.current[activeFileId]) {
        fileCodeCache.current[activeFileId] = {};
      }
      fileCodeCache.current[activeFileId].code = code;
    }

    if (isDbFile(activeFileId)) {
      hasUnsavedChanges.current = true;
      setSaveStatus("Unsaved");
      triggerAutosave();
    }
  }, [activeFileId, isDbFile, triggerAutosave]);

  const createFile = async (name) => {
    if (isCreatingFile) return;
    setIsCreatingFile(true);

    try {
      if (projectId && (isDbFile(projectId) || projectId.length === 24)) {
        const newFile = await createFileAPI(projectId, name, selectedLanguage);
        setActiveFileId(newFile._id);
        return newFile;
      } else {
        const newFile = {
          _id: `local-${Date.now()}`,
          name,
          content: "",
        };
        setFiles((prev) => [...prev, newFile]);
        setActiveFileId(newFile._id);
        toast.success(`Created ${name}`);
        return newFile;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create file");
    } finally {
      setIsCreatingFile(false);
    }
  };

  const deleteFile = async (fileId) => {
    if (files.length <= 1) {
      toast.error("Cannot delete the last file");
      return;
    }

    if (isDbFile(fileId)) {
      try {
        await deleteFileAPI(fileId);
      } catch {
        toast.error("Failed to delete file from server");
        return;
      }
    }

    setFiles((prev) => prev.filter((f) => f._id !== fileId));
    if (activeFileId === fileId) {
      setActiveFileId(files.find((f) => f._id !== fileId)?._id);
    }
    toast.success("File deleted");
  };

  const renameFile = async (fileId, newName) => {
    if (isDbFile(fileId)) {
      try {
        await updateFileAPI(fileId, { name: newName });
      } catch {
        toast.error("Failed to rename");
        return;
      }
    }
    setFiles((prev) =>
      prev.map((f) => (f._id === fileId ? { ...f, name: newName } : f))
    );
    toast.success("File renamed");
  };

  const saveFileExplicitly = async () => {
    if (!activeFileId || !isDbFile(activeFileId)) {
      toast.error("Save is only available for project files");
      return;
    }
    try {
      setSaveStatus("Saving...");
      await updateFileAPI(activeFileId, { content: codeRef.current || "" });
      setSaveStatus("Saved ✓");
      hasUnsavedChanges.current = false;
      toast.success("File saved with version snapshot");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch {
      toast.error("Failed to save");
      setSaveStatus("");
    }
  };

  return {
    files,
    setFiles,
    activeFileId,
    setActiveFileId,
    isCreatingFile,
    saveStatus,
    setSaveStatus,
    codeRef,
    fileCodeCache,
    isDbFile,
    handleCodeChange,
    createFile,
    deleteFile,
    renameFile,
    saveFileExplicitly
  };
};
