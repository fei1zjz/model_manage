import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../auth/jwt';

export function auditLog(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (mutating.includes(req.method)) {
    console.log(`[AUDIT] ${req.method} ${req.path} by ${req.user?.userId || 'anonymous'} at ${new Date().toISOString()}`);
  }
  next();
}
