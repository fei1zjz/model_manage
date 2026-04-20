import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { generateToken, blacklistToken, authenticate, AuthenticatedRequest } from '../auth/jwt';

const router = Router();

const LoginSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'viewer']).default('user'),
});

// POST /login — issue JWT (demo endpoint, no real password check)
router.post('/login', (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.message });
    return;
  }
  const token = generateToken(parsed.data);
  res.json({ success: true, data: { token } });
});

// POST /logout — blacklist current token
router.post('/logout', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const token = req.headers.authorization!.slice(7);
  // Blacklist for 24h (matches JWT expiry)
  await blacklistToken(token, 86400);
  res.json({ success: true, data: null });
});

export default router;
