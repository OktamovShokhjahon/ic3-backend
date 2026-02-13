"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const User_1 = __importDefault(require("../models/User"));
const TestResult_1 = __importDefault(require("../models/TestResult"));
const bcrypt_1 = require("../utils/bcrypt");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// All admin routes require admin role
router.use(auth_1.requireAdmin);
// Create user
router.post('/users', [
    (0, express_validator_1.body)('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    (0, express_validator_1.body)('role').isIn(['admin', 'user']).withMessage('Role must be admin or user')
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { username, password, role } = req.body;
        // Check if user already exists
        const existingUser = await User_1.default.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }
        // Hash password
        const hashedPassword = await (0, bcrypt_1.hashPassword)(password);
        // Create user
        const user = new User_1.default({
            username,
            password: hashedPassword,
            role
        });
        await user.save();
        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
                isActive: user.isActive,
                levelAccess: user.levelAccess
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// Get all users
router.get('/users', async (req, res) => {
    try {
        const users = await User_1.default.find().select('-password').sort({ createdAt: -1 });
        res.json({ users });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// Update user
router.put('/users/:id', [
    (0, express_validator_1.body)('username').optional().trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    (0, express_validator_1.body)('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    (0, express_validator_1.body)('role').optional().isIn(['admin', 'user']).withMessage('Role must be admin or user'),
    (0, express_validator_1.body)('isActive').optional().isBoolean().withMessage('isActive must be boolean')
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { id } = req.params;
        const updates = req.body;
        // Hash password if provided
        if (updates.password) {
            updates.password = await (0, bcrypt_1.hashPassword)(updates.password);
        }
        const user = await User_1.default.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({
            message: 'User updated successfully',
            user
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// Delete user
router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User_1.default.findByIdAndDelete(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Also delete user's test results
        await TestResult_1.default.deleteMany({ userId: id });
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// Reset user device session
router.post('/users/:id/reset-device', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User_1.default.findByIdAndUpdate(id, { deviceId: null }, { new: true }).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({
            message: 'Device session reset successfully',
            user
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// Update user level access
router.put('/users/:id/level-access', [
    (0, express_validator_1.body)('level1').optional().isBoolean().withMessage('level1 must be boolean'),
    (0, express_validator_1.body)('level2').optional().isBoolean().withMessage('level2 must be boolean'),
    (0, express_validator_1.body)('level3').optional().isBoolean().withMessage('level3 must be boolean')
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { id } = req.params;
        const { level1, level2, level3 } = req.body;
        const setUpdates = {};
        if (level1 !== undefined)
            setUpdates['levelAccess.level1'] = level1;
        if (level2 !== undefined)
            setUpdates['levelAccess.level2'] = level2;
        if (level3 !== undefined)
            setUpdates['levelAccess.level3'] = level3;
        if (Object.keys(setUpdates).length === 0) {
            return res.status(400).json({ message: 'No level access updates provided' });
        }
        const user = await User_1.default.findByIdAndUpdate(id, { $set: setUpdates }, { new: true, runValidators: true }).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({
            message: 'Level access updated successfully',
            user
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// Get statistics
router.get('/stats', async (req, res) => {
    try {
        const totalUsers = await User_1.default.countDocuments();
        const activeUsers = await User_1.default.countDocuments({ isActive: true });
        const totalTests = await TestResult_1.default.countDocuments();
        const averageScore = await TestResult_1.default.aggregate([
            { $group: { _id: null, avgScore: { $avg: '$score' } } }
        ]);
        const levelStats = await TestResult_1.default.aggregate([
            { $group: { _id: '$level', count: { $sum: 1 }, avgScore: { $avg: '$score' } } }
        ]);
        const recentTests = await TestResult_1.default.find()
            .populate('userId', 'username')
            .sort({ createdAt: -1 })
            .limit(10);
        res.json({
            totalUsers,
            activeUsers,
            totalTests,
            averageScore: averageScore[0]?.avgScore || 0,
            levelStats,
            recentTests
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map