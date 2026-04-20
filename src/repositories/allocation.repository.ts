// GPU Compute Platform - Allocation Repository
// Database operations for Allocation model

import prisma from '../db/prisma';
import { Allocation, AllocationCreateInput, AllocationFilter, AllocationStatus } from '../models';
import { Prisma } from '@prisma/client';

export class AllocationRepository {
  /**
   * Create a new allocation
   */
  async create(data: AllocationCreateInput): Promise<Allocation> {
    const allocation = await prisma.allocation.create({
      data: {
        userId: data.userId,
        gpuId: data.gpuId,
        serverId: data.serverId,
        allocatedAt: data.allocatedAt,
        expiresAt: data.expiresAt,
        status: data.status ?? 'PENDING',
        metadata: data.metadata ?? {},
      },
    });

    return this.mapToModel(allocation);
  }

  /**
   * Find allocation by ID
   */
  async findById(id: string): Promise<Allocation | null> {
    const allocation = await prisma.allocation.findUnique({
      where: { id },
    });

    return allocation ? this.mapToModel(allocation) : null;
  }

  /**
   * Find allocation by GPU ID (active)
   */
  async findActiveByGpuId(gpuId: string): Promise<Allocation | null> {
    const allocation = await prisma.allocation.findFirst({
      where: {
        gpuId,
        status: 'ACTIVE',
      },
    });

    return allocation ? this.mapToModel(allocation) : null;
  }

  /**
   * Find allocations by user ID
   */
  async findByUserId(userId: string): Promise<Allocation[]> {
    const allocations = await prisma.allocation.findMany({
      where: { userId },
      orderBy: { requestedAt: 'desc' },
    });

    return allocations.map(this.mapToModel);
  }

  /**
   * Find active allocations by user ID
   */
  async findActiveByUserId(userId: string): Promise<Allocation[]> {
    const allocations = await prisma.allocation.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      orderBy: { allocatedAt: 'desc' },
    });

    return allocations.map(this.mapToModel);
  }

  /**
   * Count active allocations by user ID
   */
  async countActiveByUserId(userId: string): Promise<number> {
    return prisma.allocation.count({
      where: {
        userId,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * List allocations with optional filters
   */
  async findMany(filter?: AllocationFilter): Promise<Allocation[]> {
    const where: Prisma.AllocationWhereInput = {};

    if (filter?.userId) {
      where.userId = filter.userId;
    }

    if (filter?.gpuId) {
      where.gpuId = filter.gpuId;
    }

    if (filter?.serverId) {
      where.serverId = filter.serverId;
    }

    if (filter?.status) {
      where.status = filter.status;
    }

    const allocations = await prisma.allocation.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
    });

    return allocations.map(this.mapToModel);
  }

  /**
   * Find expired allocations
   */
  async findExpired(): Promise<Allocation[]> {
    const now = new Date();
    const allocations = await prisma.allocation.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          lt: now,
        },
      },
    });

    return allocations.map(this.mapToModel);
  }

  /**
   * Update allocation
   */
  async update(id: string, data: Partial<AllocationCreateInput>): Promise<Allocation> {
    const allocation = await prisma.allocation.update({
      where: { id },
      data: {
        allocatedAt: data.allocatedAt,
        expiresAt: data.expiresAt,
        status: data.status,
        metadata: data.metadata,
      },
    });

    return this.mapToModel(allocation);
  }

  /**
   * Update allocation status
   */
  async updateStatus(id: string, status: AllocationStatus): Promise<Allocation> {
    const allocation = await prisma.allocation.update({
      where: { id },
      data: { status },
    });

    return this.mapToModel(allocation);
  }

  /**
   * Delete allocation
   */
  async delete(id: string): Promise<void> {
    await prisma.allocation.delete({
      where: { id },
    });
  }

  /**
   * Delete expired allocations older than specified date
   */
  async deleteExpired(before: Date): Promise<number> {
    const result = await prisma.allocation.deleteMany({
      where: {
        status: { in: ['RELEASED', 'EXPIRED', 'FAILED'] },
        requestedAt: { lt: before },
      },
    });

    return result.count;
  }

  /**
   * Map Prisma model to domain model
   */
  private mapToModel(allocation: {
    id: string;
    userId: string;
    gpuId: string;
    serverId: string;
    requestedAt: Date;
    allocatedAt: Date | null;
    expiresAt: Date | null;
    status: AllocationStatus;
    metadata: Record<string, string> | null;
  }): Allocation {
    return {
      id: allocation.id,
      userId: allocation.userId,
      gpuId: allocation.gpuId,
      serverId: allocation.serverId,
      requestedAt: allocation.requestedAt,
      allocatedAt: allocation.allocatedAt,
      expiresAt: allocation.expiresAt,
      status: allocation.status,
      metadata: allocation.metadata,
    };
  }
}

// Export singleton instance
export const allocationRepository = new AllocationRepository();