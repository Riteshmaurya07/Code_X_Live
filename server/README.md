# ⚙️ CodeXAlive — Backend Express Core

The CodeXAlive backend is a high-performance **Node.js** and **Socket.io** server that manages real-time collaboration, complex user social dynamics, and project lifecycle management.

---

## 🛠️ Core Modules

### 🔐 Multi-Layer Authentication
- **Secure Sessions**: JSON Web Tokens for session management.
- **Social Login**: Integrated Firebase Auth validation for Google/GitHub providers.
- **Identity Middleware**: Context-aware `auth.js` middleware for protecting sensitive social and project data.

### 🔌 Real-Time Socket.io Handler
- **Live Collaboration**: Event-driven architecture for multi-file sync and cursor tracking.
- **Global Presence**: Dedicated `REGISTER_USER` event for site-wide notifications.
- **Admin Control Flow**: Handlers for kicking, banning, and re-entry approval workflows.
- **Room Management**: Dynamic tracking of project rooms and admin states.

### 📊 Social & Activity Tracking
- **Developer Metrics**: Aggregation logic for calculating 365-day heatmaps and coding streaks.
- **Follower Network**: Persistent tracking of user relationships with real-time notify triggers.
- **Activity Pipeline**: High-frequency logging of project and user events (Edits, Joins, Logins).

### 📝 Sharing & Invitations
- **Role-Based Invites**: Create and manage project invitations for specific users (Editor/Viewer).
- **Secure Tokens**: Every invitation generates a cryptographically secure, time-limited token.
- **Email Dispatch**: Automated transactional emails via **Brevo (Sendinblue)** for project invites and follow alerts.

### 💻 Intellect AI Logic
- **Advanced Context**: Proxied AI analysis using **Google Gemini Pro**.
- **JDoodle Execution**: Secure backend proxy for compiling and executing code in isolated containers.

---

## 🚀 Getting Started

### 1️⃣ Install Dependencies
```bash
npm install
```

### 2️⃣ Configure Environment
Create a `.env` file in the `server` directory:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JDOODLE_CLIENT_ID=your_jdoodle_id
JDOODLE_CLIENT_SECRET=your_jdoodle_secret
GEMINI_API_KEY=your_gemini_key
SMTP_API_KEY=your_brevo_api_key
```

### 3️⃣ Development Server
```bash
npm run dev
```

---

## 🏗️ Folder Structure

- `/controllers`: Logic for Social, Sharing, Projects, and AI modules.
- `/models`: Mongoose schemas (User, Project, Invitation, Notification, ActivityLog).
- `/routes`: Definition of RESTful API endpoints for the social ecosystem.
- `/sockets`: Real-time listeners for Editor rooms and Global notifications.
- `/utils`: Transactional email templates and high-frequency logging utilities.

---

## 🧩 Key Libraries
- **Socket.io 4**: Real-time bi-directional transport.
- **Mongoose**: Advanced schema-based ODM for MongoDB.
- **Nodemailer + Brevo**: Transactional email dispatch.
- **Bcryptjs**: High-security password hashing.
- **Firebase Admin SDK**: Optional for advanced user management.
