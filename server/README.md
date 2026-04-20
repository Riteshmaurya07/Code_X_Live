# ⚙️ CodeXLive — Backend (Node.js / Express / Socket.io)

The CodeXLive backend is a production-hardened **Node.js** and **Socket.io** server that manages real-time collaboration, project lifecycle, user social dynamics, code execution, and file downloads.

---

## 🚀 Getting Started

### Install Dependencies
```bash
npm install
```

### Configure Environment
Create a `.env` file in the `server/` directory:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

# Code Execution
JDOODLE_CLIENT_ID=your_jdoodle_client_id
JDOODLE_CLIENT_SECRET=your_jdoodle_client_secret

# AI
GEMINI_API_KEY=your_gemini_api_key

# Email (Brevo/Sendinblue)
SMTP_API_KEY=your_brevo_api_key

# Firebase (Social Auth)
FIREBASE_CONFIG_PATH=./config/firebaseConfig.json

# CORS
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

### Run
```bash
npm run dev      # nodemon — auto-restart on changes
npm start        # production
```

---

## 🏗️ Architecture

### REST API (`/routes` + `/controllers`)

| Route Prefix | Purpose |
|---|---|
| `POST /api/auth/*` | Register, login, Firebase social login |
| `GET/POST/PUT/DELETE /api/projects` | CRUD for projects |
| `GET /api/projects/:id/download` | **Stream project as `.zip`** (uses `archiver`) |
| `GET/POST/DELETE /api/files` | File management within a project |
| `POST /api/compile` | Proxy to JDoodle for code execution |
| `POST /api/format` | Prettier-based code formatting |
| `POST /api/ai` | Google Gemini AI assistant |
| `GET/POST /api/users` | User profiles, follow/unfollow, search |
| `GET/POST /api/notifications` | Real-time notification store |
| `GET/POST /api/messages` | Room + private messages |
| `GET/POST/PUT/DELETE /api/meetings` | Meeting scheduler |
| `GET /api/activity` | 365-day heatmap & coding stats |
| `GET/POST /api/sharing` | Project invitation & access management |

### Socket.io Handlers (`/sockets/handlers`)

| Handler | Events |
|---|---|
| `roomHandlers.js` | `JOIN`, `CREATE_ROOM`, `SYNC_CODE`, `KICKED`, `BANNED`, `APPROVAL_REQUEST`, file CRUD events |
| `codeHandlers.js` | `CODE_CHANGE`, `file-change`, `cursor-move`, `cursor-sync-request`, `add-comment` |
| `chatHandlers.js` | `SEND_ROOM_MESSAGE`, `SEND_PRIVATE_MESSAGE` |
| `permissionHandlers.js` | `PROMOTE_TO_EDITOR`, `DEMOTE_TO_VIEWER`, `KICK_USER` |
| `disconnectHandlers.js` | Cleanup on socket disconnect (cursors, room state, admin re-election) |

### Live Cursor Tracking

```
Client emits  →  cursor-move  { roomId, cursor: { line, ch } }
Server stores →  cursorPositions[roomId][socketId] = { username, line, ch }
Server emits  →  cursor-update  (to all other sockets in room)

On join:
Client emits  →  cursor-sync-request  { roomId }
Server emits  →  cursor-sync  (to requesting socket only, with full cursorPositions map)
```

Throttle: **50 ms** (`CURSOR_THROTTLE_MS`) enforced server-side in `roomState.js`.

### Project ZIP Download

`GET /api/projects/:id/download` (auth required):
1. Resolves project by ObjectId or `roomId` slug.
2. Validates requester is owner or collaborator.
3. Fetches all `File` documents for the project.
4. Streams them into a `.zip` archive via **archiver** piped to `res`.
5. Sets `Content-Type: application/zip` and `Content-Disposition: attachment; filename="<name>.zip"`.

---

## 📁 Folder Structure

```
server/
├── controllers/
│   ├── projectController.js       # Project CRUD
│   ├── downloadController.js      # ZIP download (archiver)
│   ├── fileController.js
│   ├── authController.js
│   ├── aiController.js
│   ├── compileController.js
│   ├── formatController.js
│   ├── sharingController.js
│   ├── meetingController.js
│   ├── messageController.js
│   ├── notificationController.js
│   ├── userController.js
│   ├── githubController.js
│   └── activityController.js
├── models/                        # Mongoose schemas
│   ├── User.js
│   ├── Project.js
│   ├── File.js
│   ├── Version.js
│   ├── Invitation.js
│   ├── Meeting.js
│   ├── Message.js
│   ├── Notification.js
│   ├── ActivityLog.js
│   └── Session.js
├── routes/                        # Express routers
├── sockets/
│   ├── roomState.js               # Shared in-memory state (cursors, admins, permissions)
│   ├── socketHandler.js           # Top-level socket bootstrapper
│   └── handlers/
│       ├── codeHandlers.js
│       ├── roomHandlers.js
│       ├── chatHandlers.js
│       ├── permissionHandlers.js
│       └── disconnectHandlers.js
├── middleware/
│   └── auth.js                    # JWT verification middleware
├── utils/
│   └── logger.js                  # Winston logger
└── index.js                       # Entry point (Express + Socket.io bootstrap)
```

---

## 🧩 Key Dependencies

| Package | Purpose |
|---|---|
| `socket.io` | Real-time bi-directional transport |
| `mongoose` | Schema-based ODM for MongoDB |
| `archiver` | ZIP streaming for project downloads |
| `jsonwebtoken` | JWT auth |
| `bcryptjs` | Password hashing |
| `firebase-admin` | Social auth token verification |
| `nodemailer` | Transactional email via Brevo SMTP |
| `helmet` | Security headers |
| `compression` | gzip response compression |
| `express-rate-limit` | API rate limiting |
| `prettier` | Code formatting |
| `@google/generative-ai` | Gemini AI integration |
