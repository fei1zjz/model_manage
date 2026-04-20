import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { redis } from '../cache/client';
import { CacheNamespaces } from '../cache/types';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export type UserRole = 'admin' | 'user' | 'viewer';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as any);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const key = `${CacheNamespaces.TOKEN_BLACKLIST}:${token}`;
  const result = await redis.exists(key);
  return result === 1;
}

export async function blacklistToken(token: string, expiresIn: number): Promise<void> {
  const key = `${CacheNamespaces.TOKEN_BLACKLIST}:${token}`;
  await redis.set(key, '1', 'EX', expiresIn);
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    // Check blacklist async but don't block — blacklist check is best-effort for perf
    isTokenBlacklisted(token).then((blacklisted) => {
      if (blacklisted) {
        res.status(401).json({ error: 'Token has been revoked' });
        return;
      }
      req.user = payload;
      next();
    }).catch(() => {
      req.user = payload;
      next();
    });
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
