# 🖥️ CodeXLive Frontend — Premium Developer Experience

[![React](https://img.shields.io/badge/UI-React%2018-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Build-Vite-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![CodeMirror](https://img.shields.io/badge/Editor-CodeMirror%206-black?style=flat-square&logo=codemirror)](https://codemirror.net/)
[![Tailwind](https://img.shields.io/badge/Styling-Vanilla%20CSS-38B2AC?style=flat-square&logo=css3)](https://developer.mozilla.org/en-US/docs/Web/CSS)

The CodeXLive frontend is a high-performance, real-time interface engineered for seamless collaboration. Built with **React 18** and **Vite**, it delivers a glassmorphic, premium UI/UX optimized for productivity and developer social engagement.

---

## 🚀 Key Modules & Features

### 🛠️ Professional Collaborative Editor
- **Real-Time Sync**: Powered by Socket.io for millisecond-latency code propagation.
- **Live Cursors**: Visual presence with throttled movement tracking and peer synchronization.
- **20+ Languages**: Full syntax highlighting and intelligent indentation.
- **Multi-File Interface**: VS Code-style file management with persistent tab states.

### 🤖 AI-Integrated Workflow
- **Gemini Assistant**: Contextual code analysis and debugging within the editor.
- **One-Click Fixes**: Directly apply AI-suggested code improvements to your source.

### 📊 Social & Analytical Hub
- **Contribution Matrix**: GitHub-style heatmap visualization of coding activity.
- **Developer Metrics**: Comprehensive stats on collaboration, streaks, and streaks.
- **Follower Ecosystem**: Interactive networking with real-time push notifications.

### 💬 Integrated Communication
- **Unified Chat**: Centralized room chat with thread-based private DMs.
- **Notification Center**: Real-time alerts for invitations, follows, and assignments.

---

## 📁 Frontend Directory Structure

```text
client/src/
├── components/          # Reusable UI and complex page modules
│   ├── Editor/          # Collaborative editor and workspace tools
│   ├── Dashboard/       # User project management and analytics
│   └── layout/          # Global navigation and notification systems
├── hooks/               # Custom React logic (Auth, Sockets, Theme)
├── services/            # API abstraction and interceptor logic
├── utils/               # Constants, formatters, and helper functions
└── styles/              # Design tokens and global CSS system
```

---

## ⚙️ Setup & Installation

### 1. Installation
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file in the `client/` root:
```env
VITE_BACKEND_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=your_key
# ... other Firebase configuration
```

### 3. Development
```bash
npm run dev    # Launches dev server on http://localhost:5173
```

---

## 🛠️ Build & Optimization
- **Vite Proxy**: Configured to seamlessly bridge local development with the backend API.
- **Lazy Loading**: Route-based code splitting for faster initial page loads.
- **Asset Optimization**: Automated minification and bundling for production deployments.
