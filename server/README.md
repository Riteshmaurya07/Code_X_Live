# ⚙️ CodeXLive Backend — Professional Infrastructure

[![Node.js](https://img.shields.io/badge/Runtime-Node.js-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Framework-Express-lightgrey?style=flat-square&logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-brightgreen?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Real--time-Socket.io-black?style=flat-square&logo=socket.io)](https://socket.io/)

The CodeXLive backend is a production-hardened **Node.js** and **Socket.io** server. It orchestrates real-time collaboration, complex project lifecycles, social dynamics, and secure code execution environments.

---

## 🏗️ Core Architecture

### 🌐 REST API Layer
The backend provides a robust RESTful API for persistent data management and heavy computational tasks.

| Module | Functionality |
| :--- | :--- |
| **Auth** | Multi-strategy authentication (JWT + Firebase Social Auth). |
| **Projects** | CRUD operations with advanced sharing and permission logic. |
| **Downloads** | High-performance ZIP streaming of project sources using `archiver`. |
| **Compile** | Secure proxy to JDoodle API for executing code in 20+ languages. |
| **AI** | Integration with Google Gemini for intelligent developer assistance. |
| **Social** | User profiles, follower networks, and global user discovery. |
| **Activity** | Tracking coding streaks, contributions, and generating heatmap data. |

### ⚡ Real-Time Socket Layer
Powered by **Socket.io 4**, this layer handles all high-frequency events with minimal latency.

- **`roomHandlers.js`**: Manages the workspace lifecycle (Join, Leave, Sync, Moderation).
- **`codeHandlers.js`**: Atomic code changes, cursor tracking, and file CRUD sync.
- **`chatHandlers.js`**: Real-time room broadcasts and end-to-end private messaging.
- **`permissionHandlers.js`**: Dynamic role updates (Editor ↔ Viewer) and security enforcement.

---

## ⚡ Live Cursor Synchronization
CodeXLive implements a sophisticated cursor tracking system:

1. **Emission**: Client sends `cursor-move` events (throttled at 50ms).
2. **State Management**: Server maintains an in-memory `roomState` for high-speed access.
3. **Synchronization**: New participants receive a full state dump via `cursor-sync-request` to ensure zero-latency visibility of peers.

---

## 📁 Project Directory Structure

```text
server/
├── controllers/         # Business logic (Auth, Projects, AI, Social)
├── models/              # Mongoose schemas (User, Project, File, Message)
├── routes/              # Express API route definitions
├── sockets/             # Socket.io orchestration
│   ├── handlers/        # Event-specific logic (Code, Room, Chat)
│   └── roomState.js     # Ephemeral in-memory state store
├── middleware/          # Security (Auth, Rate-limiting, CORS)
├── utils/               # Integration helpers (Gemini, JDoodle, Brevo)
└── index.js             # Server entry point and bootstrapper
```

---

## ⚙️ Development Setup

### 1. Installation
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file with the following:
```env
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
JDOODLE_CLIENT_ID=your_id
JDOODLE_CLIENT_SECRET=your_secret
GEMINI_API_KEY=your_key
SMTP_API_KEY=your_brevo_key
CLIENT_URL=http://localhost:5173
```

### 3. Execution
```bash
npm run dev      # Auto-restart development server
npm start        # Production execution
```

---

## 🛡️ Security & Performance
- **Stateless Auth**: JWT-based sessions for scalability.
- **Gzip Compression**: All responses are compressed for faster transfer.
- **Rate Limiting**: Protects expensive endpoints (AI, Compiler).
- **Helmet**: Secures the app by setting various HTTP headers.
