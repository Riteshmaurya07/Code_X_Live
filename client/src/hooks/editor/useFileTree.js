import { useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { normalizePath } from '../../utils/fileTree';
import {
  createFile as createFileAPI,
  deleteFile as deleteFileAPI,
  updateFile as updateFileAPI,
  autosaveFile,
} from '../../services/projectService';

const AUTOSAVE_DELAY = 5000;

/**
 * Hook to manage file state, CRUD operations, autosave, and virtual folder tracking.
 */
export const useFileTree = (projectId, selectedLanguage) => {
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  // Virtual folder paths — folders are frontend-only; no DB document is created.
  // A path in this Set persists the folder node even when it has no file children.
  const [knownFolders, setKnownFolders] = useState(new Set(['/']));

  const codeRef = useRef(null);
  const autosaveTimer = useRef(null);
  const hasUnsavedChanges = useRef(false);
  const fileCodeCache = useRef({});

  const isDbFile = useCallback((fileId) => {
    if (!fileId) return false;
    return !String(fileId).startsWith('local-');
  }, []);

  const triggerAutosave = useCallback(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      if (!hasUnsavedChanges.current || !activeFileId) return;
      if (!isDbFile(activeFileId)) {
        hasUnsavedChanges.current = false;
        setSaveStatus('');
        return;
      }
      try {
        setSaveStatus('Saving...');
        await autosaveFile(activeFileId, codeRef.current || '');
        setSaveStatus('Saved ✓');
        hasUnsavedChanges.current = false;
        setTimeout(() => setSaveStatus(''), 2000);
      } catch {
        setSaveStatus('Save failed');
        setTimeout(() => setSaveStatus(''), 3000);
      }
    }, AUTOSAVE_DELAY);
  }, [activeFileId, isDbFile]);

  const handleCodeChange = useCallback((code) => {
    codeRef.current = code;
    if (activeFileId) {
      if (!fileCodeCache.current[activeFileId]) {
        fileCodeCache.current[activeFileId] = {};
      }
      fileCodeCache.current[activeFileId].code = code;
    }
    if (isDbFile(activeFileId)) {
      hasUnsavedChanges.current = true;
      setSaveStatus('Unsaved');
      triggerAutosave();
    }
  }, [activeFileId, isDbFile, triggerAutosave]);

  /**
   * Create a file inside `parentPath` (default "/").
   * Passes the path to the API so the File document is stored with the correct path.
   */
  const createFile = async (name, parentPath = '/') => {
    if (isCreatingFile) return;
    setIsCreatingFile(true);
    const normalizedPath = normalizePath(parentPath);
    try {
      if (projectId && (isDbFile(projectId) || projectId.length === 24)) {
        const newFile = await createFileAPI(projectId, name, selectedLanguage, normalizedPath);
        setActiveFileId(newFile._id);
        return newFile;
      } else {
        const newFile = {
          _id: `local-${Date.now()}`,
          name,
          content: '',
          path: normalizedPath,
        };
        setFiles((prev) => [...prev, newFile]);
        setActiveFileId(newFile._id);
        toast.success(`Created ${name}`);
        return newFile;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create file');
    } finally {
      setIsCreatingFile(false);
    }
  };

  /**
   * Add a virtual folder to the known set.
   * Returns the new folder path so the caller can emit a socket event.
   * No API call — folders have no DB document.
   */
  const createFolder = useCallback((parentPath, folderName) => {
    const normalizedParent = normalizePath(parentPath);
    const folderPath =
      normalizedParent === '/' ? `/${folderName}` : `${normalizedParent}/${folderName}`;
    setKnownFolders((prev) => {
      const next = new Set(prev);
      next.add(folderPath);
      return next;
    });
    return folderPath;
  }, []);

  /**
   * Remove a virtual folder (and all its sub-paths) from knownFolders.
   * The caller emits a FOLDER_DELETED socket event.
   */
  const deleteFolder = useCallback((folderPath) => {
    const normalized = normalizePath(folderPath);
    setKnownFolders((prev) => {
      const next = new Set(prev);
      for (const p of next) {
        if (p === normalized || p.startsWith(normalized + '/')) {
          next.delete(p);
        }
      }
      return next;
    });
  }, []);

  const deleteFile = async (fileId) => {
    if (files.length <= 1) {
      toast.error('Cannot delete the last file');
      return;
    }
    if (isDbFile(fileId)) {
      try {
        await deleteFileAPI(fileId);
      } catch {
        toast.error('Failed to delete file from server');
        return;
      }
    }
    setFiles((prev) => prev.filter((f) => f._id !== fileId));
    if (activeFileId === fileId) {
      setActiveFileId(files.find((f) => f._id !== fileId)?._id);
    }
    toast.success('File deleted');
  };

  const renameFile = async (fileId, newName) => {
    if (isDbFile(fileId)) {
      try {
        await updateFileAPI(fileId, { name: newName });
      } catch {
        toast.error('Failed to rename');
        return;
      }
    }
    setFiles((prev) =>
      prev.map((f) => (f._id === fileId ? { ...f, name: newName } : f))
    );
    toast.success('File renamed');
  };

  const saveFileExplicitly = async () => {
    if (!activeFileId || !isDbFile(activeFileId)) {
      toast.error('Save is only available for project files');
      return;
    }
    try {
      setSaveStatus('Saving...');
      await updateFileAPI(activeFileId, { content: codeRef.current || '' });
      setSaveStatus('Saved ✓');
      hasUnsavedChanges.current = false;
      toast.success('File saved with version snapshot');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch {
      toast.error('Failed to save');
      setSaveStatus('');
    }
  };

  return {
    files, setFiles,
    activeFileId, setActiveFileId,
    isCreatingFile,
    saveStatus, setSaveStatus,
    codeRef, fileCodeCache,
    isDbFile,
    handleCodeChange,
    createFile, deleteFile, renameFile, saveFileExplicitly,
    knownFolders, setKnownFolders,
    createFolder, deleteFolder,
  };
};
