"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireUser = exports.requireAdmin = exports.authenticate = void 0;
const jwt_1 = require("../utils/jwt");
const User_1 = __importDefault(require("../models/User"));
const authenticate = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ message: 'Access denied. No token provided.' });
        }
        const decoded = (0, jwt_1.verifyToken)(token);
        const user = await User_1.default.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(401).json({ message: 'Invalid token.' });
        }
        if (!user.isActive) {
            return res.status(401).json({ message: 'Account is disabled.' });
        }
        // Enforce single-device session by requiring the client to send its deviceId
        // with every request. Without this, a stolen cookie could be replayed elsewhere.
        const deviceIdHeader = req.header('x-device-id');
        if (user.deviceId) {
            if (!deviceIdHeader) {
                return res.status(403).json({ message: 'Device verification required.' });
            }
            if (deviceIdHeader !== user.deviceId) {
                return res.status(403).json({ message: 'Account is already logged in on another device.' });
            }
        }
        req.user = user;
        next();
    }
    catch (error) {
        return res.status(401).json({ message: 'Invalid token.' });
    }
};
exports.authenticate = authenticate;
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin required.' });
    }
    next();
};
exports.requireAdmin = requireAdmin;
const requireUser = (req, res, next) => {
    if (!req.user || req.user.role !== 'user') {
        return res.status(403).json({ message: 'Access denied. User required.' });
    }
    next();
};
exports.requireUser = requireUser;
//# sourceMappingURL=auth.js.map