/**
 * fileTree.js — Converts a flat files array into a nested tree structure.
 *
 * Folder persistence rules:
 *  - A folder node always appears if it has at least one file descendant.
 *  - A folder node ALSO appears if its path is in `knownFolders` (explicitly
 *    created virtual folder), even when it has no file children.
 *  - When the last file inside a regular folder is deleted and the folder path
 *    is NOT in `knownFolders`, the folder disappears automatically.
 */

/**
 * Normalize a path:
 *   - Always starts with "/"
 *   - No trailing slash
 *   - Empty / null / "." → "/"
 */
export const normalizePath = (p) => {
  if (!p || p === '.' || p === '/') return '/';
  const s = p.startsWith('/') ? p : `/${p}`;
  return s.endsWith('/') ? s.slice(0, -1) : s;
};

/**
 * Return the parent path of a normalized path.
 * "/src/utils" → "/src"
 * "/src"       → "/"
 * "/"          → "/"
 */
export const getParentPath = (path) => {
  const n = normalizePath(path);
  if (n === '/') return '/';
  const idx = n.lastIndexOf('/');
  return idx === 0 ? '/' : n.substring(0, idx);
};

/**
 * Build a nested tree from a flat files array + the set of known virtual folders.
 *
 * @param {Array}  files        — flat MongoDB file documents
 * @param {Set}    knownFolders — paths of explicitly created virtual folders
 * @returns {Object} root node  { name, type:"folder", path, children }
 */
export const buildFileTree = (files = [], knownFolders = new Set()) => {
  const root = { name: 'root', type: 'folder', path: '/', children: [] };
  const folderMap = { '/': root };

  // Ensure a folder node exists for `folderPath`, creating ancestors as needed.
  const ensureFolder = (folderPath) => {
    const p = normalizePath(folderPath);
    if (folderMap[p]) return folderMap[p];

    const parentNode = ensureFolder(getParentPath(p));
    const segments = p.split('/');
    const node = {
      name: segments[segments.length - 1],
      type: 'folder',
      path: p,
      children: [],
    };
    parentNode.children.push(node);
    folderMap[p] = node;
    return node;
  };

  // 1. Pin all explicitly known virtual folders (survive empty-folder deletion).
  for (const fp of knownFolders) {
    if (fp !== '/') ensureFolder(fp);
  }

  // 2. Place every file under its parent folder.
  for (const file of files) {
    const parentFolder = ensureFolder(normalizePath(file.path || '/'));
    parentFolder.children.push({ ...file, type: 'file' });
  }

  // 3. Sort each level: folders first (alpha), then files (alpha).
  const sort = (node) => {
    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
    node.children.filter(c => c.type === 'folder').forEach(sort);
  };
  sort(root);

  return root;
};

/**
 * Return all ancestor folder paths for a given file path.
 * Used to auto-expand folders containing the currently active file.
 *
 * e.g. "/src/utils" → ["/src/utils", "/src"]
 */
export const getAncestorPaths = (filePath) => {
  const n = normalizePath(filePath);
  if (n === '/') return [];
  const ancestors = [];
  let cur = n;
  while (cur !== '/') {
    ancestors.push(cur);
    cur = getParentPath(cur);
  }
  return ancestors;
};
