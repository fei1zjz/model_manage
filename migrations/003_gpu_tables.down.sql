-- Rollback GPU Compute Platform tables
DROP TABLE IF EXISTS "gpu_allocations" CASCADE;
DROP TABLE IF EXISTS "gpu_alerts" CASCADE;
DROP TABLE IF EXISTS "gpu_route_configs" CASCADE;
DROP TABLE IF EXISTS "gpu_clusters" CASCADE;
DROP TABLE IF EXISTS "gpu_gpus" CASCADE;
DROP TABLE IF EXISTS "gpu_servers" CASCADE;

DROP TYPE IF EXISTS "ClusterStatus";
DROP TYPE IF EXISTS "LoadBalanceStrategy";
DROP TYPE IF EXISTS "HttpMethod";
DROP TYPE IF EXISTS "AlertStatus";
DROP TYPE IF EXISTS "AlertSeverity";
DROP TYPE IF EXISTS "AllocationStatus";
DROP TYPE IF EXISTS "GPUStatus";
DROP TYPE IF EXISTS "ServerStatus";
