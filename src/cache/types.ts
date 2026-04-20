// GPU Compute Platform - Redis Cache Types
// Type definitions for cache operations

/**
 * Cache key namespaces for different data types
 */
export const CacheNamespaces = {
  // Server status caching
  SERVER_STATUS: 'server:status',
  SERVER_METRICS: 'server:metrics',
  
  // GPU availability caching
  GPU_STATUS: 'gpu:status',
  GPU_METRICS: 'gpu:metrics',
  GPU_AVAILABLE: 'gpu:available',
  
  // User quota caching
  USER_QUOTA: 'user:quota',
  USER_USAGE: 'user:usage',
  USER_ALLOCATIONS: 'user:allocations',
  
  // Session/token caching
  SESSION: 'session',
  TOKEN_BLACKLIST: 'token:blacklist',
  
  // Rate limiting counters
  RATE_LIMIT: 'ratelimit',
  RATE_LIMIT_GLOBAL: 'ratelimit:global',
} as const;

export type CacheNamespace = typeof CacheNamespaces[keyof typeof CacheNamespaces];

/**
 * Default TTL values (in seconds) for different cache types
 */
export const CacheTTL = {
  // Server status: 30 seconds (health check interval)
  SERVER_STATUS: 30,
  SERVER_METRICS: 60,
  
  // GPU status: 10 seconds (frequent updates)
  GPU_STATUS: 10,
  GPU_METRICS: 60,
  GPU_AVAILABLE: 10,
  
  // User quota: 5 minutes
  USER_QUOTA: 300,
  USER_USAGE: 60,
  USER_ALLOCATIONS: 60,
  
  // Session: 24 hours (matches JWT expiry)
  SESSION: 86400,
  TOKEN_BLACKLIST: 86400,
  
  // Rate limiting: 1 minute window
  RATE_LIMIT: 60,
} as const;

/**
 * Options for cache operations
 */
export interface CacheSetOptions {
  /** Time to live in seconds */
  ttl?: number;
  /** Only set if key does not exist */
  nx?: boolean;
  /** Only set if key already exists */
  xx?: boolean;
}

/**
 * Result of a cache get operation
 */
export interface CacheGetResult<T> {
  /** Whether the key was found */
  found: boolean;
  /** The cached value (null if not found) */
  value: T | null;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Number of connected clients */
  connectedClients: number;
  /** Used memory in bytes */
  usedMemory: number;
  /** Total keys in database */
  totalKeys: number;
  /** Hits count */
  hits: number;
  /** Misses count */
  misses: number;
}

/**
 * Redis connection status
 */
export type RedisConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

/**
 * Redis connection info
 */
export interface RedisConnectionInfo {
  status: RedisConnectionStatus;
  host: string;
  port: number;
  db: number;
}
