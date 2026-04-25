import { Router } from "express";
import { authenticate, requireRole } from "../auth/jwt";
import { serverService } from "../services/server.service";
import { gpuRepository } from "../repositories";
import { ServerFilterSchema } from "../models";
import type { AuthenticatedRequest } from "../auth/jwt";

const router = Router();

router.post(
  "/",
  authenticate,
  requireRole("admin"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const server = await serverService.registerServer(req.body);
      res.status(201).json({ success: true, data: server });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  },
);

router.get("/", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = ServerFilterSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.message });
      return;
    }
    const servers = await serverService.listServers(parsed.data);
    res.json({ success: true, data: servers });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get("/:id", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const server = await serverService.getServer(req.params.id);
    res.json({ success: true, data: server });
  } catch (e: any) {
    res.status(404).json({ success: false, error: e.message });
  }
});

router.delete(
  "/:id",
  authenticate,
  requireRole("admin"),
  async (req: AuthenticatedRequest, res) => {
    try {
      await serverService.unregisterServer(req.params.id);
      res.json({ success: true, data: null });
    } catch (e: any) {
      const status = e.message === "Server has active allocations" ? 409 : 400;
      res.status(status).json({ success: false, error: e.message });
    }
  },
);

router.patch(
  "/:id/status",
  authenticate,
  requireRole("admin"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const server = await serverService.updateServerStatus(
        req.params.id,
        req.body.status,
      );
      res.json({ success: true, data: server });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  },
);

router.get(
  "/:id/gpus",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const gpus = await gpuRepository.findByServerId(req.params.id);
      res.json({ success: true, data: gpus });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  },
);

export default router;
