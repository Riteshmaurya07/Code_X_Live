require("dotenv").config();
const express = require("express");
const app = express();
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const cors = require("cors");


const connectDB = require("./config/db");
const { setupSocket } = require("./sockets/socketHandler");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");
const checkEnv = require("./config/checkEnv");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

// Check environment variables before starting
checkEnv();

// Route imports
const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const fileRoutes = require("./routes/fileRoutes");
const aiRoutes = require("./routes/aiRoutes");
const compileRoutes = require("./routes/compileRoutes");
const sharingRoutes = require("./routes/sharingRoutes");
const activityRoutes = require("./routes/activityRoutes");
const formatRoutes = require("./routes/formatRoutes");
const githubRoutes = require("./routes/githubRoutes");
const userRoutes = require("./routes/userRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const meetingRoutes = require("./routes/meetingRoutes");
const messageRoutes = require("./routes/messageRoutes");
const initMeetingCron = require("./utils/meetingCron");

const server = http.createServer(app);

// Trust proxy for deployment behind reverse proxies
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Middleware
app.use(helmet());
app.use(compression());
// Multi-origin CORS support — supports comma-separated CLIENT_URL list
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((u) => u.trim())
  : ["http://localhost:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests (no origin header)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Silently deny — browser will show CORS error, not a 500
      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Explicitly handle preflight for all routes
app.options("*", cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to all requests
app.use(limiter);

// Stricter rate limit for authentication routes
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 login/register attempts per hour
  message: "Too many authentication attempts, please try again after an hour",
});
app.use("/api/auth", authLimiter);

app.use(express.json({ limit: "10mb" }));

// Request logging
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.originalUrl}`);
  next();
});

// Socket.io setup — mirror transports with client (polling first, then upgrade)
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["polling", "websocket"],
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.set("io", io);
setupSocket(io);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/projects", activityRoutes); // Nested under /api/projects/:id/activity
app.use("/api/files", fileRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/sharing", sharingRoutes);
app.use("/api/format", formatRoutes);
app.use("/api/github", githubRoutes);
app.use("/compile", compileRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Initialize Cron Jobs
initMeetingCron();

// Centralized error handler (must be LAST middleware)
app.use(errorHandler);

// Connect to DB, then start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    logger.info("MongoDB connected successfully");
    server.listen(PORT, () =>
      logger.info(`Server running on port ${PORT} (${process.env.NODE_ENV || "development"})`)
    );
  } catch (err) {
    logger.error(`MongoDB connection failed: ${err.message}`);
    if (process.env.NODE_ENV === "production") {
      logger.error("Aborting startup — DB is required in production.");
      process.exit(1);
    }
    server.listen(PORT, () =>
      logger.warn(`Server running on port ${PORT} (without DB — dev only)`)
    );
  }
};

// Graceful shutdown on SIGTERM (e.g. Render, Docker, PM2)
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Closing server gracefully...`);
  server.close(() => {
    logger.info("HTTP server closed.");
    process.exit(0);
  });
  // Force-kill after 15s if connections don't drain
  setTimeout(() => {
    logger.error("Could not close connections in time. Forcing shutdown.");
    process.exit(1);
  }, 15000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT",  () => gracefulShutdown("SIGINT"));

// Catch unhandled promise rejections and log them
process.on("unhandledRejection", (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise} — reason: ${reason}`);
});

process.on("uncaughtException", (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

startServer();
