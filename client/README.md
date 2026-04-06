# 🖥️ CodeXAlive — Frontend React Core

The CodeXAlive frontend is a high-performance, real-time interface built with **React (Vite 5)**. It features a custom **Design Token System** for a premium, glassmorphic UI that scales across mobile and desktop.

---

## 🎨 Feature Modules

### 🛠️ Collaborative Editor (CodeMirror 6)
- **Real-Time Sync**: Instant WebSocket synchronization via Socket.io.
- **Support for 20+ Languages**: Full syntax highlighting and intelligent auto-indent.
- **Integrated Compiler**: Execute and view code output natively.
- **Admin Controls**: Owners can manage room access, kick/ban participants, and approve join requests.

### 📊 Social & Activity Dashboard (New!)
- **Activity Heatmap**: A custom 365-day contribution matrix displaying daily coding intensity.
- **Developer Stats**: Streak counting, active days tracking, and collaboration metrics.
- **Follower Network**: Interactive lists for followers and following with real-time updates.
- **Project Invitations**: A dedicated dashboard panel to accept or decline collaboration invites.

### 🔔 Notification System
- **Global Dropdown**: A Navbar-integrated bell icon with real-time unread badges.
- **Live Dispatch**: Instant unread counts and clickable alerts for social and project events.
- **Deep Linking**: Notifications lead directly to user profiles or project dashboards.

### 🤖 Intellect AI Integration
- **Contextual Assistance**: AI-powered code explanation and debugging directly in the sidebar.
- **Gemini Pro**: High-fidelity AI responses for boilerplate generation and architectural advice.

---

## 🚀 Getting Started

### 1️⃣ Install Dependencies
```bash
npm install
```

### 2️⃣ Configure Environment
Create a `.env` file in the `client` directory:
```env
VITE_BACKEND_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_id
```

### 3️⃣ Development Server
```bash
npm run dev
```

---

## 🏗️ Folder Structure

- `/src/components/profile`: Specialized social dashboard components (Heatmap, Stats, Timeline).
- `/src/components/layout`: Core navigation, footer, and notification dropdowns.
- `/src/hooks`: Global state hooks (useAuth, useSocket, useTheme).
- `/src/services`: API abstraction layers (sharingService, userService, projectService).
- `/src/styles`: Design tokens, social-specific CSS, and editor styling.

---

## 🧩 Key Libraries
- **CodeMirror 6**: The core editor engine.
- **Socket.io-client**: Real-time WebSocket layer.
- **Firebase Auth**: Social login providers (Google/GitHub).
- **React Hot Toast**: Elegant, accessible UI notifications.
- **Lucide React**: Modern iconography system.
