# CodeXLive Upgrade — Walkthrough

## Overview

CodeXLive has been upgraded from a simple real-time collaborative code editor into a comprehensive **AI-powered developer platform** with authentication, project management, multi-file editing, and intelligent code assistance.

---

## Architecture Changes

### Backend (`server/`)

```
server/
├── config/
│   └── db.js                    ← MongoDB connection
├── controllers/
│   ├── aiController.js          ← AI code review, explain, fix, tests, chat
│   ├── authController.js        ← Register, login, profile
│   ├── compileController.js     ← JDoodle code execution
│   ├── fileController.js        ← File CRUD operations
│   └── projectController.js     ← Project CRUD operations
├── middleware/
│   └── auth.js                  ← JWT authentication middleware
├── models/
│   ├── File.js                  ← File schema (content, language, path)
│   ├── Project.js               ← Project schema (owner, collaborators)
│   ├── Session.js               ← Session tracking schema
│   └── User.js                  ← User schema with bcrypt hashing
├── routes/
│   ├── aiRoutes.js              ← POST /api/ai/*
│   ├── authRoutes.js            ← POST /api/auth/*
│   ├── compileRoutes.js         ← POST /compile
│   ├── fileRoutes.js            ← /api/files/*
│   └── projectRoutes.js         ← /api/projects/*
├── sockets/
│   └── socketHandler.js         ← All Socket.io event handling
├── index.js                     ← Rewritten entry point
├── Actions.js                   ← Socket event constants
├── .env                         ← Updated with new variables
└── .env.example                 ← Template for all required env vars
```

### Frontend (`client/src/`)

```
client/src/
├── components/
│   ├── AIPanel.jsx              ← AI assistant side panel
│   ├── Client.jsx               ← User avatar display (updated)
│   ├── Editor.jsx               ← CodeMirror editor (upgraded)
│   ├── EditorPage.jsx           ← Main editor workspace (rewritten)
│   ├── FileExplorer.jsx         ← File management sidebar
│   └── Home.jsx                 ← Home/Join room page (updated)
├── hooks/
│   └── useAuth.jsx              ← Auth context & hook
├── pages/
│   ├── Dashboard.jsx            ← User project dashboard
│   ├── Login.jsx                ← Login page
│   └── Register.jsx             ← Registration page
├── services/
│   ├── aiService.js             ← AI API calls
│   ├── api.js                   ← Axios instance with interceptors
│   ├── authService.js           ← Auth API calls
│   └── projectService.js        ← Project & file API calls
├── App.jsx                      ← Updated with AuthProvider & routes
├── App.css                      ← Complete new design system (700+ lines)
└── index.css                    ← Global reset
```

---

## New Features Implemented

### 🤖 AI-Powered Tools (5 features)
| Feature | Endpoint | Description |
|---------|----------|-------------|
| Code Review | `POST /api/ai/review` | Bug detection, performance, security, refactoring |
| Code Explanation | `POST /api/ai/explain` | Step-by-step code breakdown |
| Bug Fix | `POST /api/ai/fix` | Auto-corrected code with explanations |
| Test Generator | `POST /api/ai/tests` | Unit tests for any function |
| Chat Assistant | `POST /api/ai/chat` | Contextual Q&A about code |

### 🔐 Authentication
- JWT-based login/register with bcrypt password hashing
- Protected routes for dashboard and project management
- Auto-redirect on token expiry

### 📁 Multi-file Project System
- File explorer with create, rename, and delete
- Language-aware file icons
- Project persistence via MongoDB

### 🎨 Modern UI
- Premium dark theme with CSS custom properties
- Inter + JetBrains Mono typography
- Responsive layout with sidebar + workspace pattern
- Micro-animations and hover effects

### ✏️ Editor Upgrades
- 16+ language modes (Python, Java, C++, Go, Rust, etc.)
- Autocomplete (Ctrl+Space)
- Active line highlighting
- Bracket matching

### 🤝 Collaboration Enhancements
- Cursor tracking socket events
- Inline commenting socket events
- Execution time display

---

## Setup Instructions

### 1. Install Dependencies

```bash
# Server
cd server
npm install

# Client
cd client
npm install
```

### 2. Configure Environment

Edit `server/.env`:
```env
MONGO_URI=mongodb://localhost:27017/codexlive   # or MongoDB Atlas URI
JWT_SECRET=your_secure_random_secret
GEMINI_API_KEY=your_gemini_api_key              # Get from Google AI Studio
```

### 3. Start MongoDB

```bash
# Local MongoDB
mongod

# Or use MongoDB Atlas (update MONGO_URI)
```

### 4. Run the Application

```bash
# Terminal 1 — Server
cd server
npm start

# Terminal 2 — Client
cd client
npm run dev
```

### 5. Get a Gemini API Key

Visit [Google AI Studio](https://aistudio.google.com/apikey) and create a free API key.

---

## Deployment

| Service | Platform | Config |
|---------|----------|--------|
| Frontend | Vercel | Set `VITE_BACKEND_URL` |
| Backend | Render | Set all env vars |
| Database | MongoDB Atlas | Use connection string |
