// GPU Compute Platform - Cache Module
// Main entry point for Redis cache operations

// Client exports
export {
  redis,
  getConnectionStatus,
  getConnectionInfo,
  checkRedisConnection,
  disconnectRedis,
  forceReconnect,
} from './client';

// Helper function exports
export {
  buildKey,
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheDeletePattern,
  cacheExpire,
  cacheTTL,
  cacheExists,
  cacheIncr,
  cacheIncrBy,
  cacheDecr,
  cacheSetCounter,
  cacheGetCounter,
  cacheMGet,
  cacheMSet,
  getCacheStats,
  CacheNamespaces,
  CacheTTL,
} from './helpers';

// Type exports
export type {
  CacheSetOptions,
  CacheGetResult,
  CacheStats,
  RedisConnectionStatus,
  RedisConnectionInfo,
  CacheNamespace,
} from './types';
