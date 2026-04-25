import { Router, Response } from "express";
import { authenticate, requireRole, AuthenticatedRequest } from "../auth/jwt";
import { routeConfigRepository } from "../repositories";
import { RouteConfigCreateInputSchema, RouteFilterSchema } from "../models";
import { auditLog } from "../middleware/audit";

const router = Router();

router.use(authenticate);
router.use(requireRole("admin"));
router.use(auditLog);

router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = RouteConfigCreateInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.message });
      return;
    }
    const route = await routeConfigRepository.create(parsed.data);
    res.status(201).json({ success: true, data: route });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const filter = {
      name: req.query.name as string | undefined,
      path: req.query.path as string | undefined,
      method: req.query.method as string | undefined,
    };
    const parsed = RouteFilterSchema.safeParse(filter);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.message });
      return;
    }
    const routes = await routeConfigRepository.findMany(parsed.data);
    res.json({ success: true, data: routes });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const route = await routeConfigRepository.findById(req.params.id);
    if (!route) {
      res.status(404).json({ success: false, error: "Route not found" });
      return;
    }
    res.json({ success: true, data: route });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = RouteConfigCreateInputSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.message });
      return;
    }
    const route = await routeConfigRepository.updateWithVersion(
      req.params.id,
      parsed.data,
    );
    res.json({ success: true, data: route });
  } catch (err: any) {
    const status = err.message === "Route not found" ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    await routeConfigRepository.delete(req.params.id);
    res.json({ success: true, data: null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
