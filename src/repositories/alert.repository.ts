// GPU Compute Platform - Alert Repository
// Database operations for Alert model

import prisma from '../db/prisma';
import { Alert, AlertCreateInput, AlertFilter, AlertStatus } from '../models';
import { Prisma } from '@prisma/client';

export class AlertRepository {
  /**
   * Create a new alert
   */
  async create(data: AlertCreateInput): Promise<Alert> {
    const alert = await prisma.alert.create({
      data: {
        ruleId: data.ruleId,
        severity: data.severity,
        source: data.source,
        message: data.message,
        acknowledgedAt: data.acknowledgedAt,
        acknowledgedBy: data.acknowledgedBy,
        status: data.status ?? 'FIRING',
      },
    });

    return this.mapToModel(alert);
  }

  /**
   * Find alert by ID
   */
  async findById(id: string): Promise<Alert | null> {
    const alert = await prisma.alert.findUnique({
      where: { id },
    });

    return alert ? this.mapToModel(alert) : null;
  }

  /**
   * Find firing alert by rule and source (for uniqueness constraint)
   */
  async findFiringByRuleAndSource(ruleId: string, source: string): Promise<Alert | null> {
    const alert = await prisma.alert.findFirst({
      where: {
        ruleId,
        source,
        status: 'FIRING',
      },
    });

    return alert ? this.mapToModel(alert) : null;
  }

  /**
   * List alerts with optional filters
   */
  async findMany(filter?: AlertFilter): Promise<Alert[]> {
    const where: Prisma.AlertWhereInput = {};

    if (filter?.ruleId) {
      where.ruleId = filter.ruleId;
    }

    if (filter?.severity) {
      where.severity = filter.severity;
    }

    if (filter?.source) {
      where.source = { contains: filter.source, mode: 'insensitive' };
    }

    if (filter?.status) {
      where.status = filter.status;
    }

    if (filter?.from || filter?.to) {
      where.triggeredAt = {};
      if (filter?.from) {
        where.triggeredAt.gte = filter.from;
      }
      if (filter?.to) {
        where.triggeredAt.lte = filter.to;
      }
    }

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { triggeredAt: 'desc' },
    });

    return alerts.map(this.mapToModel);
  }

  /**
   * Find unacknowledged alerts
   */
  async findUnacknowledged(): Promise<Alert[]> {
    const alerts = await prisma.alert.findMany({
      where: {
        status: 'FIRING',
        acknowledgedAt: null,
      },
      orderBy: { triggeredAt: 'desc' },
    });

    return alerts.map(this.mapToModel);
  }

  /**
   * Update alert
   */
  async update(id: string, data: Partial<AlertCreateInput>): Promise<Alert> {
    const alert = await prisma.alert.update({
      where: { id },
      data: {
        severity: data.severity,
        source: data.source,
        message: data.message,
        acknowledgedAt: data.acknowledgedAt,
        acknowledgedBy: data.acknowledgedBy,
        status: data.status,
      },
    });

    return this.mapToModel(alert);
  }

  /**
   * Acknowledge alert
   */
  async acknowledge(id: string, acknowledgedBy: string): Promise<Alert> {
    const alert = await prisma.alert.update({
      where: { id },
      data: {
        acknowledgedAt: new Date(),
        acknowledgedBy,
        status: 'ACKNOWLEDGED',
      },
    });

    return this.mapToModel(alert);
  }

  /**
   * Update alert status
   */
  async updateStatus(id: string, status: AlertStatus): Promise<Alert> {
    const alert = await prisma.alert.update({
      where: { id },
      data: { status },
    });

    return this.mapToModel(alert);
  }

  /**
   * Resolve alert (when condition no longer met)
   */
  async resolve(id: string): Promise<Alert> {
    const alert = await prisma.alert.update({
      where: { id },
      data: { status: 'RESOLVED' },
    });

    return this.mapToModel(alert);
  }

  /**
   * Delete alert
   */
  async delete(id: string): Promise<void> {
    await prisma.alert.delete({
      where: { id },
    });
  }

  /**
   * Delete old resolved alerts
   */
  async deleteResolvedOlderThan(before: Date): Promise<number> {
    const result = await prisma.alert.deleteMany({
      where: {
        status: 'RESOLVED',
        triggeredAt: { lt: before },
      },
    });

    return result.count;
  }

  /**
   * Count alerts by status
   */
  async countByStatus(): Promise<Record<AlertStatus, number>> {
    const alerts = await prisma.alert.groupBy({
      by: ['status'],
      _count: true,
    });

    const result: Record<AlertStatus, number> = {
      FIRING: 0,
      RESOLVED: 0,
      ACKNOWLEDGED: 0,
    };

    alerts.forEach((a) => {
      result[a.status as AlertStatus] = a._count;
    });

    return result;
  }

  /**
   * Map Prisma model to domain model
   */
  private mapToModel(alert: {
    id: string;
    ruleId: string;
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    source: string;
    message: string;
    triggeredAt: Date;
    acknowledgedAt: Date | null;
    acknowledgedBy: string | null;
    status: AlertStatus;
  }): Alert {
    return {
      id: alert.id,
      ruleId: alert.ruleId,
      severity: alert.severity,
      source: alert.source,
      message: alert.message,
      triggeredAt: alert.triggeredAt,
      acknowledgedAt: alert.acknowledgedAt,
      acknowledgedBy: alert.acknowledgedBy,
      status: alert.status,
    };
  }
}

// Export singleton instance
export const alertRepository = new AlertRepository();