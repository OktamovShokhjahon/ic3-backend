import express from "express";
import mongoose from "mongoose";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import path from "path";

import authRoutes from "./routes/auth";
import adminRoutes from "./routes/admin";
import testRoutes from "./routes/tests";
import { authenticate } from "./middleware/auth";
import { swaggerSpec } from "./swagger";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// If you're running behind a reverse proxy (common in production),
// this makes secure cookies and IP-based rate limiting behave correctly.
app.set("trust proxy", 1);

// CORS MUST come before helmet and other middleware
app.use((req, res, next) => {
  console.log("CORS Request from:", req.headers.origin);
  next();
});

// Temporary wildcard CORS for debugging - remove in production!
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-device-id"],
    preflightContinue: false,
    optionsSuccessStatus: 200,
  }),
);

// Handle preflight requests explicitly
app.options(
  "*",
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-device-id"],
  }),
);

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve legacy HTML tests (iSpring exports) as static files
const legacyTestsPath = path.resolve(__dirname, "../..", "tests");
app.use("/tests", express.static(legacyTestsPath));

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/test-platform")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", authenticate, adminRoutes);
app.use("/api/tests", authenticate, testRoutes);
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Basic route
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Test Platform API is running" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
