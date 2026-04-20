import { Router, Response } from 'express';
import { authenticate, requireRole, AuthenticatedRequest } from '../auth/jwt';
import { routeConfigRepository } from '../repositories';
import { RouteConfigCreateInputSchema } from '../models';
import { auditLog } from '../middleware/audit';

const router = Router();

router.use(authenticate);
router.use(requireRole('admin'));
router.use(auditLog);

// POST / — create route
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const parsed = RouteConfigCreateInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.message });
    return;
  }
  const route = await routeConfigRepository.create(parsed.data);
  res.status(201).json({ success: true, data: route });
});

// GET / — list routes
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const filter = {
    name: req.query.name as string | undefined,
    path: req.query.path as string | undefined,
    method: req.query.method as any,
  };
  const routes = await routeConfigRepository.findMany(filter);
  res.json({ success: true, data: routes });
});

// GET /:id — get route by id
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const route = await routeConfigRepository.findById(req.params.id);
  if (!route) {
    res.status(404).json({ success: false, error: 'Route not found' });
    return;
  }
  res.json({ success: true, data: route });
});

// PUT /:id — update route with version increment
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const route = await routeConfigRepository.updateWithVersion(req.params.id, req.body);
  res.json({ success: true, data: route });
});

// DELETE /:id — delete route
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  await routeConfigRepository.delete(req.params.id);
  res.json({ success: true, data: null });
});

export default router;
