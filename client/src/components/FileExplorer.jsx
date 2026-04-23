import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { buildFileTree, getAncestorPaths } from '../utils/fileTree';
import { 
  FileText, FileCode, FileJson, FileType, 
  Folder, FolderOpen, FolderPlus, FilePlus, 
  Pencil, Trash2, ChevronDown, ChevronRight 
} from 'lucide-react';

// ── File icon by extension ────────────────────────────────────────
const EXT_ICONS = {
  js: FileCode, jsx: FileCode, ts: FileCode, tsx: FileCode, py: FileCode,
  java: FileCode, cpp: FileCode, c: FileCode, cs: FileCode, html: FileCode,
  css: FileCode, scss: FileCode, json: FileJson, md: FileText, sql: FileCode,
  sh: FileCode, bash: FileCode, rs: FileCode, go: FileCode, rb: FileCode,
  php: FileCode, swift: FileCode, r: FileCode, yml: FileCode, yaml: FileCode,
  txt: FileText, xml: FileCode, toml: FileCode,
};

const getFileIcon = (name) => {
  const ext = name.split('.').pop().toLowerCase();
  const Icon = EXT_ICONS[ext] || FileText;
  return <Icon size={16} />;
};


// ── InlineInput — in-tree text input for create / rename ─────────
function InlineInput({ depth, placeholder, defaultValue = '', icon = <FileText size={16} />, onConfirm, onCancel }) {
  const [value, setValue] = useState(defaultValue);
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.focus();
    if (defaultValue) ref.current?.select();
  }, [defaultValue]);

  const confirm = () => {
    const v = value.trim();
    if (v) onConfirm(v); else onCancel();
  };

  return (
    <div className="ft-inline-row" style={{ paddingLeft: `${depth * 12 + 8}px` }}>
      <span className="ft-icon">{icon}</span>
      <input
        ref={ref}
        className="ft-inline-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') confirm();
          if (e.key === 'Escape') onCancel();
        }}
        onBlur={confirm}
      />
    </div>
  );
}

// ── ContextMenu ───────────────────────────────────────────────────
function ContextMenu({ x, y, items, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    // Small delay so the right-click that opened the menu doesn't immediately close it
    const id = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => { clearTimeout(id); document.removeEventListener('mousedown', handler); };
  }, [onClose]);

  // Clamp to viewport
  const style = { position: 'fixed', top: Math.min(y, window.innerHeight - 160), left: Math.min(x, window.innerWidth - 180), zIndex: 9999 };

  return (
    <div ref={ref} className="ft-context-menu" style={style}>
      {items.map((item, i) =>
        item === 'divider'
          ? <div key={i} className="ft-context-divider" />
          : (
            <button
              key={item.label}
              className={`ft-context-item${item.danger ? ' danger' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); item.onClick(); onClose(); }}
            >
              <span className="ft-context-icon">{item.icon}</span>
              {item.label}
            </button>
          )
      )}
    </div>
  );
}

// ── FileRow ───────────────────────────────────────────────────────
function FileRow({ node, depth, isActive, onSelect, onRename, onDelete, openCtx }) {
  const [renaming, setRenaming] = useState(false);

  const ctxItems = [
    { label: 'Rename', icon: <Pencil size={14} />, onClick: () => setRenaming(true) },
    { label: 'Delete', icon: <Trash2 size={14} />, danger: true, onClick: () => { if (window.confirm(`Delete "${node.name}"?`)) onDelete(node._id); } },
  ];

  if (renaming) {
    return (
      <InlineInput
        depth={depth}
        placeholder="filename"
        defaultValue={node.name}
        icon={getFileIcon(node.name)}
        onConfirm={(n) => { if (n !== node.name) onRename(node._id, n); setRenaming(false); }}
        onCancel={() => setRenaming(false)}
      />
    );
  }

  return (
    <div
      className={`ft-row ft-file${isActive ? ' active' : ''}`}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
      onClick={() => onSelect(node._id)}
      onContextMenu={(e) => { e.preventDefault(); openCtx(e.clientX, e.clientY, ctxItems); }}
      title={`${node.path === '/' ? '' : node.path}/${node.name}`}
    >
      <span className="ft-icon">{getFileIcon(node.name)}</span>
      <span className="ft-label">{node.name}</span>
      <span className="ft-actions">
        <button className="ft-btn" title="Rename" onClick={(e) => { e.stopPropagation(); setRenaming(true); }}><Pencil size={12} /></button>
        <button className="ft-btn danger" title="Delete" onClick={(e) => { e.stopPropagation(); if (window.confirm(`Delete "${node.name}"?`)) onDelete(node._id); }}><Trash2 size={12} /></button>
      </span>
    </div>
  );
}

// ── FolderNode — recursive ────────────────────────────────────────
function FolderNode({ node, depth, activeFileId, expanded, onToggle, onSelect, onCreateFile, onCreateFolder, onRename, onDelete, onDeleteFolder, openCtx }) {
  // null | "file" | "folder"
  const [creating, setCreating] = useState(null);
  const isExpanded = expanded.has(node.path);
  const isRoot = node.path === '/';

  const startCreate = (type) => {
    onToggle(node.path, true); // force-expand so the inline input is visible
    setCreating(type);
  };

  const hasFileChildren = node.children.some(c => c.type === 'file');
  const hasSubFolders = node.children.some(c => c.type === 'folder');

  const folderCtxItems = [
    { label: 'New File', icon: <FilePlus size={14} />, onClick: () => startCreate('file') },
    { label: 'New Folder', icon: <FolderPlus size={14} />, onClick: () => startCreate('folder') },
    'divider',
    {
      label: 'Delete Folder', icon: <Trash2 size={14} />, danger: true,
      onClick: () => {
        if (hasFileChildren || hasSubFolders) { toast.error('Remove all files and subfolders first'); return; }
        if (window.confirm(`Delete folder "${node.name}"?`)) onDeleteFolder(node.path);
      },
    },
  ];

  const childDepth = isRoot ? depth : depth + 1;

  return (
    <>
      {/* Folder header row — hidden for root (root is always "expanded") */}
      {!isRoot && (
        <div
          className="ft-row ft-folder"
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
          onClick={() => onToggle(node.path)}
          onContextMenu={(e) => { e.preventDefault(); openCtx(e.clientX, e.clientY, folderCtxItems); }}
        >
          <span className="ft-chevron">{isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
          <span className="ft-icon">{isExpanded ? <FolderOpen size={16} className="text-accent" /> : <Folder size={16} className="text-accent" />}</span>
          <span className="ft-label">{node.name}</span>
          <span className="ft-actions">
            <button className="ft-btn" title="New File" onClick={(e) => { e.stopPropagation(); startCreate('file'); }}><FilePlus size={14} /></button>
            <button className="ft-btn" title="New Folder" onClick={(e) => { e.stopPropagation(); startCreate('folder'); }}><FolderPlus size={14} /></button>
            <button className="ft-btn danger" title="Delete Folder" onClick={(e) => {
              e.stopPropagation();
              if (hasFileChildren || hasSubFolders) { toast.error('Remove all files and subfolders first'); return; }
              if (window.confirm(`Delete folder "${node.name}"?`)) onDeleteFolder(node.path);
            }}><Trash2 size={14} /></button>
          </span>
        </div>
      )}

      {/* Children — always visible for root, gated by isExpanded for sub-folders */}
      {(isRoot || isExpanded) && (
        <div className={isRoot ? '' : 'ft-children'}>
          {/* Inline create inputs appear at the top of the folder's children */}
          {creating === 'file' && (
            <InlineInput
              depth={childDepth}
              placeholder="filename.js"
              icon={<FilePlus size={16} />}
              onConfirm={(name) => { onCreateFile(name, node.path); setCreating(null); }}
              onCancel={() => setCreating(null)}
            />
          )}
          {creating === 'folder' && (
            <InlineInput
              depth={childDepth}
              placeholder="folder-name"
              icon={<FolderPlus size={16} />}
              onConfirm={(name) => { onCreateFolder(node.path, name); setCreating(null); }}
              onCancel={() => setCreating(null)}
            />
          )}

          {node.children.map((child) =>
            child.type === 'folder' ? (
              <FolderNode
                key={child.path}
                node={child}
                depth={childDepth}
                activeFileId={activeFileId}
                expanded={expanded}
                onToggle={onToggle}
                onSelect={onSelect}
                onCreateFile={onCreateFile}
                onCreateFolder={onCreateFolder}
                onRename={onRename}
                onDelete={onDelete}
                onDeleteFolder={onDeleteFolder}
                openCtx={openCtx}
              />
            ) : (
              <FileRow
                key={child._id}
                node={child}
                depth={childDepth}
                isActive={activeFileId === child._id}
                onSelect={onSelect}
                onRename={onRename}
                onDelete={onDelete}
                openCtx={openCtx}
              />
            )
          )}
        </div>
      )}
    </>
  );
}

// ── FileExplorer (root component) ─────────────────────────────────
function FileExplorer({ files, knownFolders, activeFileId, onSelectFile, onCreateFile, onCreateFolder, onDeleteFile, onRenameFile, onDeleteFolder }) {
  const [expanded, setExpanded] = useState(new Set(['/']));
  const [ctx, setCtx] = useState(null);         // { x, y, items }
  const [rootCreating, setRootCreating] = useState(null); // null | "file" | "folder"

  const tree = buildFileTree(files, knownFolders || new Set(['/']));

  // Auto-expand ancestor folders whenever the active file changes
  useEffect(() => {
    if (!activeFileId || !files.length) return;
    const active = files.find(f => f._id === activeFileId);
    if (!active) return;
    const ancestors = getAncestorPaths(active.path || '/');
    if (ancestors.length === 0) return;
    setExpanded(prev => {
      const next = new Set(prev);
      ancestors.forEach(p => next.add(p));
      return next;
    });
  }, [activeFileId, files]);

  const toggleFolder = useCallback((path, forceOpen = false) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (forceOpen || !next.has(path)) next.add(path); else next.delete(path);
      return next;
    });
  }, []);

  const openCtx = useCallback((x, y, items) => setCtx({ x, y, items }), []);

  const rootCtxItems = [
    { label: 'New File', icon: <FilePlus size={14} />, onClick: () => setRootCreating('file') },
    { label: 'New Folder', icon: <FolderPlus size={14} />, onClick: () => setRootCreating('folder') },
  ];

  return (
    <div className="file-explorer">
      {/* Header */}
      <div className="file-explorer-header">
        <span className="fe-title">EXPLORER</span>
        <span className="fe-header-actions">
          <button className="file-add-btn" title="New File" onClick={() => setRootCreating('file')}><FilePlus size={16} /></button>
          <button className="file-add-btn" title="New Folder" onClick={() => setRootCreating('folder')}><FolderPlus size={16} /></button>
        </span>
      </div>

      {/* Tree */}
      <div
        className="file-tree"
        onContextMenu={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); openCtx(e.clientX, e.clientY, rootCtxItems); } }}
      >
        {/* Root-level inline create inputs (from header buttons) */}
        {rootCreating === 'file' && (
          <InlineInput
            depth={0}
            placeholder="filename.js"
            icon={<FilePlus size={16} />}
            onConfirm={(name) => { onCreateFile(name, '/'); setRootCreating(null); }}
            onCancel={() => setRootCreating(null)}
          />
        )}
        {rootCreating === 'folder' && (
          <InlineInput
            depth={0}
            placeholder="folder-name"
            icon={<FolderPlus size={16} />}
            onConfirm={(name) => { onCreateFolder('/', name); setRootCreating(null); }}
            onCancel={() => setRootCreating(null)}
          />
        )}

        <FolderNode
          node={tree}
          depth={0}
          activeFileId={activeFileId}
          expanded={expanded}
          onToggle={toggleFolder}
          onSelect={onSelectFile}
          onCreateFile={onCreateFile}
          onCreateFolder={onCreateFolder}
          onRename={onRenameFile}
          onDelete={onDeleteFile}
          onDeleteFolder={onDeleteFolder}
          openCtx={openCtx}
        />
      </div>

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} items={ctx.items} onClose={() => setCtx(null)} />}
    </div>
  );
}

export default FileExplorer;
