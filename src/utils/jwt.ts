import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import { IUser } from '../models/User';

const JWT_SECRET: Secret = process.env.JWT_SECRET ?? 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN: NonNullable<SignOptions['expiresIn']> = (process.env.JWT_EXPIRES_IN ?? '7d') as NonNullable<
  SignOptions['expiresIn']
>;

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
}

export const generateToken = (user: IUser): string => {
  const payload: JWTPayload = {
    userId: user._id.toString(),
    username: user.username,
    role: user.role
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
};

export const generateDeviceId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};
