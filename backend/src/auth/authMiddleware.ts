import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticationError } from '../utils/errorHandler';
import { logger } from '../utils/logger';

const log = logger.child('AuthMiddleware');

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * JWT authentication middleware.
 * Extracts and verifies the Bearer token from the Authorization header.
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('Missing or invalid authorization header');
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    throw new AuthenticationError('Token not provided');
  }

  try {
    const secret = process.env.JWT_SECRET || 'default-dev-secret';
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err: unknown) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Token has expired');
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid token');
    }
    throw new AuthenticationError('Authentication failed');
  }
}

/**
 * Optional auth middleware — attaches user if token present but doesn't require it.
 */
export function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    next();
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || 'default-dev-secret';
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded;
  } catch {
    log.debug('Optional auth: invalid token, continuing without user');
  }

  next();
}

/**
 * Generates a JWT access token.
 */
export function generateAccessToken(payload: { userId: string; email: string }): string {
  const secret = process.env.JWT_SECRET || 'default-dev-secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Generates a JWT refresh token.
 */
export function generateRefreshToken(payload: { userId: string; email: string }): string {
  const secret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
  return jwt.sign(payload, secret, { expiresIn: '30d' });
}

/**
 * Verifies a refresh token.
 */
export function verifyRefreshToken(token: string): JwtPayload {
  const secret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
  return jwt.verify(token, secret) as JwtPayload;
}
