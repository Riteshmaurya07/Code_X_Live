# 🚀 CodeXAlive — Real-Time Collaborative Coding Platform

CodeXAlive is a feature-rich, real-time collaborative coding environment that allows developers to write, compile, and manage projects together. Inspired by tools like GitHub and VS Code Live Share, it provides a seamless experience for team-based development and pair programming.

---

## 📺 Project Overview

CodeXAlive goes beyond a simple editor. It offers a full suite of tools including project management, user authentication, administrative controls, and an AI-powered coding assistant.

### ✨ Key Features

#### 📝 Collaborative Editor
- **Real-Time Sync**: Instant code synchronization across all connected clients using Socket.io.
- **Multiple File Support**: Create, rename, delete, and switch between files within a project.
- **Syntax Highlighting**: Powered by CodeMirror with support for 20+ programming languages.
- **Multi-Language Compiler**: Execute code directly in the browser using the JDoodle API.

#### 🛡️ Advanced Security & Admin Controls
- **User Authentication**: Secure JWT-based login and registration system.
- **Waiting Room**: Admins can vet new joiners before granting room access.
- **Admin Dashboard**: Real-time management of participants (Kick, Ban, Promote).
- **Invite Tokens**: Secure sharing via unique invite links with token validation.

#### 📊 Project & Social Features
- **Dashboard**: Track your own projects and projects you've collaborated on.
- **Contributor Profiles**: GitHub-style public profiles showing a user's public contributions and projects.
- **GitHub Integration**: Import entire repositories directly into CodeXAlive.
- **Version History**: Track changes and revert to previous states of your files.

#### 🤖 Intellect AI
- **AI Assistant**: Built-in coding assistant (Gemini) to help debug, explain code, and generate boilerplate.

---

## 🏗️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React (Vite), CodeMirror, TailwindCSS (for modern UI), Socket.io-client, Axios |
| **Backend** | Node.js, Express, Socket.io, MongoDB (Mongoose) |
| **Authentication** | JSON Web Tokens (JWT), Bcrypt.js |
| **Integrations** | JDoodle API (Compiler), Google Gemini AI, GitHub API |
# 📌 CodeXLive — Real-Time Collaborative Code Editor

CodeXLive is a real-time collaborative coding platform built with **React (Vite)**, **Node.js**, **Socket.io**, and the **JDoodle Compiler API**.  
Multiple users can join a room, write code together, and run programs in various languages — all in real time.

---

## 🚀 Features

### 📝 Real-Time Collaborative Editor  
- Multiple users can edit code in the same room  
- Changes sync instantly using **Socket.io**

### 💻 Multi-Language Code Compiler  
Supports languages like:  
`Python3`, `Java`, `C`, `C++`, `NodeJS`, `Go`, `Ruby`, `PHP`, `Swift`, `Rust`, `SQL`, `C#`, `Bash`, and more  
- Execution powered by **JDoodle API**  
- Output displayed in a bottom panel

### 🎨 Light / Dark Mode  
- Switchable CodeMirror themes

### 👥 Active User List  
- Shows all users connected to the same room in real time

### 🔗 Sharable Room IDs  
- Generate unique Room IDs  
- Copy and share easily

---

## 🏗 Tech Stack

### Frontend
- React (Vite)
- CodeMirror 5
- Bootstrap
- React Hot Toast
- Socket.io-client
- Axios

### Backend
- Node.js
- Express
- Socket.io
- Axios (JDoodle API)
- CORS

---

## 📂 Project Structure

```text
CodeXAlive/
├── client/              # Frontend React application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── hooks/       # Custom React hooks (socket, auth, etc.)
│   │   ├── pages/       # Page-level components
│   │   └── services/    # API and socket service layers
├── server/              # Backend Express application
│   ├── controllers/     # Business logic for routes
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API endpoint definitions
│   ├── sockets/         # Socket.io event handlers
│   └── middleware/      # Auth and error handling
```
CodeXLive/
│
├── client/
│ ├── public/
│ ├── src/
│ │ ├── components/
│ │ ├── Actions.js
│ │ ├── Socket.js
│ │ ├── App.jsx
│ │ ├── main.jsx
│ │ ├── index.css
│ ├── vite.config.js
│ └── package.json
│
└── server/
├── Actions.js
├── index.js
├── .env
└── package.json



---

## ⚙️ Installation & Setup

### 1️⃣ Prerequisites
- Node.js (v18 or higher)
- MongoDB (Local or Atlas)
- JDoodle API Credentials
- Google Gemini API Key (optional for AI features)

### 2️⃣ Clone the Repository
```bash
git clone https://github.com/your-username/CodeXAlive.git
cd CodeXAlive
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
```
Run the frontend:
```bash
npm run dev
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
### 1️⃣ Clone the repository

```bash
git clone https://github.com/your-username/CodeXLive.git
cd CodeXLive


#Backend Setup (Server)
cd server
npm install


*Create .env in server/:

PORT=5000
JDOODLE_CLIENT_ID=your_id
JDOODLE_CLIENT_SECRET=your_secret


* Run Server
node index.js

** Server URL
http://localhost:5000


## Frontend Setup (client)
cd client
npm install

** Create .env in client/:
VITE_BACKEND_URL=http://localhost:5000


** Run frontend:
npm run dev

**frontend Url
http://localhost:3000


##Environment Variables Summary
PORT=5000
JDOODLE_CLIENT_ID=
JDOODLE_CLIENT_SECRET=

**Client
VITE_BACKEND_URL=http://localhost:5000
