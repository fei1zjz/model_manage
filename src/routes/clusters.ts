import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, AuthenticatedRequest } from '../auth/jwt';
import { clusterRepository } from '../repositories';
import { ClusterCreateInputSchema, ClusterStatusEnum } from '../models';
import { publish, EventSubjects } from '../mq';
import { auditLog } from '../middleware/audit';

const router = Router();

router.use(authenticate);
router.use(requireRole('admin'));
router.use(auditLog);

const WorkloadSchema = z.object({
  name: z.string().min(1),
  namespace: z.string().min(1),
  image: z.string().min(1),
  replicas: z.number().int().min(1).max(1000),
  resources: z.record(z.unknown()).optional(),
});

const ScaleSchema = z.object({
  replicas: z.number().int().min(1).max(1000),
});

// POST / — register cluster
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const parsed = ClusterCreateInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.message });
    return;
  }
  try {
    const cluster = await clusterRepository.create(parsed.data);
    res.status(201).json({ success: true, data: cluster });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET / — list clusters
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.name) filter.name = req.query.name;
  try {
    const clusters = await clusterRepository.findMany(filter as any);
    res.json({ success: true, data: clusters });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /:id — get cluster by id
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cluster = await clusterRepository.findById(req.params.id);
    if (!cluster) {
      res.status(404).json({ success: false, error: 'Cluster not found' });
      return;
    }
    res.json({ success: true, data: cluster });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /:id — unregister cluster
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const hasWorkloads = await clusterRepository.hasActiveWorkloads(req.params.id);
    if (hasWorkloads) {
      res.status(409).json({ success: false, error: 'Cluster has active workloads and cannot be unregistered' });
      return;
    }
    await clusterRepository.delete(req.params.id);
    res.json({ success: true, data: null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /:id/status — update cluster status
router.patch('/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  const parsed = ClusterStatusEnum.safeParse(req.body.status);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid status value' });
    return;
  }
  try {
    const cluster = await clusterRepository.updateStatus(req.params.id, parsed.data);
    res.json({ success: true, data: cluster });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /:id/metrics — return mock node metrics
router.get('/:id/metrics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cluster = await clusterRepository.findById(req.params.id);
    if (!cluster) {
      res.status(404).json({ success: false, error: 'Cluster not found' });
      return;
    }
    const { nodeCount, gpuNodeCount } = cluster;
    res.json({
      success: true,
      data: {
        clusterId: req.params.id,
        nodeCount,
        gpuNodeCount,
        availableCpu: nodeCount * 4,
        availableMemory: nodeCount * 16384,
        availableGpus: gpuNodeCount,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /:id/workloads — deploy workload
router.post('/:id/workloads', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cluster = await clusterRepository.findById(req.params.id);
    if (!cluster) {
      res.status(404).json({ success: false, error: 'Cluster not found' });
      return;
    }
    if (cluster.status !== 'HEALTHY') {
      res.status(422).json({ success: false, error: 'Cluster is not HEALTHY' });
      return;
    }

    const parsed = WorkloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.message });
      return;
    }

    const { name, namespace, image, replicas, resources } = parsed.data;
    const workloadId = `wl-${Date.now()}`;

    await publish(EventSubjects.WORKLOAD_DEPLOYED, {
      clusterId: req.params.id,
      workloadName: name,
      namespace,
      replicas,
    }).catch(() => {});

    res.status(201).json({
      success: true,
      data: { workloadId, clusterId: req.params.id, name, namespace, image, replicas, resources: resources ?? {} },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /:id/workloads/:workloadId/scale — scale workload
router.patch('/:id/workloads/:workloadId/scale', async (req: AuthenticatedRequest, res: Response) => {
  const parsed = ScaleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.message });
    return;
  }
  res.json({
    success: true,
    data: { clusterId: req.params.id, workloadId: req.params.workloadId, replicas: parsed.data.replicas },
  });
});

export default router;
