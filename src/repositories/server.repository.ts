// GPU Compute Platform - Server Repository
// Database operations for Server model

import prisma from '../db/prisma';
import { Server, ServerCreateInput, ServerFilter, ServerStatus } from '../models';
import { Prisma } from '@prisma/client';

export class ServerRepository {
  /**
   * Create a new server
   */
  async create(data: ServerCreateInput): Promise<Server> {
    const server = await prisma.server.create({
      data: {
        name: data.name,
        ip: data.ip,
        port: data.port,
        gpuCount: data.gpuCount,
        gpuModel: data.gpuModel,
        totalMemory: data.totalMemory,
        status: data.status ?? 'OFFLINE',
      },
    });

    return this.mapToModel(server);
  }

  /**
   * Find server by ID
   */
  async findById(id: string): Promise<Server | null> {
    const server = await prisma.server.findUnique({
      where: { id },
    });

    return server ? this.mapToModel(server) : null;
  }

  /**
   * Find server by name
   */
  async findByName(name: string): Promise<Server | null> {
    const server = await prisma.server.findFirst({
      where: { name },
    });

    return server ? this.mapToModel(server) : null;
  }

  /**
   * List servers with optional filters
   */
  async findMany(filter?: ServerFilter): Promise<Server[]> {
    const where: Prisma.ServerWhereInput = {};

    if (filter?.status) {
      where.status = filter.status;
    }

    if (filter?.gpuModel) {
      where.gpuModel = filter.gpuModel;
    }

    if (filter?.name) {
      where.name = { contains: filter.name, mode: 'insensitive' };
    }

    const servers = await prisma.server.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return servers.map(this.mapToModel);
  }

  /**
   * Update server
   */
  async update(id: string, data: Partial<ServerCreateInput>): Promise<Server> {
    const server = await prisma.server.update({
      where: { id },
      data: {
        name: data.name,
        ip: data.ip,
        port: data.port,
        gpuCount: data.gpuCount,
        gpuModel: data.gpuModel,
        totalMemory: data.totalMemory,
        status: data.status,
      },
    });

    return this.mapToModel(server);
  }

  /**
   * Update server status
   */
  async updateStatus(id: string, status: ServerStatus): Promise<Server> {
    const server = await prisma.server.update({
      where: { id },
      data: { status },
    });

    return this.mapToModel(server);
  }

  /**
   * Delete server
   */
  async delete(id: string): Promise<void> {
    await prisma.server.delete({
      where: { id },
    });
  }

  /**
   * Check if server has active allocations
   */
  async hasActiveAllocations(serverId: string): Promise<boolean> {
    const allocation = await prisma.allocation.findFirst({
      where: {
        serverId,
        status: 'ACTIVE',
      },
    });

    return allocation !== null;
  }

  /**
   * Count servers by status
   */
  async countByStatus(): Promise<Record<ServerStatus, number>> {
    const servers = await prisma.server.groupBy({
      by: ['status'],
      _count: true,
    });

    const result: Record<ServerStatus, number> = {
      ONLINE: 0,
      OFFLINE: 0,
      MAINTENANCE: 0,
      ERROR: 0,
    };

    servers.forEach((s) => {
      result[s.status as ServerStatus] = s._count;
    });

    return result;
  }

  /**
   * Map Prisma model to domain model
   */
  private mapToModel(server: {
    id: string;
    name: string;
    ip: string;
    port: number;
    gpuCount: number;
    gpuModel: string;
    totalMemory: bigint;
    status: ServerStatus;
    createdAt: Date;
    updatedAt: Date;
  }): Server {
    return {
      id: server.id,
      name: server.name,
      ip: server.ip,
      port: server.port,
      gpuCount: server.gpuCount,
      gpuModel: server.gpuModel,
      totalMemory: server.totalMemory,
      status: server.status,
      createdAt: server.createdAt,
      updatedAt: server.updatedAt,
    };
  }
}

// Export singleton instance
export const serverRepository = new ServerRepository();