import { AllocationStatus, AlertSeverity, AlertStatus, ClusterStatus, GPUStatus, ServerStatus } from '../models';

export const EventSubjects = {
  SERVER_REGISTERED: 'server.registered',
  SERVER_UNREGISTERED: 'server.unregistered',
  SERVER_STATUS_CHANGED: 'server.status.changed',

  GPU_STATUS_CHANGED: 'gpu.status.changed',
  GPU_ALLOCATED: 'gpu.allocated',
  GPU_RELEASED: 'gpu.released',

  ALLOCATION_CREATED: 'allocation.created',
  ALLOCATION_EXPIRED: 'allocation.expired',
  ALLOCATION_RELEASED: 'allocation.released',

  ALERT_TRIGGERED: 'alert.triggered',
  ALERT_RESOLVED: 'alert.resolved',
  ALERT_ACKNOWLEDGED: 'alert.acknowledged',

  ROUTE_CREATED: 'route.created',
  ROUTE_UPDATED: 'route.updated',
  ROUTE_DELETED: 'route.deleted',
  CONFIG_APPLIED: 'config.applied',

  CLUSTER_REGISTERED: 'cluster.registered',
  CLUSTER_UNREGISTERED: 'cluster.unregistered',
  CLUSTER_STATUS_CHANGED: 'cluster.status.changed',
  WORKLOAD_DEPLOYED: 'workload.deployed',
} as const;

export type EventSubject = typeof EventSubjects[keyof typeof EventSubjects];

export interface ServerRegisteredEvent {
  serverId: string;
  name: string;
  ip: string;
  gpuCount: number;
  gpuModel: string;
}

export interface ServerStatusChangedEvent {
  serverId: string;
  previousStatus: ServerStatus;
  newStatus: ServerStatus;
}

export interface GPUStatusChangedEvent {
  gpuId: string;
  serverId: string;
  previousStatus: GPUStatus;
  newStatus: GPUStatus;
  allocationId?: string;
}

export interface AllocationCreatedEvent {
  allocationId: string;
  userId: string;
  gpuId: string;
  serverId: string;
  expiresAt: string;
}

export interface AllocationReleasedEvent {
  allocationId: string;
  userId: string;
  gpuId: string;
  serverId: string;
  status: AllocationStatus;
}

export interface AlertTriggeredEvent {
  alertId: string;
  ruleId: string;
  severity: AlertSeverity;
  source: string;
  message: string;
}

export interface AlertStatusChangedEvent {
  alertId: string;
  previousStatus: AlertStatus;
  newStatus: AlertStatus;
  acknowledgedBy?: string;
}

export interface ClusterStatusChangedEvent {
  clusterId: string;
  name: string;
  previousStatus: ClusterStatus;
  newStatus: ClusterStatus;
}

export interface WorkloadDeployedEvent {
  clusterId: string;
  workloadName: string;
  namespace: string;
  replicas: number;
}
