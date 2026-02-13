"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const path_1 = __importDefault(require("path"));
const auth_1 = __importDefault(require("./routes/auth"));
const admin_1 = __importDefault(require("./routes/admin"));
const tests_1 = __importDefault(require("./routes/tests"));
const auth_2 = require("./middleware/auth");
const swagger_1 = require("./swagger");
dotenv_1.default.config();
const app = (0, express_1.default)();
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
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-device-id"],
    preflightContinue: false,
    optionsSuccessStatus: 200,
}));
// Handle preflight requests explicitly
app.options("*", (0, cors_1.default)({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-device-id"],
}));
// Security middleware
app.use((0, helmet_1.default)());
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);
// Body parsing middleware
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// Serve legacy HTML tests (iSpring exports) as static files
const legacyTestsPath = path_1.default.resolve(__dirname, "../..", "tests");
app.use("/tests", express_1.default.static(legacyTestsPath));
// MongoDB connection
mongoose_1.default
    .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/test-platform")
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));
// Routes
app.use("/api/auth", auth_1.default);
app.use("/api/admin", auth_2.authenticate, admin_1.default);
app.use("/api/tests", auth_2.authenticate, tests_1.default);
app.use("/api/docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec));
// Basic route
app.get("/api/health", (req, res) => {
    res.json({ status: "OK", message: "Test Platform API is running" });
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map