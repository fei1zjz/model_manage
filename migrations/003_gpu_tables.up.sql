-- GPU Compute Platform tables
-- Creates tables for Server, GPU, Allocation, Alert, RouteConfig, Cluster models

-- CreateEnum (skip user_role — already exists)
DO $$ BEGIN
  CREATE TYPE "ServerStatus" AS ENUM ('ONLINE', 'OFFLINE', 'MAINTENANCE', 'ERROR');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "GPUStatus" AS ENUM ('IDLE', 'BUSY', 'ERROR', 'RESERVED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AllocationStatus" AS ENUM ('PENDING', 'ACTIVE', 'RELEASED', 'EXPIRED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AlertStatus" AS ENUM ('FIRING', 'RESOLVED', 'ACKNOWLEDGED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "HttpMethod" AS ENUM ('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ANY');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "LoadBalanceStrategy" AS ENUM ('ROUND_ROBIN', 'LEAST_CONN', 'WEIGHTED', 'RANDOM');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ClusterStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'UNHEALTHY', 'UNKNOWN');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- gpu_servers
CREATE TABLE IF NOT EXISTS "gpu_servers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "gpuCount" INTEGER NOT NULL,
    "gpuModel" TEXT NOT NULL,
    "totalMemory" BIGINT NOT NULL,
    "status" "ServerStatus" NOT NULL DEFAULT 'OFFLINE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "gpu_servers_pkey" PRIMARY KEY ("id")
);

-- gpu_gpus
CREATE TABLE IF NOT EXISTS "gpu_gpus" (
    "id" TEXT NOT NULL,
    "server_id" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "memory" BIGINT NOT NULL,
    "used_memory" BIGINT NOT NULL DEFAULT 0,
    "status" "GPUStatus" NOT NULL DEFAULT 'IDLE',
    "allocated_to" TEXT,
    CONSTRAINT "gpu_gpus_pkey" PRIMARY KEY ("id")
);

-- gpu_allocations
CREATE TABLE IF NOT EXISTS "gpu_allocations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "gpu_id" TEXT NOT NULL,
    "server_id" TEXT NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "allocated_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "status" "AllocationStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    CONSTRAINT "gpu_allocations_pkey" PRIMARY KEY ("id")
);

-- gpu_alerts
CREATE TABLE IF NOT EXISTS "gpu_alerts" (
    "id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_at" TIMESTAMP(3),
    "acknowledged_by" TEXT,
    "status" "AlertStatus" NOT NULL DEFAULT 'FIRING',
    CONSTRAINT "gpu_alerts_pkey" PRIMARY KEY ("id")
);

-- gpu_route_configs
CREATE TABLE IF NOT EXISTS "gpu_route_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "method" "HttpMethod" NOT NULL DEFAULT 'ANY',
    "upstream" JSONB NOT NULL,
    "rate_limit" JSONB,
    "auth_required" BOOLEAN NOT NULL DEFAULT false,
    "timeout" INTEGER NOT NULL DEFAULT 30000,
    "retry_policy" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "gpu_route_configs_pkey" PRIMARY KEY ("id")
);

-- gpu_clusters
CREATE TABLE IF NOT EXISTS "gpu_clusters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "api_server" TEXT NOT NULL,
    "kubeconfig" TEXT NOT NULL,
    "version" TEXT,
    "node_count" INTEGER NOT NULL DEFAULT 0,
    "gpu_node_count" INTEGER NOT NULL DEFAULT 0,
    "status" "ClusterStatus" NOT NULL DEFAULT 'UNKNOWN',
    "labels" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "gpu_clusters_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "gpu_servers_status_idx" ON "gpu_servers"("status");
CREATE INDEX IF NOT EXISTS "gpu_servers_gpuModel_idx" ON "gpu_servers"("gpuModel");
CREATE INDEX IF NOT EXISTS "gpu_servers_name_idx" ON "gpu_servers"("name");

CREATE INDEX IF NOT EXISTS "gpu_gpus_status_idx" ON "gpu_gpus"("status");
CREATE INDEX IF NOT EXISTS "gpu_gpus_server_id_idx" ON "gpu_gpus"("server_id");
CREATE UNIQUE INDEX IF NOT EXISTS "gpu_gpus_server_id_index_key" ON "gpu_gpus"("server_id", "index");

CREATE INDEX IF NOT EXISTS "gpu_allocations_user_id_idx" ON "gpu_allocations"("user_id");
CREATE INDEX IF NOT EXISTS "gpu_allocations_status_idx" ON "gpu_allocations"("status");
CREATE INDEX IF NOT EXISTS "gpu_allocations_gpu_id_idx" ON "gpu_allocations"("gpu_id");
CREATE INDEX IF NOT EXISTS "gpu_allocations_expires_at_idx" ON "gpu_allocations"("expires_at");

CREATE INDEX IF NOT EXISTS "gpu_alerts_rule_id_idx" ON "gpu_alerts"("rule_id");
CREATE INDEX IF NOT EXISTS "gpu_alerts_status_idx" ON "gpu_alerts"("status");
CREATE INDEX IF NOT EXISTS "gpu_alerts_source_idx" ON "gpu_alerts"("source");
CREATE INDEX IF NOT EXISTS "gpu_alerts_triggered_at_idx" ON "gpu_alerts"("triggered_at");

CREATE INDEX IF NOT EXISTS "gpu_route_configs_path_idx" ON "gpu_route_configs"("path");
CREATE INDEX IF NOT EXISTS "gpu_route_configs_method_idx" ON "gpu_route_configs"("method");
CREATE UNIQUE INDEX IF NOT EXISTS "gpu_route_configs_name_key" ON "gpu_route_configs"("name");

CREATE INDEX IF NOT EXISTS "gpu_clusters_status_idx" ON "gpu_clusters"("status");
CREATE INDEX IF NOT EXISTS "gpu_clusters_api_server_idx" ON "gpu_clusters"("api_server");
CREATE UNIQUE INDEX IF NOT EXISTS "gpu_clusters_name_key" ON "gpu_clusters"("name");

-- Foreign keys
ALTER TABLE "gpu_gpus" DROP CONSTRAINT IF EXISTS "gpu_gpus_server_id_fkey";
ALTER TABLE "gpu_gpus" ADD CONSTRAINT "gpu_gpus_server_id_fkey"
  FOREIGN KEY ("server_id") REFERENCES "gpu_servers"("id") ON DELETE CASCADE;

ALTER TABLE "gpu_allocations" DROP CONSTRAINT IF EXISTS "gpu_allocations_gpu_id_fkey";
ALTER TABLE "gpu_allocations" ADD CONSTRAINT "gpu_allocations_gpu_id_fkey"
  FOREIGN KEY ("gpu_id") REFERENCES "gpu_gpus"("id") ON DELETE SET NULL;

ALTER TABLE "gpu_allocations" DROP CONSTRAINT IF EXISTS "gpu_allocations_server_id_fkey";
ALTER TABLE "gpu_allocations" ADD CONSTRAINT "gpu_allocations_server_id_fkey"
  FOREIGN KEY ("server_id") REFERENCES "gpu_servers"("id") ON DELETE SET NULL;
