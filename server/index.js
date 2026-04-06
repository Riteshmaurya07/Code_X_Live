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

const server = http.createServer(app);

// Trust proxy for deployment behind reverse proxies
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Middleware
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: process.env.NODE_ENV === "production" ? process.env.CLIENT_URL : "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

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

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === "production" ? process.env.CLIENT_URL : "*",
    methods: ["GET", "POST"],
  },
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

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  });
}

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
    // Start without DB for development if needed
    server.listen(PORT, () =>
      logger.warn(`Server running on port ${PORT} (without DB)`)
    );
  }
};

startServer();
