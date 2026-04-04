# ⚙️ CodeXAlive — Backend Express Core

The CodeXAlive backend is a robust Node.js and Socket.io server that handles real-time collaboration, project management, and user authentication.

---

## 🛠️ Core Modules

### 🔐 User Authentication (JWT)
- **Safe Authentication**: JSON Web Tokens for secure session management.
- **Bcrypt Hash**: Secure password storage in MongoDB.
- **Access Control**: Protected API endpoints for project and profile management.

### 🔌 Real-Time Socket.io Handler
- **Live Sync**: Event-driven architecture for code updates and cursor tracking.
- **Admin Control Flow**: Handle participant permissions (Kick, Ban, Rejoin).
- **In-Memory State Map**: Efficient tracking of active rooms and administrators.
- **Waiting Room Logic**: Intercept join attempts for non-contributors to trigger the approval workflow.

### 📝 Project Management
- **CRUD Operations**: Create, Read, Update, and Delete projects with Mongoose models.
- **Visibility Toggles**: Switch projects between Public and Private status.
- **GitHub Integration**: Direct imports from the GitHub API into backend storage.
- **Activity Logging**: Track project changes and file histories.

### 💻 Code Compiler & AI
- **JDoodle Integration**: Secure API proxy for code execution.
- **Gemini AI Controller**: AI-powered assistant for coding help and debugging.

---

## 🚀 Getting Started

### 1️⃣ Install Dependencies
```bash
npm install
```

### 2️⃣ Configure Environment
Create a `.env` file in the root of the `server` directory:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JDOODLE_CLIENT_ID=your_jdoodle_id
JDOODLE_CLIENT_SECRET=your_jdoodle_secret
GEMINI_API_KEY=your_gemini_key
```

### 3️⃣ Development Server
```bash
npm run dev
```

---

## 🏗️ Folder Structure

- `/controllers`: Logic for processing requests and interaction with databases.
- `/models`: Mongoose schemas (User, Project, File, Version, etc.).
- `/routes`: Definition of all API endpoints.
- `/sockets`: Event listeners and broadcasters for collaborative coding.
- `/middleware`: Reusable logic for auth verification and error handling.
- `/utils`: Utility functions, including logging and encryption.
- `index.js`: Main entry point for the Express and Socket.io server.

---

## 🧩 Key Libraries
- **Express**: Node.js web application framework.
- **Socket.io**: real-time bi-directional communication.
- **Mongoose**: Clean schemas for MongoDB interaction.
- **JSON Web Token**: Secure identity and access management.
- **Bcryptjs**: Password hashing library.
- **Dotenv**: Environment variable loader.
