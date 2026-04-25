import { Router, Request, Response } from "express";
import {
  generateToken,
  blacklistToken,
  authenticate,
  AuthenticatedRequest,
} from "../auth/jwt";
import { userService } from "../services/user.service";
import { safeValidateRegister, safeValidateLogin } from "../models";

const router = Router();

// POST /register — create new user account
router.post("/register", async (req: Request, res: Response) => {
  const parsed = safeValidateRegister(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.message });
    return;
  }
  try {
    const user = await userService.register(parsed.data);
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as "admin" | "user" | "viewer",
    });
    res
      .status(201)
      .json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
          },
        },
      });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Registration failed";
    res.status(409).json({ success: false, error: message });
  }
});

// POST /login — authenticate with email + password
router.post("/login", async (req: Request, res: Response) => {
  const parsed = safeValidateLogin(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.message });
    return;
  }
  try {
    const user = await userService.login(parsed.data);
    const token = generateToken({
      userId: user.userId,
      email: user.email,
      role: user.role,
    });
    res.json({ success: true, data: { token, user } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Login failed";
    res.status(401).json({ success: false, error: message });
  }
});

// POST /logout — blacklist current token
router.post(
  "/logout",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const token = req.headers.authorization!.slice(7);
    await blacklistToken(token, 86400);
    res.json({ success: true, data: null });
  },
);

export default router;
