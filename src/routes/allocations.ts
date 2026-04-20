import { Router } from 'express';
import { authenticate } from '../auth/jwt';
import { allocationService } from '../services/allocation.service';
import { allocationRepository } from '../repositories';
import type { AuthenticatedRequest } from '../auth/jwt';
import type { AllocationFilter } from '../models';

const router = Router();

router.post('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { gpuModel, memoryRequired, durationSeconds } = req.body;
    const allocation = await allocationService.allocateGPU(
      req.user!.userId,
      gpuModel,
      BigInt(memoryRequired),
      durationSeconds,
    );
    res.status(201).json({ success: true, data: allocation });
  } catch (e: any) {
    const status = e.message === 'User quota exceeded' ? 429
      : e.message === 'No available GPU resources' ? 503
      : 400;
    res.status(status).json({ success: false, error: e.message });
  }
});

router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const isAdmin = req.user!.role === 'admin';
    const { status, gpuId, serverId } = req.query as Record<string, string>;
    const filter: AllocationFilter = { status: status as any, gpuId, serverId };
    const allocations = isAdmin
      ? await allocationRepository.findMany(filter)
      : await allocationService.getUserAllocations(req.user!.userId, filter);
    res.json({ success: true, data: allocations });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    await allocationService.releaseGPU(req.params.id, req.user!.userId);
    res.json({ success: true, data: null });
  } catch (e: any) {
    const status = e.message === 'Unauthorized' ? 403
      : e.message === 'Allocation not found' ? 404
      : 400;
    res.status(status).json({ success: false, error: e.message });
  }
});

export default router;
