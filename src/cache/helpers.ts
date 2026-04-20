// GPU Compute Platform - Cache Helper Functions
// Utility functions for cache operations

import { redis } from './client';
import { CacheNamespaces, CacheTTL, CacheSetOptions, CacheGetResult, CacheStats, CacheNamespace } from './types';

/**
 * Build a cache key with namespace
 */
export function buildKey(namespace: CacheNamespace, ...parts: (string | number)[]): string {
  return [namespace, ...parts.map(String)].join(':');
}

/**
 * Get a value from cache
 */
export async function cacheGet<T>(key: string): Promise<CacheGetResult<T>> {
  try {
    const value = await redis.get(key);
    
    if (value === null) {
      return { found: false, value: null };
    }
    
    return { found: true, value: JSON.parse(value) as T };
  } catch (error) {
    console.error(`[Cache] Get error for key ${key}:`, error);
    return { found: false, value: null };
  }
}

/**
 * Set a value in cache
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  options: CacheSetOptions = {}
): Promise<boolean> {
  try {
    const serialized = JSON.stringify(value);
    const { ttl, nx, xx } = options;
    
    if (ttl) {
      if (nx) {
        const result = await redis.set(key, serialized, 'EX', ttl, 'NX');
        return result === 'OK';
      }
      if (xx) {
        const result = await redis.set(key, serialized, 'EX', ttl, 'XX');
        return result === 'OK';
      }
      const result = await redis.set(key, serialized, 'EX', ttl);
      return result === 'OK';
    }
    
    if (nx) {
      const result = await redis.set(key, serialized, 'NX');
      return result === 'OK';
    }
    if (xx) {
      const result = await redis.set(key, serialized, 'XX');
      return result === 'OK';
    }
    
    const result = await redis.set(key, serialized);
    return result === 'OK';
  } catch (error) {
    console.error(`[Cache] Set error for key ${key}:`, error);
    return false;
  }
}

/**
 * Delete a key from cache
 */
export async function cacheDelete(key: string): Promise<boolean> {
  try {
    const result = await redis.del(key);
    return result > 0;
  } catch (error) {
    console.error(`[Cache] Delete error for key ${key}:`, error);
    return false;
  }
}

/**
 * Delete multiple keys matching a pattern
 */
export async function cacheDeletePattern(pattern: string): Promise<number> {
  try {
    const keys = await redis.keys(pattern);
    
    if (keys.length === 0) {
      return 0;
    }
    
    const result = await redis.del(...keys);
    return result;
  } catch (error) {
    console.error(`[Cache] Delete pattern error for ${pattern}:`, error);
    return 0;
  }
}

/**
 * Set expiration on a key
 */
export async function cacheExpire(key: string, ttl: number): Promise<boolean> {
  try {
    const result = await redis.expire(key, ttl);
    return result === 1;
  } catch (error) {
    console.error(`[Cache] Expire error for key ${key}:`, error);
    return false;
  }
}

/**
 * Get remaining TTL of a key
 */
export async function cacheTTL(key: string): Promise<number> {
  try {
    return await redis.ttl(key);
  } catch (error) {
    console.error(`[Cache] TTL error for key ${key}:`, error);
    return -1;
  }
}

/**
 * Check if a key exists
 */
export async function cacheExists(key: string): Promise<boolean> {
  try {
    const result = await redis.exists(key);
    return result === 1;
  } catch (error) {
    console.error(`[Cache] Exists error for key ${key}:`, error);
    return false;
  }
}

/**
 * Increment a counter
 */
export async function cacheIncr(key: string): Promise<number> {
  try {
    return await redis.incr(key);
  } catch (error) {
    console.error(`[Cache] Incr error for key ${key}:`, error);
    return -1;
  }
}

/**
 * Increment a counter by amount
 */
export async function cacheIncrBy(key: string, amount: number): Promise<number> {
  try {
    return await redis.incrby(key, amount);
  } catch (error) {
    console.error(`[Cache] IncrBy error for key ${key}:`, error);
    return -1;
  }
}

/**
 * Decrement a counter
 */
export async function cacheDecr(key: string): Promise<number> {
  try {
    return await redis.decr(key);
  } catch (error) {
    console.error(`[Cache] Decr error for key ${key}:`, error);
    return -1;
  }
}

/**
 * Set a counter with expiration
 */
export async function cacheSetCounter(
  key: string,
  value: number,
  ttl?: number
): Promise<boolean> {
  try {
    if (ttl) {
      const result = await redis.set(key, value, 'EX', ttl);
      return result === 'OK';
    }
    const result = await redis.set(key, value);
    return result === 'OK';
  } catch (error) {
    console.error(`[Cache] SetCounter error for key ${key}:`, error);
    return false;
  }
}

/**
 * Get a counter value
 */
export async function cacheGetCounter(key: string): Promise<number | null> {
  try {
    const value = await redis.get(key);
    return value !== null ? parseInt(value, 10) : null;
  } catch (error) {
    console.error(`[Cache] GetCounter error for key ${key}:`, error);
    return null;
  }
}

/**
 * Get multiple values at once
 */
export async function cacheMGet<T>(keys: string[]): Promise<Map<string, T | null>> {
  const result = new Map<string, T | null>();
  
  if (keys.length === 0) {
    return result;
  }
  
  try {
    const values = await redis.mget(...keys);
    
    keys.forEach((key, index) => {
      const value = values[index];
      if (value !== null) {
        try {
          result.set(key, JSON.parse(value) as T);
        } catch {
          result.set(key, null);
        }
      } else {
        result.set(key, null);
      }
    });
    
    return result;
  } catch (error) {
    console.error('[Cache] MGet error:', error);
    return result;
  }
}

/**
 * Set multiple values at once
 */
export async function cacheMSet<T>(
  entries: Array<{ key: string; value: T; ttl?: number }>
): Promise<boolean> {
  if (entries.length === 0) {
    return true;
  }
  
  try {
    const pipeline = redis.pipeline();
    
    for (const { key, value, ttl } of entries) {
      const serialized = JSON.stringify(value);
      if (ttl) {
        pipeline.set(key, serialized, 'EX', ttl);
      } else {
        pipeline.set(key, serialized);
      }
    }
    
    await pipeline.exec();
    return true;
  } catch (error) {
    console.error('[Cache] MSet error:', error);
    return false;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<CacheStats> {
  try {
    const info = await redis.info('memory');
    const clientsInfo = await redis.info('clients');
    const statsInfo = await redis.info('stats');
    const dbSize = await redis.dbsize();
    
    // Parse memory info
    const usedMemoryMatch = info.match(/used_memory:(\d+)/);
    const usedMemory = usedMemoryMatch ? parseInt(usedMemoryMatch[1], 10) : 0;
    
    // Parse clients info
    const connectedClientsMatch = clientsInfo.match(/connected_clients:(\d+)/);
    const connectedClients = connectedClientsMatch 
      ? parseInt(connectedClientsMatch[1], 10) 
      : 0;
    
    // Parse stats
    const hitsMatch = statsInfo.match(/keyspace_hits:(\d+)/);
    const missesMatch = statsInfo.match(/keyspace_misses:(\d+)/);
    const hits = hitsMatch ? parseInt(hitsMatch[1], 10) : 0;
    const misses = missesMatch ? parseInt(missesMatch[1], 10) : 0;
    
    return {
      connectedClients,
      usedMemory,
      totalKeys: dbSize,
      hits,
      misses,
    };
  } catch (error) {
    console.error('[Cache] Stats error:', error);
    return {
      connectedClients: 0,
      usedMemory: 0,
      totalKeys: 0,
      hits: 0,
      misses: 0,
    };
  }
}

// Re-export types and constants
export { CacheNamespaces, CacheTTL };
