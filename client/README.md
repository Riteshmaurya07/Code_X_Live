# 🖥️ CodeXAlive — Frontend React Core

The CodeXAlive frontend is built using **React (Vite 5)** and **TailwindCSS**, providing a high-performance, real-time interface for collaborative coding.

---

## 🎨 Feature Modules

### 🛠️ Editor Interface (CodeMirror 6)
- **Real-Time Sync**: Using Socket.io for immediate updates.
- **Syntax Highlighting**: Supports CodeMirror modes for diverse programming languages.
- **Multi-File Explorer**: Dynamic file system for managing project files.
- **Output Panel**: Real-time console for program execution.

### 👥 User & Room Management
- **Dashboard**: Centralized hub for user projects and collaborations.
- **Admin Sidebar**: Exclusive controls for the project owner (Kick, Ban, Rejoin).
- **Waiting Room UI**: A dedicated interface for pending requests.
- **Public Profile View**: GitHub-style public contributor dashboards.

### 🤖 Intellect AI Integration
- **AI Chat Panel**: Interactive AI assistant to help you code.
- **Code Explain/Debug**: One-click AI context for the active file.

---

## 🚀 Getting Started

### 1️⃣ Install Dependencies
```bash
npm install
```

### 2️⃣ Configure Environment
Create a `.env` file in the root of the `client` directory:
```env
VITE_BACKEND_URL=http://localhost:5000
```

### 3️⃣ Development Server
```bash
npm run dev
```

### 4️⃣ Build for Production
```bash
npm run build
```

---

## 🏗️ Folder Structure

- `/src/components`: UI components (Editor, Dashboard, Layout, etc.)
- `/src/hooks`: Custom React hooks for global state and logic.
- `/src/pages`: Main application views (Home, Login, Dashboard, etc.)
- `/src/services`: API and Socket client initialization.
- `/src/ui`: Reusable atomic UI components like Buttons, Modals, and Tooltips.
- `/src/Actions.js`: Shared constant definitions for socket events.

---

## 🧩 Key Libraries
- **CodeMirror**: Specialized code editor engine.
- **Socket.io-client**: Real-time WebSocket communication.
- **React Router Dom**: Client-side navigation.
- **Axios**: HTTP client for API requests.
- **React Hot Toast**: Elegant notification system.
