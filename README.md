# 🚀 CodeXLive — Real-Time Collaborative Coding & Social Ecosystem

CodeXLive is a high-performance, feature-rich collaborative IDE that integrates professional project management with a robust developer social network. Inspired by tools like GitHub and VS Code Live Share, it allows developers to pair program in real-time, track their coding activity via heatmaps, and build a professional developer presence.

---

## 📺 Project Overview

CodeXLive goes beyond a simple editor. It offers a full suite of tools including multi-file synchronization, a global notification system, interactive developer profiles, and an AI-powered coding assistant.

### ✨ Key Features

#### 📝 Real-Time Collaborative Editor
- **Multi-File Synchronization**: Instant code syncing across all clients using Socket.io.
- **Support for 20+ Languages**: Full syntax highlighting and intelligent indentation.
- **In-Browser Execution**: Compile and run code directly using the integrated JDoodle API.
- **Collaborative Presence**: See who is active in the room and manage participant permissions in real-time.

#### 📊 Developer Social Ecosystem (New!)
- **Activity Heatmap**: Track your daily coding contributions (Project Creation, Edits, Joins) with a GitHub-style 365-day matrix.
- **Follower Network**: Build your professional circle by following other developers and receiving real-time updates.
- **Rich Developer Profiles**: Display your public projects, collaboration stats, current streaks, and recent activity feed.
- **Global Search**: Find other users by username, email, or unique ID for quick collaboration.

#### 🔔 Smart Notifications & Sharing
- **Real-Time Notifications**: Instant alerts for project invitations, new followers, and task assignments via a global socket registration.
- **Project Invitations**: Securely invite specific users to collaborate on your projects with role-based access (Editor/Viewer).
- **Email Alerts**: Integrated with Brevo (Sendinblue) to provide transactional email notifications for offline users.

#### 🛡️ Advanced Security & Admin Controls
- **Hybrid Authentication**: Secure Login/Register via JWT or Social Auth (Firebase Integration).
- **Waiting Room**: Project owners can vet new joiners before granting workspace access.
- **Admin Dashboard**: Real-time participant management (Kick, Ban, Promote, or Transfer Ownership).
- **Secure Tokens**: Every invitation has a unique, time-limited token for secure project entry.

#### 🤖 Intellect AI Assistant
- **Code Debugging**: Instant AI analysis of errors and performance bottlenecks.
- **Boilerplate Generation**: Quickly generate code templates for various frameworks.
- **Explain Code**: Interactive AI chat to help explain complex functions and logic.

---

## 🏗️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React (Vite), CodeMirror 6, Socket.io-client, Axios, CSS Variables (Design Tokens) |
| **Backend** | Node.js, Express, Socket.io, MongoDB (Mongoose) |
| **Authentication** | JSON Web Tokens (JWT), Firebase Auth (Google/GitHub), Bcrypt.js |
| **Integrations** | JDoodle API (Compiler), Google Gemini AI, Brevo API (Email), GitHub API |

---

## ⚙️ Installation & Setup

### 1️⃣ Prerequisites
- Node.js (v18 or higher)
- MongoDB (Atlas recommended)
- Firebase Project (for Social Auth)
- JDoodle API Credentials
- Google Gemini API Key (Optional)

### 2️⃣ Clone the Repository
```bash
git clone https://github.com/your-username/CodeXLive.git
cd CodeXLive
```

### 3️⃣ Backend Setup
```bash
cd server
npm install
```
Create a `.env` file in the `server` directory:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JDOODLE_CLIENT_ID=your_jdoodle_id
JDOODLE_CLIENT_SECRET=your_jdoodle_secret
GEMINI_API_KEY=your_gemini_key
FIREBASE_CONFIG_PATH=./config/firebaseConfig.json # If using service account
SMTP_API_KEY=your_brevo_api_key
```
Run the server:
```bash
npm run dev
```

### 4️⃣ Frontend Setup
```bash
cd ../client
npm install
```
Create a `.env` file in the `client` directory:
```env
VITE_BACKEND_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_id
```
Run the frontend:
```bash
npm run dev
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
