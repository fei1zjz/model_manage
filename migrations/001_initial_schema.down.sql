-- GPU Compute Platform - Initial Schema Migration Rollback
-- This migration removes all tables, types, and functions created in the UP migration
-- Execute this to completely rollback the initial schema

-- ============================================
-- Drop Triggers
-- ============================================

-- Drop GPU index validation trigger
DROP TRIGGER IF EXISTS validate_gpu_index_trigger ON gpus;

-- Drop updated_at triggers
DROP TRIGGER IF EXISTS update_servers_updated_at ON servers;
DROP TRIGGER IF EXISTS update_route_configs_updated_at ON route_configs;
DROP TRIGGER IF EXISTS update_clusters_updated_at ON clusters;

-- ============================================
-- Drop Functions
-- ============================================

-- Drop validation and utility functions
DROP FUNCTION IF EXISTS validate_gpu_index();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- ============================================
-- Drop Tables (order matters due to foreign keys)
-- ============================================

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS clusters;
DROP TABLE IF EXISTS route_configs;
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS allocations;
DROP TABLE IF EXISTS gpus;
DROP TABLE IF EXISTS servers;

-- ============================================
-- Drop ENUM Types
-- ============================================

-- Drop enum types in reverse creation order
DROP TYPE IF EXISTS cluster_status;
DROP TYPE IF EXISTS load_balance_strategy;
DROP TYPE IF EXISTS http_method;
DROP TYPE IF EXISTS alert_status;
DROP TYPE IF EXISTS alert_severity;
DROP TYPE IF EXISTS allocation_status;
DROP TYPE IF EXISTS gpu_status;
DROP TYPE IF EXISTS server_status;
