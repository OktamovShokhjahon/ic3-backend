import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../utils/jwt';
import User, { IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = verifyToken(token) as JWTPayload;
    const user = await User.findById(decoded.userId).select('-password');

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
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin required.' });
  }
  next();
};

export const requireUser = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'user') {
    return res.status(403).json({ message: 'Access denied. User required.' });
  }
  next();
};
