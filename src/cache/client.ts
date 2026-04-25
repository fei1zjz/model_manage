// GPU Compute Platform - Redis Client
// Redis connection module with connection pooling and error handling

import Redis from "ioredis";
import { RedisConnectionInfo, RedisConnectionStatus } from "./types";

// Parse Redis URL
function parseRedisUrl(url: string): {
  host: string;
  port: number;
  db: number;
  username?: string;
  password?: string;
} {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || "localhost",
    port: parsed.port ? parseInt(parsed.port, 10) : 6379,
    db:
      parsed.pathname && parsed.pathname.length > 1
        ? parseInt(parsed.pathname.slice(1), 10)
        : 0,
    username: parsed.username || undefined,
    password: parsed.password || undefined,
  };
}

// Redis configuration from environment
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const { host, port, db, username, password } = parseRedisUrl(REDIS_URL);

// Global singleton for Redis client (prevents connection exhaustion)
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

// Connection state tracking
let connectionStatus: RedisConnectionStatus = "disconnected";
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_BASE_DELAY = 100; // 100ms base delay

/**
 * Create Redis client with connection pooling and reconnection logic
 */
function createRedisClient(): Redis {
  const client = new Redis({
    host,
    port,
    db,
    username,
    password,
    // Connection pooling settings
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: true,
    // Reconnection strategy
    retryStrategy: (times: number) => {
      if (times > MAX_RECONNECT_ATTEMPTS) {
        console.error("[Redis] Max reconnection attempts reached");
        connectionStatus = "error";
        return null; // Stop retrying
      }

      // Exponential backoff with jitter
      const delay = Math.min(
        RECONNECT_BASE_DELAY * Math.pow(2, times) + Math.random() * 100,
        3000, // Max 3 seconds
      );

      console.log(
        `[Redis] Reconnecting in ${delay}ms (attempt ${times}/${MAX_RECONNECT_ATTEMPTS})`,
      );
      return delay;
    },
    // Keep-alive for connection health
    keepAlive: 10000, // 10 seconds
    // Command timeout
    commandTimeout: 5000, // 5 seconds
  });

  // Event handlers
  client.on("connect", () => {
    connectionStatus = "connecting";
    console.log("[Redis] Connecting...");
  });

  client.on("ready", () => {
    connectionStatus = "connected";
    reconnectAttempts = 0;
    console.log("[Redis] Connected and ready");
  });

  client.on("close", () => {
    connectionStatus = "disconnected";
    console.log("[Redis] Connection closed");
  });

  client.on("error", (error: Error) => {
    connectionStatus = "error";
    console.error("[Redis] Connection error:", error.message);
  });

  client.on("reconnecting", () => {
    connectionStatus = "connecting";
    reconnectAttempts++;
    console.log(`[Redis] Reconnecting (attempt ${reconnectAttempts})...`);
  });

  return client;
}

/**
 * Redis client instance (singleton)
 */
export const redis = globalForRedis.redis ?? createRedisClient();

// Save Redis client in global for development hot-reloading
if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

/**
 * Get current connection status
 */
export function getConnectionStatus(): RedisConnectionStatus {
  return connectionStatus;
}

/**
 * Get connection information
 */
export function getConnectionInfo(): RedisConnectionInfo {
  return {
    status: connectionStatus,
    host,
    port,
    db,
  };
}

/**
 * Check if Redis is connected and healthy
 */
export async function checkRedisConnection(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === "PONG";
  } catch (error) {
    console.error("[Redis] Health check failed:", error);
    return false;
  }
}

/**
 * Gracefully disconnect from Redis
 */
export async function disconnectRedis(): Promise<void> {
  try {
    await redis.quit();
    connectionStatus = "disconnected";
    console.log("[Redis] Disconnected gracefully");
  } catch (error) {
    console.error("[Redis] Error during disconnect:", error);
    // Force disconnect if quit fails
    redis.disconnect();
  }
}

/**
 * Force reconnect to Redis
 */
export async function forceReconnect(): Promise<boolean> {
  try {
    redis.disconnect();
    connectionStatus = "disconnected";

    // Wait a moment before reconnecting
    await new Promise((resolve) => setTimeout(resolve, 100));

    // The retryStrategy will handle reconnection
    await redis.connect();
    return true;
  } catch (error) {
    console.error("[Redis] Force reconnect failed:", error);
    return false;
  }
}

export default redis;
