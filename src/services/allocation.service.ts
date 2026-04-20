import { gpuRepository, allocationRepository } from '../repositories';
import { publish, EventSubjects } from '../mq';
import type { AllocationCreatedEvent, AllocationReleasedEvent } from '../mq';
import type { Allocation, AllocationFilter } from '../models';

const DEFAULT_QUOTA = parseInt(process.env.DEFAULT_USER_QUOTA || '5', 10);

export class AllocationService {
  async allocateGPU(
    userId: string,
    gpuModel: string,
    memoryRequired: bigint,
    durationSeconds: number,
  ): Promise<Allocation> {
    const quota = parseInt(process.env.DEFAULT_USER_QUOTA || String(DEFAULT_QUOTA), 10);
    const activeCount = await allocationRepository.countActiveByUserId(userId);
    if (activeCount >= quota) throw new Error('User quota exceeded');

    const candidates = await gpuRepository.findAvailable(gpuModel, memoryRequired);
    if (candidates.length === 0) throw new Error('No available GPU resources');

    // Score: sort by free memory descending
    const best = candidates.sort(
      (a, b) => Number(b.memory - b.usedMemory) - Number(a.memory - a.usedMemory),
    )[0];

    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationSeconds * 1000);

    const allocation = await allocationRepository.create({
      userId,
      gpuId: best.id,
      serverId: best.serverId,
      status: 'ACTIVE',
      allocatedAt: now,
      expiresAt,
    });

    await gpuRepository.updateStatus(best.id, 'BUSY', allocation.id);

    await publish<AllocationCreatedEvent>(EventSubjects.ALLOCATION_CREATED, {
      allocationId: allocation.id,
      userId,
      gpuId: best.id,
      serverId: best.serverId,
      expiresAt: expiresAt.toISOString(),
    });

    return allocation;
  }

  async releaseGPU(allocationId: string, userId: string): Promise<void> {
    const allocation = await allocationRepository.findById(allocationId);
    if (!allocation) throw new Error('Allocation not found');
    if (allocation.userId !== userId) throw new Error('Unauthorized');

    await allocationRepository.updateStatus(allocationId, 'RELEASED');
    await gpuRepository.updateStatus(allocation.gpuId, 'IDLE', null);

    await publish<AllocationReleasedEvent>(EventSubjects.ALLOCATION_RELEASED, {
      allocationId,
      userId,
      gpuId: allocation.gpuId,
      serverId: allocation.serverId,
      status: 'RELEASED',
    });
  }

  async getUserAllocations(userId: string, filter?: AllocationFilter): Promise<Allocation[]> {
    return allocationRepository.findMany({ ...filter, userId });
  }
}

export const allocationService = new AllocationService();
