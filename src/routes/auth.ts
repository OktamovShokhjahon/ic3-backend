import express from 'express';
import { body, validationResult } from 'express-validator';
import User, { IUser } from '../models/User';
import { generateToken, generateDeviceId } from '../utils/jwt';
import { comparePassword, hashPassword } from '../utils/bcrypt';
import { AuthRequest, authenticate } from '../middleware/auth';

const router = express.Router();

// Login
router.post('/login', [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, deviceId } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is disabled' });
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check device restriction
    if (user.deviceId && user.deviceId !== deviceId) {
      return res.status(403).json({ message: 'Account is already logged in on another device' });
    }

    // Update device ID
    const newDeviceId = deviceId || generateDeviceId();
    user.deviceId = newDeviceId;
    await user.save();

    // Generate token
    const token = generateToken(user);

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
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Logout
router.post('/logout', authenticate, async (req: AuthRequest, res: express.Response) => {
  try {
    const userId = req.user?._id;
    if (userId) await User.findByIdAndUpdate(userId, { deviceId: null });

    res.clearCookie('token');
    res.json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res: express.Response) => {
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
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
