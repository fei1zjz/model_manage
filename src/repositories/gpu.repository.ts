// GPU Compute Platform - GPU Repository
// Database operations for GPU model

import prisma from '../db/prisma';
import { GPU, GPUCreateInput, GPUStatus } from '../models';
import { Prisma } from '@prisma/client';

export class GPURepository {
  /**
   * Create a new GPU
   */
  async create(data: GPUCreateInput): Promise<GPU> {
    const gpu = await prisma.gPU.create({
      data: {
        serverId: data.serverId,
        index: data.index,
        model: data.model,
        memory: data.memory,
        usedMemory: data.usedMemory ?? BigInt(0),
        status: data.status ?? 'IDLE',
        allocatedTo: data.allocatedTo,
      },
    });

    return this.mapToModel(gpu);
  }

  /**
   * Create multiple GPUs for a server
   */
  async createMany(serverId: string, gpuModel: string, memory: bigint, count: number): Promise<GPU[]> {
    const gpus = await prisma.gPU.createManyAndReturn({
      data: Array.from({ length: count }, (_, i) => ({
        serverId,
        index: i,
        model: gpuModel,
        memory,
        usedMemory: BigInt(0),
        status: 'IDLE' as GPUStatus,
        allocatedTo: null,
      })),
    });

    return gpus.map(this.mapToModel);
  }

  /**
   * Find GPU by ID
   */
  async findById(id: string): Promise<GPU | null> {
    const gpu = await prisma.gPU.findUnique({
      where: { id },
    });

    return gpu ? this.mapToModel(gpu) : null;
  }

  /**
   * Find GPU by server and index
   */
  async findByServerAndIndex(serverId: string, index: number): Promise<GPU | null> {
    const gpu = await prisma.gPU.findUnique({
      where: {
        serverId_index: {
          serverId,
          index,
        },
      },
    });

    return gpu ? this.mapToModel(gpu) : null;
  }

  /**
   * Find all GPUs for a server
   */
  async findByServerId(serverId: string): Promise<GPU[]> {
    const gpus = await prisma.gPU.findMany({
      where: { serverId },
      orderBy: { index: 'asc' },
    });

    return gpus.map(this.mapToModel);
  }

  /**
   * Find available GPUs matching criteria
   */
  async findAvailable(gpuModel?: string, minMemory?: bigint): Promise<GPU[]> {
    const where: Prisma.GPUWhereInput = {
      status: 'IDLE',
    };

    if (gpuModel) {
      where.model = gpuModel;
    }

    if (minMemory) {
      where.memory = {
        gte: minMemory,
      };
    }

    const gpus = await prisma.gPU.findMany({
      where,
      include: {
        server: true,
      },
      orderBy: { index: 'asc' },
    });

    return gpus.map(this.mapToModel);
  }

  /**
   * Update GPU
   */
  async update(id: string, data: Partial<GPUCreateInput>): Promise<GPU> {
    const gpu = await prisma.gPU.update({
      where: { id },
      data: {
        model: data.model,
        memory: data.memory,
        usedMemory: data.usedMemory,
        status: data.status,
        allocatedTo: data.allocatedTo,
      },
    });

    return this.mapToModel(gpu);
  }

  /**
   * Update GPU status
   */
  async updateStatus(id: string, status: GPUStatus, allocatedTo?: string | null): Promise<GPU> {
    const gpu = await prisma.gPU.update({
      where: { id },
      data: {
        status,
        allocatedTo: allocatedTo !== undefined ? allocatedTo : undefined,
      },
    });

    return this.mapToModel(gpu);
  }

  /**
   * Update GPU memory usage
   */
  async updateMemoryUsage(id: string, usedMemory: bigint): Promise<GPU> {
    const gpu = await prisma.gPU.update({
      where: { id },
      data: { usedMemory },
    });

    return this.mapToModel(gpu);
  }

  /**
   * Delete GPU
   */
  async delete(id: string): Promise<void> {
    await prisma.gPU.delete({
      where: { id },
    });
  }

  /**
   * Delete all GPUs for a server
   */
  async deleteByServerId(serverId: string): Promise<void> {
    await prisma.gPU.deleteMany({
      where: { serverId },
    });
  }

  /**
   * Count GPUs by status for a server
   */
  async countByStatus(serverId: string): Promise<Record<GPUStatus, number>> {
    const gpus = await prisma.gPU.groupBy({
      by: ['status'],
      where: { serverId },
      _count: true,
    });

    const result: Record<GPUStatus, number> = {
      IDLE: 0,
      BUSY: 0,
      ERROR: 0,
      RESERVED: 0,
    };

    gpus.forEach((g) => {
      result[g.status as GPUStatus] = g._count;
    });

    return result;
  }

  /**
   * Map Prisma model to domain model
   */
  private mapToModel(gpu: {
    id: string;
    serverId: string;
    index: number;
    model: string;
    memory: bigint;
    usedMemory: bigint;
    status: GPUStatus;
    allocatedTo: string | null;
  }): GPU {
    return {
      id: gpu.id,
      serverId: gpu.serverId,
      index: gpu.index,
      model: gpu.model,
      memory: gpu.memory,
      usedMemory: gpu.usedMemory,
      status: gpu.status,
      allocatedTo: gpu.allocatedTo,
    };
  }
}

// Export singleton instance
export const gpuRepository = new GPURepository();