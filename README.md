# 🚀 CodeXLive — Real-Time Collaborative Coding & Social Ecosystem

**CodeXLive** is a production-grade, feature-rich collaborative IDE that merges professional project management with a robust developer social network. Inspired by GitHub and VS Code Live Share, it lets developers pair-program in real-time, track activity via contribution heatmaps, build a professional developer presence, and now — see each other's cursors live and download their entire codebase in one click.

---

## ✨ Feature Highlights

### 📝 Real-Time Collaborative Editor
- **Multi-File Synchronization** — instant code sync across all clients via Socket.io.
- **Live Cursor Tracking** — every participant's cursor is rendered in real-time with a colour-coded bookmark and name label. New joiners immediately receive all existing cursor positions via `cursor-sync-request`.
- **20+ Language Support** — full syntax highlighting, intelligent indentation, and auto-complete.
- **In-Browser Code Execution** — compile and run code using the integrated JDoodle API.
- **AI Assistant (Gemini)** — contextual debugging, boilerplate generation, and code explanation.
- **Code Formatting** — one-click Prettier formatting for supported languages.
- **Version History** — restore any previous snapshot of a file.
- **Download Project as ZIP** — export the entire project codebase as a `.zip` archive with one click.

### 👥 Collaborative Presence & Admin Controls
- **Waiting Room** — project owners vet new joiners before granting workspace access.
- **Role-Based Permissions** — promote/demote participants between Editor and Viewer roles in real-time.
- **Kick & Ban** — remove or permanently block disruptive participants.
- **Ownership Transfer** — seamlessly hand off admin rights to another participant.
- **Team Chat** — in-editor room chat with private direct messages (DMs).
- **Meeting Scheduler** — schedule, view, and manage project meetings with participant invites.

### 📊 Developer Social Ecosystem
- **Activity Heatmap** — GitHub-style 365-day contribution matrix (Project Creation, Edits, Joins).
- **Follower Network** — follow other developers with real-time notification triggers.
- **Rich Developer Profiles** — public projects, collaboration stats, streaks, and activity feed.
- **Global Search** — find users by username, email, or unique ID.

### 🔔 Smart Notifications & Sharing
- **Real-Time Notifications** — instant alerts for invitations, new followers, and task assignments.
- **Project Invitations** — invite specific users with role-based access (Editor/Viewer).
- **Email Alerts** — transactional emails via Brevo (Sendinblue) for offline users.

### 🛡️ Security & Infrastructure
- **Hybrid Authentication** — JWT sessions + Firebase Social Auth (Google/GitHub).
- **Rate Limiting & Helmet** — production-hardened Express with security headers.
- **Response Compression** — gzip compression for all API responses.
- **Environment Validation** — startup checks for all required environment variables.

---

## 🏗️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, CodeMirror (classic), Socket.io-client, Axios, Vanilla CSS |
| **Backend** | Node.js 18+, Express, Socket.io 4, MongoDB (Mongoose), Archiver |
| **Authentication** | JWT, Firebase Admin SDK (Google/GitHub), Bcrypt.js |
| **Integrations** | JDoodle API (Compiler), Google Gemini AI, Brevo (Email), GitHub API |
| **DevOps** | Docker, docker-compose, Nginx (client), Render (backend), Vercel (frontend) |

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js v18+
- MongoDB Atlas (or local MongoDB)
- Firebase project (for Social Auth)
- JDoodle API credentials
- Google Gemini API key *(optional)*
- Brevo API key *(optional, for email)*

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/CodeXLive.git
cd CodeXLive
```

### 2. Backend Setup
```bash
cd server
npm install
```

Create `server/.env`:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JDOODLE_CLIENT_ID=your_jdoodle_client_id
JDOODLE_CLIENT_SECRET=your_jdoodle_client_secret
GEMINI_API_KEY=your_gemini_key
SMTP_API_KEY=your_brevo_api_key
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

Start the backend:
```bash
npm run dev          # nodemon (development)
npm start            # node index.js (production)
```

### 3. Frontend Setup
```bash
cd ../client
npm install
```

Create `client/.env`:
```env
VITE_BACKEND_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Start the frontend:
```bash
npm run dev          # Vite dev server on http://localhost:3000
```

> **Note:** `VITE_BACKEND_URL` is read at Vite config-load time via `loadEnv` so the dev proxy always resolves correctly.

### 4. Docker (Full Stack)
```bash
docker-compose up --build
```

---

## 📁 Project Structure

```
CodeXLive/
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── components/      # Editor, Dashboard, Landing, layout, UI
│   │   ├── hooks/           # useAuth, useTheme, useRoomSocket, useFileTree
│   │   └── services/        # API abstraction (projectService, meetingService…)
│   └── vite.config.js       # Proxy config using loadEnv
│
└── server/                  # Node.js + Express backend
    ├── controllers/         # REST controllers incl. downloadController
    ├── models/              # Mongoose schemas
    ├── routes/              # Express routers incl. /:id/download
    ├── sockets/
    │   ├── roomState.js     # Shared ephemeral state (cursors, room maps)
    │   └── handlers/        # codeHandlers, roomHandlers, chatHandlers…
    └── middleware/          # auth.js (JWT), rate limiting
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
