import { Router, Response } from "express";
import { authenticate, requireRole, AuthenticatedRequest } from "../auth/jwt";
import { userService } from "../services/user.service";
import type { User } from "../models";
import {
  safeValidateUpdateProfile,
  safeValidateChangePassword,
  safeValidateUpdateUserRole,
} from "../models";

const router = Router();

function stripPassword(user: User): Omit<User, "passwordHash"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...rest } = user;
  return rest;
}

// GET /users/me — get current user profile
router.get(
  "/me",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = await userService.getProfile(req.user!.userId);
      res.json({
        success: true,
        data: stripPassword(user),
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to get profile";
      res.status(404).json({ success: false, error: message });
    }
  },
);

// PUT /users/me — update profile (email, username)
router.put(
  "/me",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = safeValidateUpdateProfile(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.message });
      return;
    }
    try {
      const user = await userService.updateProfile(
        req.user!.userId,
        parsed.data,
      );
      res.json({
        success: true,
        data: stripPassword(user),
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update profile";
      res.status(409).json({ success: false, error: message });
    }
  },
);

// PUT /users/me/password — change password
router.put(
  "/me/password",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = safeValidateChangePassword(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.message });
      return;
    }
    try {
      await userService.changePassword(
        req.user!.userId,
        parsed.data.oldPassword,
        parsed.data.newPassword,
      );
      res.json({ success: true, data: null });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to change password";
      res.status(400).json({ success: false, error: message });
    }
  },
);

// GET /users — list all users (admin only)
router.get(
  "/",
  authenticate,
  requireRole("admin"),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await userService.listUsers();
      res.json({
        success: true,
        data: users.map((u) => stripPassword(u)),
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to list users";
      res.status(500).json({ success: false, error: message });
    }
  },
);

// PUT /users/:id/role — update user role (admin only)
router.put(
  "/:id/role",
  authenticate,
  requireRole("admin"),
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = safeValidateUpdateUserRole(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.message });
      return;
    }
    try {
      const user = await userService.updateRole(
        req.params.id,
        parsed.data.role,
      );
      res.json({
        success: true,
        data: stripPassword(user),
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update role";
      res.status(404).json({ success: false, error: message });
    }
  },
);

// DELETE /users/:id — delete user (admin only)
router.delete(
  "/:id",
  authenticate,
  requireRole("admin"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await userService.deleteUser(req.params.id);
      res.json({ success: true, data: null });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete user";
      res.status(404).json({ success: false, error: message });
    }
  },
);

export default router;
