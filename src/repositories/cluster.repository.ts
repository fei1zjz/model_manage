// GPU Compute Platform - Cluster Repository
// Database operations for Cluster model

import prisma from '../db/prisma';
import { Cluster, ClusterCreateInput, ClusterFilter, ClusterStatus } from '../models';
import { Prisma } from '@prisma/client';

export class ClusterRepository {
  /**
   * Create a new cluster
   */
  async create(data: ClusterCreateInput): Promise<Cluster> {
    const cluster = await prisma.cluster.create({
      data: {
        name: data.name,
        apiServer: data.apiServer,
        kubeconfig: data.kubeconfig,
        version: data.version,
        nodeCount: data.nodeCount ?? 0,
        gpuNodeCount: data.gpuNodeCount ?? 0,
        status: data.status ?? 'UNKNOWN',
        labels: data.labels ?? {},
      },
    });

    return this.mapToModel(cluster);
  }

  /**
   * Find cluster by ID
   */
  async findById(id: string): Promise<Cluster | null> {
    const cluster = await prisma.cluster.findUnique({
      where: { id },
    });

    return cluster ? this.mapToModel(cluster) : null;
  }

  /**
   * Find cluster by name
   */
  async findByName(name: string): Promise<Cluster | null> {
    const cluster = await prisma.cluster.findUnique({
      where: { name },
    });

    return cluster ? this.mapToModel(cluster) : null;
  }

  /**
   * List clusters with optional filters
   */
  async findMany(filter?: ClusterFilter): Promise<Cluster[]> {
    const where: Prisma.ClusterWhereInput = {};

    if (filter?.status) {
      where.status = filter.status;
    }

    if (filter?.name) {
      where.name = { contains: filter.name, mode: 'insensitive' };
    }

    if (filter?.labels) {
      where.labels = filter.labels as Prisma.JsonObject;
    }

    const clusters = await prisma.cluster.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return clusters.map(this.mapToModel);
  }

  /**
   * Update cluster
   */
  async update(id: string, data: Partial<ClusterCreateInput>): Promise<Cluster> {
    const cluster = await prisma.cluster.update({
      where: { id },
      data: {
        name: data.name,
        apiServer: data.apiServer,
        kubeconfig: data.kubeconfig,
        version: data.version,
        nodeCount: data.nodeCount,
        gpuNodeCount: data.gpuNodeCount,
        status: data.status,
        labels: data.labels as Prisma.InputJsonValue ?? Prisma.JsonNull,
      },
    });

    return this.mapToModel(cluster);
  }

  /**
   * Update cluster status
   */
  async updateStatus(id: string, status: ClusterStatus): Promise<Cluster> {
    const cluster = await prisma.cluster.update({
      where: { id },
      data: { status },
    });

    return this.mapToModel(cluster);
  }

  /**
   * Update cluster node counts
   */
  async updateNodeCounts(id: string, nodeCount: number, gpuNodeCount: number): Promise<Cluster> {
    const cluster = await prisma.cluster.update({
      where: { id },
      data: { nodeCount, gpuNodeCount },
    });

    return this.mapToModel(cluster);
  }

  /**
   * Delete cluster
   */
  async delete(id: string): Promise<void> {
    await prisma.cluster.delete({
      where: { id },
    });
  }

  /**
   * Check if cluster has active workloads (placeholder - would need workload table)
   */
  async hasActiveWorkloads(clusterId: string): Promise<boolean> {
    // This would check for active workloads in a real implementation
    // For now, return false as we don't have a workload table yet
    return false;
  }

  /**
   * Count clusters by status
   */
  async countByStatus(): Promise<Record<ClusterStatus, number>> {
    const clusters = await prisma.cluster.groupBy({
      by: ['status'],
      _count: true,
    });

    const result: Record<ClusterStatus, number> = {
      HEALTHY: 0,
      DEGRADED: 0,
      UNHEALTHY: 0,
      UNKNOWN: 0,
    };

    clusters.forEach((c) => {
      result[c.status as ClusterStatus] = c._count;
    });

    return result;
  }

  /**
   * Map Prisma model to domain model
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapToModel(cluster: any): Cluster {
    return {
      id: cluster.id,
      name: cluster.name,
      apiServer: cluster.apiServer,
      kubeconfig: cluster.kubeconfig,
      version: cluster.version,
      nodeCount: cluster.nodeCount,
      gpuNodeCount: cluster.gpuNodeCount,
      status: cluster.status,
      labels: cluster.labels,
      createdAt: cluster.createdAt,
      updatedAt: cluster.updatedAt,
    };
  }
}

// Export singleton instance
export const clusterRepository = new ClusterRepository();