# 🚀 CodeXLive — The Ultimate Collaborative Coding & Social Hub

[![React 19](https://img.shields.io/badge/Frontend-React%2019-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Vite 7](https://img.shields.io/badge/Bundler-Vite%207-646CFF?style=for-the-badge&logo=vite)](https://vite.dev/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Socket.io](https://img.shields.io/badge/Real--Time-Socket.io%204-black?style=for-the-badge&logo=socket.io)](https://socket.io/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%208-brightgreen?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![WebRTC](https://img.shields.io/badge/Calling-WebRTC%20Mesh-orange?style=for-the-badge&logo=webrtc)](https://webrtc.org/)
[![Gemini](https://img.shields.io/badge/AI-Google%20Gemini-orange?style=for-the-badge&logo=google-gemini)](https://deepmind.google/technologies/gemini/)

**CodeXLive** is a state-of-the-art, feature-complete collaborative IDE and social ecosystem built for modern developers. Combining professional-grade coding tools with a high-performance audio/video calling infrastructure and a developer social network, CodeXLive enables frictionless real-time pair programming, seamless workspace governance, project scheduling, and personal network building.

---

## 📖 Table of Contents

- [✨ Key Features](#-key-features)
- [🏗️ System Architecture](#️-system-architecture)
- [🛠️ Technology Stack](#️-technology-stack)
- [📁 Comprehensive Project Structure](#-comprehensive-project-structure)
- [🧩 Components & Code Architecture](#-components--code-architecture)
- [🗺️ Complete API Endpoint Reference](#️-complete-api-endpoint-reference)
- [🔌 Socket.io Events Protocol](#-socketio-events-protocol)
- [🎨 Premium Design System](#-premium-design-system)
- [🚀 Quick Start & Environment Configuration](#-quick-start--environment-configuration)
- [🛡️ Security & Performance Standards](#️-security--performance-standards)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## ✨ Key Features

### 💻 The Professional Workspace
*   **Operational-Sync Editor (Yjs/CRDT)**: Built on **CodeMirror 6** and powered by **Yjs (CRDT)**. Delivers true conflict-free collaborative editing and latency-free character synchronization across all participants with real-time room cursors and highlighting.
*   **Recursive File Tree**: A robust virtual filesystem in the browser allowing files/folders creation, renaming, deleting, and hierarchical nesting with instant database persistence.
*   **Multilingual Compiler**: Compile and execute code in 20+ programming languages in real time powered by a backend **JDoodle API** integration.
*   **Git-like Version Snapping**: Commit points and snapshots saved directly to the database, allowing users to browse full version histories and restore past codebases in one click.
*   **Prettier Formatting**: Native code formatting built-in using standard Prettier engines to keep cooperative projects clean and uniform.
*   **ZIP Archiving**: Export and download entire projects recursively as a zip archive instantly.

### 📞 WebRTC Group Audio & Video Calling
*   **Full Mesh Topology**: Complete peer-to-peer audio and video streaming powered by **simple-peer**, eliminating the need for expensive SFUs or media servers.
*   **Floating Draggable Panel**: A custom pointer-event-driven overlay panel featuring a live duration timer, participant grids, window minimization, and responsive layouts.
*   **Late Join Support**: Late room entrants can seamlessly connect with active peers and join ongoing video calls automatically.
*   **In-Call Toolbar**: Real-time microphone mute, camera toggle, and immediate call hangup.
*   **Graceful Fallbacks**: Automatically falls back to high-fidelity audio streams if webcam access is blocked or camera hardware is missing.

### 👥 Room Governance & RBAC
*   **Secure API Endpoints**: Centralized, robust HTTP authorization using a custom `checkPermission` middleware that guards AI, Compiler, Project, and File endpoints against unauthorized data access (IDOR).
*   **Strict Data Isolation**: All API actions dynamically verify that the logged-in user possesses valid access to the requested project scope.
*   **Role-Based Access Control (RBAC)**: Support for three distinct user roles inside projects and sockets:
    *   **Owner**: Full access. Can modify project settings, delete the project, manage collaborators, invite/remove users, and access AI/compiler tools.
    *   **Editor**: Can read, write, autosave, and restore file versions, as well as utilize AI and compiler integrations.
    *   **Viewer**: Read-only access. Can view project files and versions, but cannot edit code, autosave, or invoke modifications.
*   **Automated Security Testing**: Integrated comprehensive Jest test suites enforcing the strict RBAC policies and avoiding regression on all project, file, and AI access points.
*   **Secure Waiting Room**: Project owners are notified via Socket.io when a user requests entry, allowing them to approve or decline access dynamically.
*   **Moderation Panel**: Allows project owners to kick, temporarily suspend, or permanently ban participants from collaborative rooms.
*   **Shareable Invitation Tokens**: Generate secure, single-click access URLs or project tokens.

### 📅 Meeting Scheduler
*   **Schedule Team Standups**: Schedule and coordinate developer meetings directly inside the editor sidebar.
*   **RSVPs & Attendance**: View meeting invitees, RSVPs, and track attendance states.
*   **Interactive Notifications**: Get in-app alerts and Socket-based overlays when collaborative meetings are scheduled or edited.

### 💬 Messaging Hub (Direct & General)
*   **General Room Chat**: Persistent group discussion pane for current project participants.
*   **Structured Direct Messaging (DM)**: Features a robust secure request-approval mechanism. A user must approve a DM request before messaging begins.
*   **Persistent Histories**: Message lists and DM threads are fully backed by MongoDB.

### 🌐 Social Developer Hub
*   **GitHub Repository Bridge**: Import public repositories directly into a CodeXLive collaborative workspace via rapid HTTP/API ingestion.
*   **365-Day Activity Heatmap**: Interactive GitHub-style visual contributions panel showing historical collaborator changes and project commits.
*   **Follower/Following Graph**: Dynamic developer networking graphs supporting instant follow activities and live alerts.
*   **Developer Directory**: Global user search interface filtering by unique IDs, emails, or usernames.

### 🧠 Gemini-Powered AI Assistant
*   **AI Code Reviewer**: Highlights security issues, code smells, and performance bottlenecks.
*   **AI Explainer**: Select a block of complex code and receive a conversational walk-through.
*   **AI Bug Fixer**: Detects compile errors or logical bugs and generates drop-in replacements.
*   **Test Suite Generator**: Instantly drafts comprehensive Jest/Mocha test structures.
*   **Free-Form Chat**: Direct playground console using Google's Gemini models.

---

## 🏗️ System Architecture

```mermaid
graph TD
    Client[React 19 Frontend (Y.Doc)] <-->|Socket.io 4 (Yjs Sync)| Server[Node.js/Express Backend (Y.Doc)]
    Client <-->|REST API JSON| Server
    Client <-->|WebRTC P2P mesh| Client2[Other Callers]
    Server <-->|Mongoose ODM (Yjs Snapshot & Updates)| DB[(MongoDB Atlas)]
    Server <-->|OAuth Admin SDK| Firebase[Firebase Auth]
    Server <-->|Compile Sandbox| JDoodle[JDoodle Compiler]
    Server <-->|AI Prompts| Gemini[Google Gemini AI]
    Server <-->|SMTP Relays| Brevo[Brevo Mailer]
    Server <-->|Binary Storage| Cloudinary[Cloudinary CDN]
    Client -.->|STUN Handshakes| GoogleSTUN[Google STUN Services]
```

---

## 🛠️ Technology Stack

| Component | Technologies Used |
| :--- | :--- |
| **Frontend** | React 19, Vite 7, CodeMirror 6, Yjs (y-monaco), Axios, Socket.io-client, simple-peer, Lucide Icons, Vanilla CSS |
| **Backend** | Node.js, Express, Socket.io 4, Mongoose 8, Bcrypt.js, Archiver, Cloudinary Admin SDK |
| **Databases** | MongoDB Atlas (Persistent store), In-Memory JS Maps (Ephemeral cursors, signaling nodes) |
| **Auth** | Firebase Admin SDK (OAuth integration), JWT (Stateless token exchange) |
| **Integrations** | Google Gemini AI SDK, JDoodle Web compiler, Brevo (SMTP Transactional Mailer) |
| **DevOps** | Docker, Docker Compose, Nginx, Vercel, Render |

---

## 📁 Comprehensive Project Structure

Below is an exhaustive breakdown of CodeXLive's dual-tier structure:

```text
CodeXLive/
├── client/                              # React + Vite Frontend App
│   ├── public/                          # Static browser assets (avatars, icons)
│   ├── src/
│   │   ├── components/                  # Reusable UI Blocks & Orchestration Panels
│   │   │   ├── Dashboard/               # Dashboard Layout Components
│   │   │   │   ├── NewProjectForm.jsx   # Project creator modal/card form
│   │   │   │   └── ProjectCard.jsx      # Individual workspace card with settings
│   │   │   ├── Editor/                  # Sidebar panels, status meters, modulators
│   │   │   │   ├── Breadcrumbs.jsx      # Active path indicator inside the editor
│   │   │   │   ├── CommandPalette.jsx   # Quick keyboard shortcut drawer
│   │   │   │   ├── CompilerOutput.jsx   # Standard output terminal window
│   │   │   │   ├── EditorModals.jsx     # Handles creation, delete validation dialogs
│   │   │   │   ├── EditorSidebar.jsx    # Left navigation tabs (Files, Chat, AI, Meeting)
│   │   │   │   ├── EditorToolbar.jsx    # Top toolbar controlling runs, video call initiation
│   │   │   │   ├── InviteParticipantsModal.jsx # Invites developers inside workspaces
│   │   │   │   ├── MeetingDetailsModal.jsx  # Viewing specific calendar items
│   │   │   │   ├── MeetingModal.jsx     # Meeting scheduler orchestrator
│   │   │   │   ├── MeetingPanel.jsx     # Meeting items sidebar drawer
│   │   │   │   ├── MembersList.jsx      # List active online room participants
│   │   │   │   ├── ParticipantPicker.jsx # User search selector for invitations
│   │   │   │   ├── PendingRequests.jsx  # Access waitlist manager for room host
│   │   │   │   ├── ProblemsPanel.jsx    # Lints and highlights code syntax issues
│   │   │   │   └── StatusBar.jsx        # Bottom bar tracking connection and file changes
│   │   │   ├── Landing/                 # Landing Page Visual Sections
│   │   │   │   ├── ActionCards.jsx      # Features visual widgets
│   │   │   │   ├── FeatureGrid.jsx      # Dynamic showcase grid
│   │   │   │   ├── HeroSection.jsx      # Glassmorphic marketing headline area
│   │   │   │   └── HowItWorks.jsx       # Illustrated procedural usage guides
│   │   │   ├── layout/                  # Main layout frames
│   │   │   │   ├── AuthLayout.jsx       # Wraps login/register pages
│   │   │   │   ├── DirectMessaging.jsx  # DM tray with user lists and DM boxes
│   │   │   │   ├── Footer.jsx           # Global sticky footer block
│   │   │   │   ├── Navbar.jsx           # Nav system with dropdowns, alerts and search
│   │   │   │   └── NotificationDropdown.jsx # Real-time notification menu drawer
│   │   │   ├── profile/                 # Profile and contribution metrics
│   │   │   │   ├── ActivityDashboard.jsx# Social feed overview
│   │   │   │   ├── ActivityHeatmap.jsx  # 365-day SVG matrix mapping contributions
│   │   │   │   ├── ProfileStats.jsx     # Followers count, projects count, rating indexes
│   │   │   │   ├── RecentActivity.jsx   # Linear timeline of user actions
│   │   │   │   ├── SuggestedActions.jsx # Contextual profile recommendations
│   │   │   │   └── UserListModal.jsx    # Lists followers and followings
│   │   │   ├── ui/                      # Styled basic components
│   │   │   │   ├── Badge.jsx            # Premium status badges
│   │   │   │   ├── Button.jsx           # Reusable hover-animated button
│   │   │   │   ├── Input.jsx            # Focus-glow standard inputs
│   │   │   │   ├── Logo.jsx             # SVG vector logo emblem
│   │   │   │   ├── Modal.jsx            # Portal-driven backdrop-closing modal
│   │   │   │   ├── Select.jsx           # Styled custom dropdown selection list
│   │   │   │   └── Textarea.jsx         # Auto-growing text input field
│   │   │   ├── video/                   # Full-mesh call panels
│   │   │   │   ├── CallPanel.jsx        # Draggable audio/video overlay panel
│   │   │   │   ├── IncomingCallModal.jsx# Ringing overlay with accept/decline buttons
│   │   │   │   └── ParticipantTile.jsx  # Individual user streams & indicators
│   │   │   ├── AIPanel.jsx              # Controls for the Gemini developer prompts
│   │   │   ├── ChatPanel.jsx            # Unified real-time room chat component
│   │   │   ├── Client.jsx               # Mini participant status widget
│   │   │   ├── Editor.jsx               # CodeMirror 6 editor engine core
│   │   │   ├── EditorPage.jsx           # Top workspace state orchestrator page
│   │   │   ├── FileExplorer.jsx         # Visual directory drawer with CRUD options
│   │   │   ├── ShareModal.jsx           # Link manager, share token regenerator
│   │   │   └── VersionHistory.jsx       # Snapshots inspector sidebar drawer
│   │   ├── hooks/                       # Custom functional hooks
│   │   │   ├── editor/                  # Dedicated editor routines
│   │   │   │   ├── useFileTree.js       # Directory structures mapper and manipulator
│   │   │   │   └── useRoomSocket.js     # Manages specific socket bindings per room
│   │   │   ├── useAuth.jsx              # Global authentication contextual provider
│   │   │   ├── useDM.jsx                # Direct message sync hooks
│   │   │   ├── useGlobalSocket.jsx      # App-wide notification-based socket connection
│   │   │   ├── useTheme.jsx             # Color-palette dynamic switcher
│   │   │   └── useWebRTC.js             # High-level full mesh peer connections builder
│   │   ├── pages/                       # Screen routes of the application
│   │   │   ├── Dashboard.jsx            # User workspace hub
│   │   │   ├── ForgotPassword.jsx       # Password request form
│   │   │   ├── LandingPage.jsx          # Public showcase site
│   │   │   ├── Login.jsx                # Log-in portal (Credentials / Firebase OAuth)
│   │   │   ├── PublicProfile.jsx        # Public social profile hub
│   │   │   ├── Register.jsx             # Member signup page
│   │   │   └── ResetPassword.jsx        # New password entry route
│   │   ├── services/                    # Axios clients & API request definitions
│   │   ├── styles/                      # Specific raw CSS modules
│   │   ├── utils/                       # Frontend helpers
│   │   │   └── Actions.js               # Shared Socket action structures
│   │   ├── App.jsx                      # App root router
│   │   └── index.css                    # Design system variables, Tailwind layers
│   └── vite.config.js                   # Development proxy config, server setups
│
└── server/                              # Node.js + Express Backend App
    ├── config/                          # DB, Firebase, Cloudinary Initializations
    ├── controllers/                     # Ingestion models and API routing logic
    │   ├── activityController.js        # Records activity, serves developer timeline
    │   ├── aiController.js              # Forwards specialized tasks to Gemini AI API
    │   ├── authController.js            # Registration, logins, password reset routines
    │   ├── compileController.js         # Direct proxies to JDoodle compilation API
    │   ├── downloadController.js        # Packages workspace folders into downloadable ZIPs
    │   ├── fileController.js            # CRUD and Version restoration operations
    │   ├── formatController.js          # Invokes server-side formatting
    │   ├── githubController.js          # Ingests and formats code repositories
    │   ├── meetingController.js         # Schedules, updates, invites workspace meetings
    │   ├── messageController.js         # Direct messaging state & request database hooks
    │   ├── notificationController.js    # Dispatches live alerts database-wide
    │   ├── projectController.js         # Project-specific metadata CRUD operations
    │   ├── sharingController.js         # Shared links and collaboration invitation links
    │   └── userController.js            # Profiles, followers list, avatars
    ├── middleware/                      # HTTP request filters
    │   ├── auth.js                      # Authenticates stateless JWT Headers
    │   └── rateLimiter.js               # Protects APIs from aggressive request rates
    ├── models/                          # Mongoose Database Models
    │   ├── ActivityLog.js               # Tracks collaborator commits/modifications
    │   ├── File.js                      # Stores file paths, text contents and languages
    │   ├── Follow.js                    # Maps follower-following connections
    │   ├── Invitation.js                # Pending join requests per project
    │   ├── Meeting.js                   # Date, schedules, RSVPs of developer meetings
    │   ├── Message.js                   # Persistent direct and room discussions
    │   ├── Notification.js              # Read/unread notices for developers
    │   ├── Project.js                   # Project scopes, workspace security, share tokens
    │   ├── Session.js                   # Active user token tracking
    │   ├── User.js                      # Profiles, security keys, linked auth providers
    │   └── Version.js                   # Direct database snapshots of individual files
    ├── routes/                          # Express REST API endpoints
    ├── sockets/                         # Real-time state layers
    │   ├── handlers/                    # Modular event processors
    │   │   ├── chatHandlers.js          # Forwards messages (room, DMs, global chats)
    │   │   ├── codeHandlers.js          # Manages workspace edits, file synching, cursors
    │   │   ├── disconnectHandlers.js    # Cleans up maps, triggers leader switches
    │   │   ├── permissionHandlers.js    # Syncs read/write rights dynamically
    │   │   ├── roomHandlers.js          # Join validations, waiting queues, lock control
    │   │   └── videoHandlers.js         # WebRTC mesh signaling broker
    │   ├── roomState.js                 # Memory maps storing live room attributes
    │   └── socketHandler.js             # General entry socket initializer & JWT validator
    ├── utils/                           # Backend SMTP, AI templates, compilers helpers
    ├── Actions.js                       # Backend shared Socket event identifiers
    ├── index.js                         # Application bootstrapper
    └── package.json                     # Backend node manifest
```

---

## 🧩 Components & Code Architecture

### React Core Orchestration: `EditorPage.jsx` & `Editor.jsx`
`EditorPage.jsx` behaves as the primary orchestrator, maintaining a centralized file selection context, participant trackers, compilation state, calls overlay states, and permissions statuses.
*   **WebRTC Integration**: Instantiates `useWebRTC.js` targeting the assigned Room ID, binding local media streams and creating meshes directly.
*   **Socket Hub**: Sets up the CodeMirror syncing triggers, passing operations to the socket loop inside `useRoomSocket.js`.
*   **State Hooks**: Connects with `useFileTree.js` to render the workspace file hierarchy under a custom stateful memory tree.

### WebRTC Connection Builder: `useWebRTC.js`
Utilizes **simple-peer** to build a dynamic Full Mesh. Unlike standard client calling implementations, this hook handles late joining gracefully:
1.  On call entry, it requests the current caller list via `JOIN_CALL`.
2.  For each active client returned, the hook creates a `Peer` instance acting as an *Initiator*, forwarding local media tracks.
3.  For new entrants joining later, it listens for `PARTICIPANT_JOINED_CALL` and instantiates a non-initiating `Peer` waiting for an incoming offer.
4.  Provides customizable bandwidth configurations and toggle state syncing.

---

## 🗺️ Complete API Endpoint Reference

All endpoints (except basic Auth routes) require a stateless JWT bearer header: `Authorization: Bearer <your_token>`.

### 🔐 Authentication (`/api/auth`)
*   `POST /register`: Registers a new local account.
    *   *Payload*: `{ username, email, password, fullName }`
*   `POST /login`: Validates local credentials, returning a JWT token.
    *   *Payload*: `{ email, password }`
*   `POST /firebase`: Signs in/registers a user authenticating via Google/GitHub Firebase OAuth.
    *   *Payload*: `{ idToken, username, email, fullName, avatar }`
*   `POST /forgot-password`: Emails a secure password reset token using Brevo SMTP.
    *   *Payload*: `{ email }`
*   `POST /reset-password/:token`: Restores credentials using a valid token.
    *   *Payload*: `{ password }`
*   `GET /profile`: Returns detailed profiles of the authenticated requester.

### 📁 Projects & Binary Exports (`/api/projects`)
*   `POST /`: Creates a blank project workspace.
    *   *Payload*: `{ name, language, isPublic }`
*   `GET /`: Fetches projects owned or collaborated on by the requester.
*   `GET /:id`: Retrieves detailed project configuration, collaborator roles, and file listings.
*   `PUT /:id`: Modifies workspace properties (name, privacy, default language).
*   `DELETE /:id`: Destroys the workspace and all children database files/versions.
*   `GET /:id/download`: Compiles project directories recursively, piping a binary ZIP file output to the requester.

### 📄 File Operations & Snapping (`/api/files`)
*   `POST /:projectId`: Creates a file database entry.
    *   *Payload*: `{ name, path, language, content }`
*   `GET /:id`: Fetches content, language, and paths of a specific file.
*   `PUT /:id`: Saves immediate updates to a file's body text.
    *   *Payload*: `{ content }`
*   `POST /autosave`: Performs high-frequency debounced autosaves without updating versions.
    *   *Payload*: `{ fileId, content }`
*   `GET /:id/versions`: Lists historical snapshots/commits created for the target file.
*   `POST /versions/:versionId/restore`: Reverts a file's active body text to a specific snapshot's content.
*   `DELETE /:id`: Removes a file from the repository structure.

### 🤝 Access Control & Invitations (`/api/sharing`)
*   `GET /invitations/my`: Fetches outstanding workspace requests sent to the user.
*   `POST /invitations/:invitationId/accept`: Joins a workspace as an approved collaborator.
*   `POST /invitations/:invitationId/decline`: Declines and deletes an entry request.
*   `POST /:projectId/invite`: Sends a collaboration invitation to another registered developer.
    *   *Payload*: `{ inviteeId, role }` (role: `"editor"` | `"viewer"`)
*   `DELETE /:projectId/collaborator/:userId`: Removes access privileges from a workspace.
*   `POST /:projectId/share-link`: Dynamically generates a secure token-based join URL.
*   `POST /join/:token`: Allows dynamic entrance into public or invitation-based private projects.
*   `GET /:projectId/collaborators`: Lists all users having access to the project and their permissions.
*   `GET /:projectId/invitations`: Lists all pending outgoing invitations for the project.

### 📅 Meeting Scheduler (`/api/meetings`)
*   `POST /`: Schedules a developer meeting event.
    *   *Payload*: `{ title, description, projectId, scheduledTime, duration, invitees }`
*   `GET /project/:projectId`: Lists all meetings scheduled for a project.
*   `GET /:id`: Retrieves granular meeting structures and RSVP states.
*   `PUT /:id`: Updates meeting schedules and attributes.
*   `PATCH /:id/invite`: Appends new participants to an existing meeting calendar.
    *   *Payload*: `{ invitees }`
*   `PATCH /:id/status`: Updates individual attendee RSVPs (accepted, declined, tentative).
    *   *Payload*: `{ status }`
*   `DELETE /:id`: Cancels the meeting and alerts invitees.

### 👥 User Graph & Profiles (`/api/users`)
*   `GET /:username/profile`: Fetches detailed public developer profiles, networking metrics, and follow states.
*   `POST /:id/follow`: Follows a user profile. Triggers system-wide notifications.
*   `POST /:id/unfollow`: Removes a user from follow lists.
*   `GET /search`: Performs global queries matching username/email fragments.
*   `GET /:username/followers`: Lists followers of a user.
*   `GET /:username/following`: Lists accounts followed by a user.
*   `PATCH /me/profile`: Edits bios, fullNames, and linked social profiles.
*   `POST /me/avatar`: Uploads and formats profile pictures using the Cloudinary CDN.

### 💬 Direct Messaging Hub (`/api/messages`)
*   `GET /conversations`: Lists active direct messaging dialog channels, divided by requests and active threads.
*   `GET /:userId`: Pulls complete 1-on-1 messaging history.
*   `POST /approve/:userId`: Approves an incoming DM request, unlocking full dialog access.
*   `POST /decline/:userId`: Declines a DM request, hiding/deleting outstanding dialogs.

### 📊 System Dashboard Logs (`/api/activities`)
*   `GET /:id/activity`: Gathers audit logs for a project (creates, updates, syncs).
*   `GET /:username/activity-dashboard`: Resolves 365-day metric matrices for contribution heatmaps.

### 🤖 Gemini Copilot Services (`/api/ai`)
*   `POST /review`: Directs Gemini to perform full syntax linting, security audits, and complexity reviews.
    *   *Payload*: `{ code, filename }`
*   `POST /explain`: Gathers educational walkthroughs for selected blocks.
    *   *Payload*: `{ code }`
*   `POST /fix`: Repairs syntax or runtime issues.
    *   *Payload*: `{ code, error }`
*   `POST /tests`: Drafts standardized mock unit test collections.
    *   *Payload*: `{ code, framework }`
*   `POST /chat`: General AI conversation playground.
    *   *Payload*: `{ prompt, context }`
*   `POST /autocomplete`: Light-touch line completion models.
    *   *Payload*: `{ codeBefore, codeAfter }`

### 💻 Code Compilation & Execution (`/api/compile` & `/api/format`)
*   `POST /api/compile`: Submits code payloads to JDoodle compilers, returning stdout/stderr.
    *   *Payload*: `{ code, language, input }`
*   `POST /api/format`: Processes server-side code formatting with Prettier formatting guidelines.
    *   *Payload*: `{ code, language }`

---

## 🔌 Socket.io Events Protocol

### 🏠 Workspace & Room Events
*   `ACTIONS.CREATE_ROOM` (Client -> Server): Request creation of a live room context.
    *   *Payload*: `{ projectId }`
*   `ACTIONS.JOIN` (Client -> Server): Request connection to an active workspace.
    *   *Payload*: `{ roomId, username }`
*   `ACTIONS.JOINED` (Server -> Client): Fired to all members when a user joins, sharing updated participant listings.
    *   *Payload*: `{ clients, username, socketId }`
*   `ACTIONS.DISCONNECTED` (Server -> Client): Broadcasts that a participant has disconnected, showing remaining user metrics.
*   `ACTIONS.KICK_USER` (Client -> Server): Fired by moderators to forcibly disconnect a target socket.
*   `ACTIONS.KICKED` (Server -> Client): Fired directly to targeted users, forcing client-side disconnection.
*   `ACTIONS.ROOM_BANNED` (Server -> Client): Issued to banned users trying to reconnect.
*   `ACTIONS.WAIT_FOR_APPROVAL` (Server -> Client): Informs entry requests they are queued in the lobby.

### 📝 Real-Time Code Syncing
*   `ACTIONS.CODE_CHANGE` (Client -> Server -> Client): Synchronizes cursor keystrokes, character changes, or operations.
    *   *Payload*: `{ roomId, fileId, changeRanges, value }`
*   `ACTIONS.SYNC_CODE` (Client -> Server -> Client): Pulls complete file content states to synchronize late room joiners.
    *   *Payload*: `{ socketId, code }`
*   `ACTIONS.FILE_CREATED` / `ACTIONS.FILE_DELETED` / `ACTIONS.FILE_RENAMED` (Client -> Server -> Client): Automatically triggers file-tree state syncs for all active clients in the room.

### 📞 WebRTC Signaling Relay
*   `ACTIONS.CALL_INITIATE` (Client -> Server): Initiates a group video or audio call in the workspace.
    *   *Payload*: `{ roomId, callType }`
*   `ACTIONS.INCOMING_CALL` (Server -> Client): Rings active room participants with dynamic overlay dialog panels.
    *   *Payload*: `{ from, username, callType }`
*   `ACTIONS.CALL_ANSWER` (Client -> Server -> Client): Relays whether a ringing invitation was accepted or declined.
*   `ACTIONS.JOIN_CALL` (Client -> Server): Dispatched by late callers requesting immediate access to active WebRTC grids.
*   `ACTIONS.WEBRTC_OFFER` / `ACTIONS.WEBRTC_ANSWER` / `ACTIONS.WEBRTC_ICE_CANDIDATE` (Client -> Server -> Client): Standard WebRTC signaling broker routing SDP templates between peers.
*   `ACTIONS.TOGGLE_MEDIA` (Client -> Server -> Client): Informs peers when a user disables/enables webcams or mutes microphones.

---

## 🎨 Premium Design System

CodeXLive uses a highly polished Dark Theme design tailored for a modern developer's aesthetic.

### 🎨 Color Palette
*   **Primary Background**: `#0F1115` (Deep charcoal dark theme)
*   **Secondary Background**: `#1A1D24` (Muted surface panels)
*   **Surface Cards & Modals**: `#22262F` (High contrast containers)
*   **Border Dividers**: `#2E3440` (Sleek, low opacity outline borders)
*   **Primary Accent**: `#00D084` (Vibrant tech green)
*   **Primary Accent Hover**: `#00B574` (Deeper emerald green)
*   **Accent Soft BG**: `rgba(0, 208, 132, 0.1)` (Subtle selection glowing tints)
*   **Primary Text**: `#E6EAF0` (Bright white-gray high readability text)
*   **Secondary Text**: `#A0A8B5` (Muted text elements)
*   **Status Colors**:
    *   *Success*: `#22C55E`
    *   *Error*: `#EF4444`
    *   *Warning*: `#F59E0B`
    *   *Info*: `#3B82F6`

### 📐 Spacing & Typography
*   **Typography**: *Inter* and *Poppins* font families. Line height: `1.4–1.6` for optimal readability.
*   **Spacing Grid**: Standard `8px` spacing grid rules (`4px` micro-paddings, `8px` tight-spaces, `16px` defaults, `24px` layout gaps).
*   **Depth & Shadows**: Subtle borders (`1px solid #2E3440`) combined with extremely soft blur shadows replace harsh flat elements to deliver depth.

---

## 🚀 Quick Start & Environment Configuration

### Prerequisites
*   **Node.js**: v18.0.0 or higher
*   **Database**: MongoDB Atlas account or a locally running instance
*   **Firebase**: Firebase account (Firebase Admin SDK Credentials for Social Sign-In)
*   **CDN Storage**: Cloudinary account for file upload processes
*   **Optional Keys**: Gemini API Key, Brevo SMTP credentials, JDoodle API Credentials

### 1. Repository Setup & Installations
```bash
# Clone the repository
git clone https://github.com/Riteshmaurya07/Code_X_Live.git
cd Code_X_Live

# Install Server Dependencies
cd server
npm install

# Install Client Dependencies
cd ../client
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root of both `/server` and `/client` using these templates:

#### 💻 Server Environment (`/server/.env`)
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/codexlive
JWT_SECRET=your_super_secret_jwt_key_here

# Firebase Admin configuration (JSON payload or individual credentials)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-firebase-admin-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Compiler Integration - JDoodle API (https://www.jdoodle.com/compiler-api/)
JDOODLE_CLIENT_ID=your_jdoodle_client_id
JDOODLE_CLIENT_SECRET=your_jdoodle_client_secret

# AI Copilot Integration - Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# SMTP Integration - Brevo Credentials (https://www.brevo.com/)
SMTP_API_KEY=your_brevo_smtp_api_key_here
SMTP_FROM_EMAIL=noreply@codexlive.com

# CDN Integration - Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# CORS Configuration
CLIENT_URL=http://localhost:5173
```

#### 🖥️ Client Environment (`/client/.env`)
```env
VITE_BACKEND_URL=http://localhost:5000

# Firebase Client SDK Configuration (Social Login)
VITE_FIREBASE_API_KEY=your_firebase_client_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Local Run Commands

#### Start the Server
From the `/server` directory:
```bash
npm run dev
```

#### Start the Client
From the `/client` directory:
```bash
npm run dev
```
The client app will launch at `http://localhost:5173`.

### 🐳 Docker & Containerization

Run the entire stack instantly using Docker:
```bash
# Launch both containers
docker-compose up --build
```
This launches a backend server mapped to `http://localhost:5000` and a Vite web frontend bound to `http://localhost:5173`, with an Nginx reverse proxy routing requests seamlessly.

---

## 🛡️ Security & Performance Standards

*   **Endpoint Shielding**: Secure **Helmet.js** middleware implements Content Security Policies (CSP), prevents DNS prefetching, and shields against clickjacking.
*   **EPID Rate Limiter**: Heavy endpoints (AI analysis, compilation sandboxes) are rate-limited per IP using Express rate limit algorithms.
*   **JWT Handshake Validation**: Live WebSockets enforce JWT verification *during handshakes*. Connected sockets that fail auth are rejected before gaining access.
*   **Media Privacy**: Audio and video mesh systems stream purely **peer-to-peer**. Media data never passes through or gets stored on the server.
*   **Optimized Payload Processing**: Gzip compression is enabled globally, reducing REST payload sizes by up to 70%.

---

## 🤝 Contributing

Contributions are what make the open-source community an incredible place to learn, inspire, and create. Any contributions are **warmly appreciated**.

1.  **Fork** the project.
2.  Create your **Feature Branch**: `git checkout -b feature/AmazingFeature`.
3.  **Commit** your changes: `git commit -m 'Add some AmazingFeature'`.
4.  **Push** to the branch: `git push origin feature/AmazingFeature`.
5.  Open a **Pull Request** detailing your modifications.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
