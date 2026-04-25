import { Router, Response } from "express";
import { z } from "zod";
import { authenticate, AuthenticatedRequest } from "../auth/jwt";
import { alertRepository } from "../repositories";
import { publish, EventSubjects } from "../mq";
import { AlertSeverityEnum, AlertFilterSchema } from "../models";
import { auditLog } from "../middleware/audit";

const router = Router();

const CreateAlertRuleSchema = z.object({
  ruleId: z.string().uuid(),
  severity: AlertSeverityEnum,
  source: z.string().min(1),
  message: z.string().min(1),
});

router.use(authenticate);
router.use(auditLog);

// POST /rules — define alert rule
router.post("/rules", async (req: AuthenticatedRequest, res: Response) => {
  const parsed = CreateAlertRuleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.message });
    return;
  }
  const { ruleId, severity, source, message } = parsed.data;

  try {
    const existing = await alertRepository.findFiringByRuleAndSource(
      ruleId,
      source,
    );
    if (existing) {
      res
        .status(409)
        .json({
          success: false,
          error: "A firing alert already exists for this rule and source",
        });
      return;
    }

    const alert = await alertRepository.create({
      ruleId,
      severity,
      source,
      message,
      status: "FIRING",
    });

    await publish(EventSubjects.ALERT_TRIGGERED, {
      alertId: alert.id,
      ruleId: alert.ruleId,
      severity: alert.severity,
      source: alert.source,
      message: alert.message,
    }).catch(() => {});

    res.status(201).json({ success: true, data: alert });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET / — list alerts
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  const { ruleId, severity, source, status, from, to } = req.query;
  const filter: Record<string, unknown> = {};
  if (ruleId) filter.ruleId = ruleId;
  if (severity) filter.severity = severity;
  if (source) filter.source = source;
  if (status) filter.status = status;
  if (from) filter.from = new Date(from as string);
  if (to) filter.to = new Date(to as string);

  const parsed = AlertFilterSchema.safeParse(filter);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.message });
    return;
  }

  try {
    const alerts = await alertRepository.findMany(parsed.data);
    res.json({ success: true, data: alerts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /:id/acknowledge
router.post(
  "/:id/acknowledge",
  async (req: AuthenticatedRequest, res: Response) => {
    const { acknowledgedBy } = req.body;
    if (!acknowledgedBy || typeof acknowledgedBy !== "string") {
      res
        .status(400)
        .json({ success: false, error: "acknowledgedBy is required" });
      return;
    }
    try {
      const alert = await alertRepository.acknowledge(
        req.params.id,
        acknowledgedBy,
      );
      res.json({ success: true, data: alert });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
);

// POST /:id/resolve
router.post(
  "/:id/resolve",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const alert = await alertRepository.resolve(req.params.id);
      res.json({ success: true, data: alert });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
);

export default router;
