"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const User_1 = __importDefault(require("../models/User"));
const jwt_1 = require("../utils/jwt");
const bcrypt_1 = require("../utils/bcrypt");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Login
router.post('/login', [
    (0, express_validator_1.body)('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { username, password, deviceId } = req.body;
        const user = await User_1.default.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        if (!user.isActive) {
            return res.status(401).json({ message: 'Account is disabled' });
        }
        const isPasswordValid = await (0, bcrypt_1.comparePassword)(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        // Check device restriction
        if (user.deviceId && user.deviceId !== deviceId) {
            return res.status(403).json({ message: 'Account is already logged in on another device' });
        }
        // Update device ID
        const newDeviceId = deviceId || (0, jwt_1.generateDeviceId)();
        user.deviceId = newDeviceId;
        await user.save();
        // Generate token
        const token = (0, jwt_1.generateToken)(user);
        // Set HTTP-only cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            // In production, cross-site setups often require SameSite=None + Secure.
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        res.json({
            message: 'Login successful',
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
                levelAccess: user.levelAccess,
                passportFullName: user.passportFullName,
                passportNumber: user.passportNumber
            },
            deviceId: newDeviceId
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// Logout
router.post('/logout', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?._id;
        if (userId)
            await User_1.default.findByIdAndUpdate(userId, { deviceId: null });
        res.clearCookie('token');
        res.json({ message: 'Logout successful' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// Get current user
router.get('/me', auth_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ message: 'Invalid token' });
        }
        res.json({
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
                levelAccess: user.levelAccess,
                passportFullName: user.passportFullName,
                passportNumber: user.passportNumber
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map