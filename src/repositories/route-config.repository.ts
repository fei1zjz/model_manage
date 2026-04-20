// GPU Compute Platform - RouteConfig Repository
// Database operations for RouteConfig model

import prisma from '../db/prisma';
import { RouteConfig, RouteConfigCreateInput, RouteFilter, HttpMethod } from '../models';
import { Prisma } from '@prisma/client';

export class RouteConfigRepository {
  /**
   * Create a new route config
   */
  async create(data: RouteConfigCreateInput): Promise<RouteConfig> {
    const route = await prisma.routeConfig.create({
      data: {
        name: data.name,
        path: data.path,
        method: data.method ?? 'ANY',
        upstream: data.upstream as Prisma.JsonObject,
        rateLimit: data.rateLimit as Prisma.JsonObject | null,
        authRequired: data.authRequired ?? false,
        timeout: data.timeout ?? 30000,
        retryPolicy: data.retryPolicy as Prisma.JsonObject | null,
        version: data.version ?? 1,
      },
    });

    return this.mapToModel(route);
  }

  /**
   * Find route by ID
   */
  async findById(id: string): Promise<RouteConfig | null> {
    const route = await prisma.routeConfig.findUnique({
      where: { id },
    });

    return route ? this.mapToModel(route) : null;
  }

  /**
   * Find route by name
   */
  async findByName(name: string): Promise<RouteConfig | null> {
    const route = await prisma.routeConfig.findUnique({
      where: { name },
    });

    return route ? this.mapToModel(route) : null;
  }

  /**
   * List routes with optional filters
   */
  async findMany(filter?: RouteFilter): Promise<RouteConfig[]> {
    const where: Prisma.RouteConfigWhereInput = {};

    if (filter?.name) {
      where.name = { contains: filter.name, mode: 'insensitive' };
    }

    if (filter?.path) {
      where.path = { contains: filter.path, mode: 'insensitive' };
    }

    if (filter?.method) {
      where.method = filter.method;
    }

    const routes = await prisma.routeConfig.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return routes.map(this.mapToModel);
  }

  /**
   * Update route
   */
  async update(id: string, data: Partial<RouteConfigCreateInput>): Promise<RouteConfig> {
    const route = await prisma.routeConfig.update({
      where: { id },
      data: {
        name: data.name,
        path: data.path,
        method: data.method,
        upstream: data.upstream as Prisma.JsonObject,
        rateLimit: data.rateLimit as Prisma.JsonObject | null,
        authRequired: data.authRequired,
        timeout: data.timeout,
        retryPolicy: data.retryPolicy as Prisma.JsonObject | null,
      },
    });

    return this.mapToModel(route);
  }

  /**
   * Update route with version increment
   */
  async updateWithVersion(id: string, data: Partial<RouteConfigCreateInput>): Promise<RouteConfig> {
    const current = await prisma.routeConfig.findUnique({
      where: { id },
    });

    if (!current) {
      throw new Error('Route not found');
    }

    const route = await prisma.routeConfig.update({
      where: { id },
      data: {
        name: data.name,
        path: data.path,
        method: data.method,
        upstream: data.upstream as Prisma.JsonObject,
        rateLimit: data.rateLimit as Prisma.JsonObject | null,
        authRequired: data.authRequired,
        timeout: data.timeout,
        retryPolicy: data.retryPolicy as Prisma.JsonObject | null,
        version: current.version + 1,
      },
    });

    return this.mapToModel(route);
  }

  /**
   * Delete route
   */
  async delete(id: string): Promise<void> {
    await prisma.routeConfig.delete({
      where: { id },
    });
  }

  /**
   * Find route by path and method
   */
  async findByPathAndMethod(path: string, method: HttpMethod): Promise<RouteConfig | null> {
    const route = await prisma.routeConfig.findFirst({
      where: {
        path,
        method,
      },
    });

    return route ? this.mapToModel(route) : null;
  }

  /**
   * Map Prisma model to domain model
   */
  private mapToModel(route: {
    id: string;
    name: string;
    path: string;
    method: HttpMethod;
    upstream: Record<string, unknown>;
    rateLimit: Record<string, unknown> | null;
    authRequired: boolean;
    timeout: number;
    retryPolicy: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
    version: number;
  }): RouteConfig {
    return {
      id: route.id,
      name: route.name,
      path: route.path,
      method: route.method,
      upstream: route.upstream as RouteConfig['upstream'],
      rateLimit: route.rateLimit as RouteConfig['rateLimit'],
      authRequired: route.authRequired,
      timeout: route.timeout,
      retryPolicy: route.retryPolicy as RouteConfig['retryPolicy'],
      createdAt: route.createdAt,
      updatedAt: route.updatedAt,
      version: route.version,
    };
  }
}

// Export singleton instance
export const routeConfigRepository = new RouteConfigRepository();