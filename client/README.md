# 🖥️ CodeXLive — Frontend (React + Vite)

The CodeXLive frontend is a high-performance real-time interface built with **React 18 + Vite**. It features a glassmorphic design system, a full-featured CodeMirror collaborative editor, live cursor tracking, and a rich developer social dashboard.

---

## 🚀 Getting Started

### Install Dependencies
```bash
npm install
```

### Configure Environment
Create a `.env` file in the `client/` directory:

```env
# Backend URL — used by Vite proxy at config-load time (via loadEnv)
VITE_BACKEND_URL=http://localhost:5000

# Firebase (Social Auth)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

> **Important:** `VITE_BACKEND_URL` is read by `vite.config.js` via `loadEnv` at startup — **not** via `process.env` — so the dev proxy always has a valid target. If you change `.env`, restart the dev server.

### Development Server
```bash
npm run dev    # http://localhost:3000
```

Vite proxies:
- `/api/*` → `VITE_BACKEND_URL` (REST API)
- `/socket.io/*` → `VITE_BACKEND_URL` with `ws: true` (WebSocket upgrade)

---

## ✨ Feature Modules

### 🛠️ Collaborative Editor (`/src/components/Editor.jsx`)
- **Real-Time Code Sync** — Socket.io `CODE_CHANGE` events keep all participants in sync.
- **Live Cursor Tracking** — `cursorActivity` listener emits `cursor-move` to the socket (throttled to **50 ms**). Peers' cursors render as colour-coded bookmarks with name labels via CodeMirror `setBookmark`.
- **Cursor Sync on Join** — when a new user joins, `cursor-sync-request` is emitted and the server replies with all current cursor positions, so late joiners immediately see where everyone is.
- **20+ Languages** — syntax highlighting via CodeMirror mode modules.
- **Autocomplete** — `anyword-hint` + `javascript-hint` on `Ctrl+Space` / input.
- **Theme Toggle** — Dracula (dark) / Eclipse (light).
- **Read-Only Mode** — viewers cannot edit; the readonly banner is shown.

### ⬇️ Download Project as ZIP (`EditorToolbar` + `EditorPage`)
- The **⬇️ button** in the toolbar (only visible for persisted DB projects) calls `handleDownloadProject`.
- Uses `fetch` with `Authorization: Bearer <token>` to call `GET /api/projects/:id/download`.
- Response is streamed into a `Blob`, converted to an object URL, and a hidden `<a>` click triggers the browser's save-file dialog.
- URL is immediately revoked after download to free memory.

### 🗂️ File Explorer & Multi-File Editing
- Create, rename, and delete files within a project.
- Tab bar shows all open files with active state highlight.
- Auto-saves to MongoDB with debounce; manual save with 💾.

### 📊 Developer Social Dashboard
- **Activity Heatmap** — 365-day GitHub-style contribution matrix.
- **Stats** — streak counting, active days, collaboration count.
- **Follower Network** — interactive follow/unfollow with real-time notification.
- **Project Invitations** — accept or decline collaboration invites.

### 🔔 Notification System
- Navbar bell icon with real-time unread badge via global socket.
- Deep links to user profiles and project dashboards.

### 💬 Team Chat
- In-editor room chat panel with `Everyone` broadcast and private DMs.
- Unread badge per conversation thread.

### 📅 Meeting Scheduler
- Schedule, edit, view, and cancel project meetings.
- Invite specific project members to meetings.
- Real-time meeting events synced across room participants.

### 🤖 AI Assistant
- Gemini-powered code explanation, debugging, and boilerplate generation.
- Apply AI-suggested fixes directly into the editor.

---

## 📁 Folder Structure

```
client/src/
├── components/
│   ├── Editor.jsx              # CodeMirror instance + cursor tracking
│   ├── EditorPage.jsx          # Top-level editor page, handleDownloadProject
│   ├── Editor/
│   │   ├── EditorToolbar.jsx   # Toolbar with ⬇️ download button
│   │   ├── EditorSidebar.jsx   # File explorer + member list
│   │   ├── CompilerOutput.jsx
│   │   ├── MeetingPanel.jsx
│   │   └── ...
│   ├── Dashboard/
│   ├── Landing/
│   ├── layout/                 # Navbar, NotificationDropdown
│   ├── profile/                # Heatmap, Stats, Timeline
│   └── ui/                     # Button, shared UI primitives
├── hooks/
│   ├── useAuth.jsx
│   ├── useTheme.jsx
│   ├── useGlobalSocket.jsx
│   └── editor/
│       ├── useRoomSocket.js    # Socket lifecycle + cursor-sync-request on JOIN
│       └── useFileTree.js
├── services/
│   ├── api.js                  # Axios instance with Bearer token interceptor
│   ├── projectService.js
│   ├── meetingService.js
│   └── ...
└── Actions.js                  # Shared socket event name constants
```

---

## 🧩 Key Dependencies

| Package | Purpose |
|---|---|
| `codemirror` (v5/classic) | Editor engine with mode plugins |
| `socket.io-client` | Real-time WebSocket layer |
| `react-router-dom` | Client-side routing |
| `axios` | HTTP client with auth interceptor |
| `firebase` | Social login (Google/GitHub) |
| `react-hot-toast` | Accessible toast notifications |
| `@tailwindcss/vite` | Utility CSS (selectively used) |
