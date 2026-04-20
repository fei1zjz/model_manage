// GPU Compute Platform - Domain Models
// TypeScript interfaces with Zod validation

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export const ServerStatusEnum = z.enum(['ONLINE', 'OFFLINE', 'MAINTENANCE', 'ERROR']);
export type ServerStatus = z.infer<typeof ServerStatusEnum>;

export const GPUStatusEnum = z.enum(['IDLE', 'BUSY', 'ERROR', 'RESERVED']);
export type GPUStatus = z.infer<typeof GPUStatusEnum>;

export const AllocationStatusEnum = z.enum(['PENDING', 'ACTIVE', 'RELEASED', 'EXPIRED', 'FAILED']);
export type AllocationStatus = z.infer<typeof AllocationStatusEnum>;

export const AlertSeverityEnum = z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL']);
export type AlertSeverity = z.infer<typeof AlertSeverityEnum>;

export const AlertStatusEnum = z.enum(['FIRING', 'RESOLVED', 'ACKNOWLEDGED']);
export type AlertStatus = z.infer<typeof AlertStatusEnum>;

export const HttpMethodEnum = z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ANY']);
export type HttpMethod = z.infer<typeof HttpMethodEnum>;

export const LoadBalanceStrategyEnum = z.enum(['ROUND_ROBIN', 'LEAST_CONN', 'WEIGHTED', 'RANDOM']);
export type LoadBalanceStrategy = z.infer<typeof LoadBalanceStrategyEnum>;

export const ClusterStatusEnum = z.enum(['HEALTHY', 'DEGRADED', 'UNHEALTHY', 'UNKNOWN']);
export type ClusterStatus = z.infer<typeof ClusterStatusEnum>;

// ============================================
// Sub-schemas for complex types
// ============================================

export const UpstreamTargetSchema = z.object({
  host: z.string(),
  port: z.number().int().positive(),
  weight: z.number().int().nonnegative().optional(),
});

export const HealthCheckConfigSchema = z.object({
  enabled: z.boolean().default(true),
  interval: z.number().int().positive().default(30),
  timeout: z.number().int().positive().default(5),
  healthyThreshold: z.number().int().positive().default(2),
  unhealthyThreshold: z.number().int().positive().default(3),
});

export const UpstreamConfigSchema = z.object({
  targets: z.array(UpstreamTargetSchema).min(1),
  loadBalance: LoadBalanceStrategyEnum.default('ROUND_ROBIN'),
  healthCheck: HealthCheckConfigSchema.optional(),
});

export const RateLimitPolicySchema = z.object({
  requestsPerSecond: z.number().int().positive(),
  burst: z.number().int().positive(),
  keyPrefix: z.string().optional(),
});

export const RetryPolicySchema = z.object({
  retries: z.number().int().min(0).max(5).default(3),
  backoff: z.enum(['fixed', 'exponential', 'linear']).default('exponential'),
  maxBackoff: z.number().int().positive().default(30000),
});

// ============================================
// Main Models
// ============================================

// Server Model
export const ServerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(64),
  ip: z.string().ip(),
  port: z.number().int().min(1).max(65535),
  gpuCount: z.number().int().nonnegative(),
  gpuModel: z.string().min(1),
  totalMemory: z.bigint().positive(),
  status: ServerStatusEnum.default('OFFLINE'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Server = z.infer<typeof ServerSchema>;

// Server creation input (without id, createdAt, updatedAt)
export const ServerCreateInputSchema = ServerSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
}).extend({
  status: ServerStatusEnum.optional(),
});

export type ServerCreateInput = z.infer<typeof ServerCreateInputSchema>;

// GPU Model
export const GPUSchema = z.object({
  id: z.string().uuid(),
  serverId: z.string().uuid(),
  index: z.number().int().nonnegative(),
  model: z.string().min(1),
  memory: z.bigint().positive(),
  usedMemory: z.bigint().nonnegative(),
  status: GPUStatusEnum.default('IDLE'),
  allocatedTo: z.string().uuid().nullable(),
});

export type GPU = z.infer<typeof GPUSchema>;

// GPU creation input
export const GPUCreateInputSchema = GPUSchema.omit({
  id: true,
  usedMemory: true,
  status: true,
  allocatedTo: true,
}).extend({
  usedMemory: z.bigint().optional(),
  status: GPUStatusEnum.optional(),
  allocatedTo: z.string().uuid().nullable().optional(),
});

export type GPUCreateInput = z.infer<typeof GPUCreateInputSchema>;

// Allocation Model
export const AllocationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  gpuId: z.string().uuid(),
  serverId: z.string().uuid(),
  requestedAt: z.date(),
  allocatedAt: z.date().nullable(),
  expiresAt: z.date().nullable(),
  status: AllocationStatusEnum.default('PENDING'),
  metadata: z.record(z.string()).nullable(),
});

export type Allocation = z.infer<typeof AllocationSchema>;

// Allocation creation input
export const AllocationCreateInputSchema = AllocationSchema.omit({
  id: true,
  requestedAt: true,
  allocatedAt: true,
  expiresAt: true,
  status: true,
}).extend({
  allocatedAt: z.date().optional(),
  expiresAt: z.date().optional(),
  status: AllocationStatusEnum.optional(),
  metadata: z.record(z.string()).optional(),
});

export type AllocationCreateInput = z.infer<typeof AllocationCreateInputSchema>;

// Alert Model
export const AlertSchema = z.object({
  id: z.string().uuid(),
  ruleId: z.string().uuid(),
  severity: AlertSeverityEnum,
  source: z.string().min(1),
  message: z.string().min(1),
  triggeredAt: z.date(),
  acknowledgedAt: z.date().nullable(),
  acknowledgedBy: z.string().uuid().nullable(),
  status: AlertStatusEnum.default('FIRING'),
});

export type Alert = z.infer<typeof AlertSchema>;

// Alert creation input
export const AlertCreateInputSchema = AlertSchema.omit({
  id: true,
  triggeredAt: true,
  acknowledgedAt: true,
  acknowledgedBy: true,
  status: true,
}).extend({
  acknowledgedAt: z.date().optional(),
  acknowledgedBy: z.string().uuid().optional(),
  status: AlertStatusEnum.optional(),
});

export type AlertCreateInput = z.infer<typeof AlertCreateInputSchema>;

// RouteConfig Model
export const RouteConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(64),
  path: z.string().min(1).startsWith('/'),
  method: HttpMethodEnum.default('ANY'),
  upstream: UpstreamConfigSchema,
  rateLimit: RateLimitPolicySchema.nullable(),
  authRequired: z.boolean().default(false),
  timeout: z.number().int().positive().max(300000).default(30000),
  retryPolicy: RetryPolicySchema.nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  version: z.number().int().positive().default(1),
});

export type RouteConfig = z.infer<typeof RouteConfigSchema>;

// RouteConfig creation input
export const RouteConfigCreateInputSchema = RouteConfigSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  version: true,
}).extend({
  version: z.number().int().optional(),
});

export type RouteConfigCreateInput = z.infer<typeof RouteConfigCreateInputSchema>;

// Cluster Model
export const ClusterSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(64),
  apiServer: z.string().url(),
  kubeconfig: z.string().min(1),
  version: z.string().nullable(),
  nodeCount: z.number().int().nonnegative().default(0),
  gpuNodeCount: z.number().int().nonnegative().default(0),
  status: ClusterStatusEnum.default('UNKNOWN'),
  labels: z.record(z.string()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Cluster = z.infer<typeof ClusterSchema>;

// Cluster creation input
export const ClusterCreateInputSchema = ClusterSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  version: true,
  nodeCount: true,
  gpuNodeCount: true,
  status: true,
}).extend({
  version: z.string().optional(),
  nodeCount: z.number().int().nonnegative().optional(),
  gpuNodeCount: z.number().int().nonnegative().optional(),
  status: ClusterStatusEnum.optional(),
});

export type ClusterCreateInput = z.infer<typeof ClusterCreateInputSchema>;

// ============================================
// Filter Types
// ============================================

export const ServerFilterSchema = z.object({
  status: ServerStatusEnum.optional(),
  gpuModel: z.string().optional(),
  name: z.string().optional(),
});

export type ServerFilter = z.infer<typeof ServerFilterSchema>;

export const AllocationFilterSchema = z.object({
  userId: z.string().uuid().optional(),
  gpuId: z.string().uuid().optional(),
  serverId: z.string().uuid().optional(),
  status: AllocationStatusEnum.optional(),
});

export type AllocationFilter = z.infer<typeof AllocationFilterSchema>;

export const AlertFilterSchema = z.object({
  ruleId: z.string().uuid().optional(),
  severity: AlertSeverityEnum.optional(),
  source: z.string().optional(),
  status: AlertStatusEnum.optional(),
  from: z.date().optional(),
  to: z.date().optional(),
});

export type AlertFilter = z.infer<typeof AlertFilterSchema>;

export const RouteFilterSchema = z.object({
  name: z.string().optional(),
  path: z.string().optional(),
  method: HttpMethodEnum.optional(),
});

export type RouteFilter = z.infer<typeof RouteFilterSchema>;

export const ClusterFilterSchema = z.object({
  status: ClusterStatusEnum.optional(),
  labels: z.record(z.string()).optional(),
  name: z.string().optional(),
});

export type ClusterFilter = z.infer<typeof ClusterFilterSchema>;

// ============================================
// Validation Helper Functions
// ============================================

export function validateServer(data: unknown): Server {
  return ServerSchema.parse(data);
}

export function validateServerCreateInput(data: unknown): ServerCreateInput {
  return ServerCreateInputSchema.parse(data);
}

export function validateGPU(data: unknown): GPU {
  return GPUSchema.parse(data);
}

export function validateGPUCreateInput(data: unknown): GPUCreateInput {
  return GPUCreateInputSchema.parse(data);
}

export function validateAllocation(data: unknown): Allocation {
  return AllocationSchema.parse(data);
}

export function validateAllocationCreateInput(data: unknown): AllocationCreateInput {
  return AllocationCreateInputSchema.parse(data);
}

export function validateAlert(data: unknown): Alert {
  return AlertSchema.parse(data);
}

export function validateAlertCreateInput(data: unknown): AlertCreateInput {
  return AlertCreateInputSchema.parse(data);
}

export function validateRouteConfig(data: unknown): RouteConfig {
  return RouteConfigSchema.parse(data);
}

export function validateRouteConfigCreateInput(data: unknown): RouteConfigCreateInput {
  return RouteConfigCreateInputSchema.parse(data);
}

export function validateCluster(data: unknown): Cluster {
  return ClusterSchema.parse(data);
}

export function validateClusterCreateInput(data: unknown): ClusterCreateInput {
  return ClusterCreateInputSchema.parse(data);
}

// Safe validation (returns result instead of throwing)
export function safeValidateServer(data: unknown): { success: true; data: Server } | { success: false; error: z.ZodError } {
  const result = ServerSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function safeValidateGPU(data: unknown): { success: true; data: GPU } | { success: false; error: z.ZodError } {
  const result = GPUSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function safeValidateCluster(data: unknown): { success: true; data: Cluster } | { success: false; error: z.ZodError } {
  const result = ClusterSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}