-- GPU Compute Platform - Initial Schema Migration
-- This migration creates the core database schema for the GPU Compute Platform
-- It includes tables for servers, GPUs, allocations, alerts, route configs, and clusters

-- ============================================
-- ENUM Types
-- ============================================

-- Server status enum: represents the operational state of a GPU server
CREATE TYPE server_status AS ENUM ('ONLINE', 'OFFLINE', 'MAINTENANCE', 'ERROR');

-- GPU status enum: represents the current state of a GPU device
CREATE TYPE gpu_status AS ENUM ('IDLE', 'BUSY', 'ERROR', 'RESERVED');

-- Allocation status enum: represents the lifecycle state of a GPU allocation
CREATE TYPE allocation_status AS ENUM ('PENDING', 'ACTIVE', 'RELEASED', 'EXPIRED', 'FAILED');

-- Alert severity enum: represents the importance level of an alert
CREATE TYPE alert_severity AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- Alert status enum: represents the current state of an alert
CREATE TYPE alert_status AS ENUM ('FIRING', 'RESOLVED', 'ACKNOWLEDGED');

-- HTTP method enum: supported HTTP methods for route configuration
CREATE TYPE http_method AS ENUM ('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ANY');

-- Load balance strategy enum: supported load balancing algorithms
CREATE TYPE load_balance_strategy AS ENUM ('ROUND_ROBIN', 'LEAST_CONN', 'WEIGHTED', 'RANDOM');

-- Cluster status enum: represents the health state of a Kubernetes cluster
CREATE TYPE cluster_status AS ENUM ('HEALTHY', 'DEGRADED', 'UNHEALTHY', 'UNKNOWN');

-- ============================================
-- Tables
-- ============================================

-- Server Table: Stores GPU server resources
-- Each server represents a physical or virtual machine with GPU capabilities
CREATE TABLE servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    ip VARCHAR(45) NOT NULL,  -- Supports both IPv4 and IPv6
    port INTEGER NOT NULL CHECK (port > 0 AND port <= 65535),
    gpu_count INTEGER NOT NULL DEFAULT 0 CHECK (gpu_count >= 0),
    gpu_model VARCHAR(255) NOT NULL,
    total_memory BIGINT NOT NULL CHECK (total_memory >= 0),
    status server_status NOT NULL DEFAULT 'OFFLINE',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Comments for documentation
COMMENT ON TABLE servers IS 'GPU server resources managed by the platform';
COMMENT ON COLUMN servers.id IS 'Unique identifier for the server';
COMMENT ON COLUMN servers.name IS 'Human-readable server name (1-64 characters)';
COMMENT ON COLUMN servers.ip IS 'Server IP address (IPv4 or IPv6)';
COMMENT ON COLUMN servers.port IS 'Server port number (1-65535)';
COMMENT ON COLUMN servers.gpu_count IS 'Number of GPUs installed on the server';
COMMENT ON COLUMN servers.gpu_model IS 'Model of GPUs (e.g., NVIDIA-A100)';
COMMENT ON COLUMN servers.total_memory IS 'Total GPU memory in bytes';
COMMENT ON COLUMN servers.status IS 'Current operational status of the server';

-- GPU Table: Stores individual GPU devices
-- Each GPU belongs to a server and can be allocated to users
CREATE TABLE gpus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    index INTEGER NOT NULL CHECK (index >= 0),
    model VARCHAR(255) NOT NULL,
    memory BIGINT NOT NULL CHECK (memory > 0),
    used_memory BIGINT NOT NULL DEFAULT 0 CHECK (used_memory >= 0 AND used_memory <= memory),
    status gpu_status NOT NULL DEFAULT 'IDLE',
    allocated_to UUID,  -- References allocation when GPU is allocated
    
    -- Ensure each GPU has a unique index per server
    CONSTRAINT unique_gpu_index_per_server UNIQUE (server_id, index)
);

-- Comments for documentation
COMMENT ON TABLE gpus IS 'Individual GPU devices managed by the platform';
COMMENT ON COLUMN gpus.id IS 'Unique identifier for the GPU';
COMMENT ON COLUMN gpus.server_id IS 'Reference to the server this GPU belongs to';
COMMENT ON COLUMN gpus.index IS 'GPU index within the server (0 to gpuCount-1)';
COMMENT ON COLUMN gpus.model IS 'GPU model name';
COMMENT ON COLUMN gpus.memory IS 'Total GPU memory in bytes';
COMMENT ON COLUMN gpus.used_memory IS 'Currently used GPU memory in bytes';
COMMENT ON COLUMN gpus.status IS 'Current status of the GPU';
COMMENT ON COLUMN gpus.allocated_to IS 'Reference to active allocation when GPU is busy';

-- Allocation Table: Records GPU resource allocations
-- Tracks the lifecycle of GPU assignments to users
CREATE TABLE allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    gpu_id UUID NOT NULL REFERENCES gpus(id) ON DELETE SET NULL,
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE SET NULL,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    allocated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    status allocation_status NOT NULL DEFAULT 'PENDING',
    metadata JSONB  -- Flexible key-value storage for additional allocation data
);

-- Comments for documentation
COMMENT ON TABLE allocations IS 'GPU resource allocation records';
COMMENT ON COLUMN allocations.id IS 'Unique identifier for the allocation';
COMMENT ON COLUMN allocations.user_id IS 'ID of the user who requested the allocation';
COMMENT ON COLUMN allocations.gpu_id IS 'Reference to the allocated GPU';
COMMENT ON COLUMN allocations.server_id IS 'Reference to the server hosting the GPU';
COMMENT ON COLUMN allocations.requested_at IS 'Timestamp when allocation was requested';
COMMENT ON COLUMN allocations.allocated_at IS 'Timestamp when allocation was fulfilled';
COMMENT ON COLUMN allocations.expires_at IS 'Timestamp when allocation will expire';
COMMENT ON COLUMN allocations.status IS 'Current status of the allocation';
COMMENT ON COLUMN allocations.metadata IS 'Additional allocation metadata as key-value pairs';

-- Alert Table: Stores system alerts
-- Records alerts triggered by monitoring rules
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL,
    severity alert_severity NOT NULL,
    source VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID,
    status alert_status NOT NULL DEFAULT 'FIRING'
);

-- Comments for documentation
COMMENT ON TABLE alerts IS 'System alert records';
COMMENT ON COLUMN alerts.id IS 'Unique identifier for the alert';
COMMENT ON COLUMN alerts.rule_id IS 'ID of the rule that triggered this alert';
COMMENT ON COLUMN alerts.severity IS 'Severity level of the alert';
COMMENT ON COLUMN alerts.source IS 'Source component that generated the alert';
COMMENT ON COLUMN alerts.message IS 'Human-readable alert message';
COMMENT ON COLUMN alerts.triggered_at IS 'Timestamp when alert was triggered';
COMMENT ON COLUMN alerts.acknowledged_at IS 'Timestamp when alert was acknowledged';
COMMENT ON COLUMN alerts.acknowledged_by IS 'ID of user who acknowledged the alert';
COMMENT ON COLUMN alerts.status IS 'Current status of the alert';

-- Route Config Table: Stores API gateway route configurations
-- Defines how incoming requests are routed to backend services
CREATE TABLE route_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    path VARCHAR(512) NOT NULL,
    method http_method NOT NULL DEFAULT 'ANY',
    upstream JSONB NOT NULL,  -- UpstreamConfig: targets, loadBalance, healthCheck
    rate_limit JSONB,  -- RateLimitPolicy: requestsPerSecond, burst
    auth_required BOOLEAN NOT NULL DEFAULT FALSE,
    timeout INTEGER NOT NULL DEFAULT 30000,  -- milliseconds
    retry_policy JSONB,  -- RetryPolicy: retries, backoff
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1
);

-- Comments for documentation
COMMENT ON TABLE route_configs IS 'API gateway route configurations';
COMMENT ON COLUMN route_configs.id IS 'Unique identifier for the route config';
COMMENT ON COLUMN route_configs.name IS 'Unique name for the route';
COMMENT ON COLUMN route_configs.path IS 'URL path pattern for the route';
COMMENT ON COLUMN route_configs.method IS 'HTTP method this route handles';
COMMENT ON COLUMN route_configs.upstream IS 'Upstream configuration as JSON (targets, loadBalance, healthCheck)';
COMMENT ON COLUMN route_configs.rate_limit IS 'Rate limiting policy as JSON (requestsPerSecond, burst)';
COMMENT ON COLUMN route_configs.auth_required IS 'Whether authentication is required for this route';
COMMENT ON COLUMN route_configs.timeout IS 'Request timeout in milliseconds';
COMMENT ON COLUMN route_configs.retry_policy IS 'Retry policy as JSON (retries, backoff)';
COMMENT ON COLUMN route_configs.version IS 'Configuration version number for versioning';

-- Cluster Table: Stores Kubernetes cluster information
-- Manages registered K8s clusters for workload deployment
CREATE TABLE clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    api_server VARCHAR(512) NOT NULL,
    kubeconfig TEXT NOT NULL,  -- Should be encrypted in production
    version VARCHAR(64),
    node_count INTEGER NOT NULL DEFAULT 0 CHECK (node_count >= 0),
    gpu_node_count INTEGER NOT NULL DEFAULT 0 CHECK (gpu_node_count >= 0),
    status cluster_status NOT NULL DEFAULT 'UNKNOWN',
    labels JSONB,  -- Map<String, String> for cluster labeling
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Comments for documentation
COMMENT ON TABLE clusters IS 'Kubernetes cluster configurations';
COMMENT ON COLUMN clusters.id IS 'Unique identifier for the cluster';
COMMENT ON COLUMN clusters.name IS 'Unique name for the cluster';
COMMENT ON COLUMN clusters.api_server IS 'Kubernetes API server endpoint';
COMMENT ON COLUMN clusters.kubeconfig IS 'Kubeconfig for cluster access (encrypted)';
COMMENT ON COLUMN clusters.version IS 'Kubernetes version';
COMMENT ON COLUMN clusters.node_count IS 'Total number of nodes in the cluster';
COMMENT ON COLUMN clusters.gpu_node_count IS 'Number of nodes with GPU capacity';
COMMENT ON COLUMN clusters.status IS 'Current health status of the cluster';
COMMENT ON COLUMN clusters.labels IS 'Cluster labels as key-value pairs';

-- ============================================
-- Indexes
-- ============================================

-- Server indexes for efficient filtering
CREATE INDEX idx_servers_status ON servers(status);
CREATE INDEX idx_servers_gpu_model ON servers(gpu_model);
CREATE INDEX idx_servers_name ON servers(name);

-- GPU indexes for efficient querying
CREATE INDEX idx_gpus_status ON gpus(status);
CREATE INDEX idx_gpus_server_id ON gpus(server_id);

-- Allocation indexes for efficient filtering and lookups
CREATE INDEX idx_allocations_user_id ON allocations(user_id);
CREATE INDEX idx_allocations_status ON allocations(status);
CREATE INDEX idx_allocations_gpu_id ON allocations(gpu_id);
CREATE INDEX idx_allocations_expires_at ON allocations(expires_at);

-- Alert indexes for efficient filtering and lookups
CREATE INDEX idx_alerts_rule_id ON alerts(rule_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_source ON alerts(source);
CREATE INDEX idx_alerts_triggered_at ON alerts(triggered_at);

-- Route config indexes for efficient filtering
CREATE INDEX idx_route_configs_path ON route_configs(path);
CREATE INDEX idx_route_configs_method ON route_configs(method);

-- Cluster indexes for efficient filtering
CREATE INDEX idx_clusters_status ON clusters(status);
CREATE INDEX idx_clusters_api_server ON clusters(api_server);

-- ============================================
-- Triggers for updated_at timestamps
-- ============================================

-- Function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to servers table
CREATE TRIGGER update_servers_updated_at
    BEFORE UPDATE ON servers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to route_configs table
CREATE TRIGGER update_route_configs_updated_at
    BEFORE UPDATE ON route_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to clusters table
CREATE TRIGGER update_clusters_updated_at
    BEFORE UPDATE ON clusters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Constraints for GPU index validation
-- ============================================

-- Add check constraint to ensure GPU index is within valid range
-- This is a complex constraint that references the parent server's gpu_count
-- Note: PostgreSQL doesn't support cross-table CHECK constraints directly,
-- so we use a trigger for this validation

CREATE OR REPLACE FUNCTION validate_gpu_index()
RETURNS TRIGGER AS $$
DECLARE
    server_gpu_count INTEGER;
BEGIN
    SELECT gpu_count INTO server_gpu_count FROM servers WHERE id = NEW.server_id;
    
    IF NEW.index >= server_gpu_count THEN
        RAISE EXCEPTION 'GPU index % is out of range for server with gpu_count %', NEW.index, server_gpu_count;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER validate_gpu_index_trigger
    BEFORE INSERT OR UPDATE ON gpus
    FOR EACH ROW
    EXECUTE FUNCTION validate_gpu_index();
