import express from 'express';
import { body, validationResult } from 'express-validator';
import User, { IUser } from '../models/User';
import Question from '../models/Question';
import TestResult from '../models/TestResult';
import { hashPassword } from '../utils/bcrypt';
import { AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/auth';

const router = express.Router();

// All admin routes require admin role
router.use(requireAdmin);

// Create user
router.post('/users', [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['admin', 'user']).withMessage('Role must be admin or user')
], async (req: AuthRequest, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = new User({
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
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users
router.get('/users', async (req: AuthRequest, res: express.Response) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user
router.put('/users/:id', [
  body('username').optional().trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['admin', 'user']).withMessage('Role must be admin or user'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
], async (req: AuthRequest, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates = req.body;

    // Hash password if provided
    if (updates.password) {
      updates.password = await hashPassword(updates.password);
    }

    const user = await User.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user
router.delete('/users/:id', async (req: AuthRequest, res: express.Response) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Also delete user's test results
    await TestResult.deleteMany({ userId: id });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset user device session
router.post('/users/:id/reset-device', async (req: AuthRequest, res: express.Response) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      { deviceId: null },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Device session reset successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user level access
router.put('/users/:id/level-access', [
  body('level1').optional().isBoolean().withMessage('level1 must be boolean'),
  body('level2').optional().isBoolean().withMessage('level2 must be boolean'),
  body('level3').optional().isBoolean().withMessage('level3 must be boolean')
], async (req: AuthRequest, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { level1, level2, level3 } = req.body;

    const setUpdates: Record<string, boolean> = {};
    if (level1 !== undefined) setUpdates['levelAccess.level1'] = level1;
    if (level2 !== undefined) setUpdates['levelAccess.level2'] = level2;
    if (level3 !== undefined) setUpdates['levelAccess.level3'] = level3;

    if (Object.keys(setUpdates).length === 0) {
      return res.status(400).json({ message: 'No level access updates provided' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: setUpdates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Level access updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get statistics
router.get('/stats', async (req: AuthRequest, res: express.Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const totalTests = await TestResult.countDocuments();
    const averageScore = await TestResult.aggregate([
      { $group: { _id: null, avgScore: { $avg: '$score' } } }
    ]);

    const levelStats = await TestResult.aggregate([
      { $group: { _id: '$level', count: { $sum: 1 }, avgScore: { $avg: '$score' } } }
    ]);

    const recentTests = await TestResult.find()
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
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
