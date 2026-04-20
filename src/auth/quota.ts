import { cacheGetCounter, cacheIncr, cacheDecr, cacheExpire } from '../cache';
import { allocationRepository } from '../repositories';

const DEFAULT_QUOTA = 5;

export async function getUserQuota(userId: string): Promise<number> {
  const val = await cacheGetCounter(`user:quota:${userId}`);
  return val ?? DEFAULT_QUOTA;
}

export async function getUserActiveCount(userId: string): Promise<number> {
  const val = await cacheGetCounter(`user:usage:${userId}`);
  if (val !== null) return val;
  return allocationRepository.countActiveByUserId(userId);
}

export async function checkQuota(userId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const [current, limit] = await Promise.all([getUserActiveCount(userId), getUserQuota(userId)]);
  return { allowed: current < limit, current, limit };
}

export async function incrementUsage(userId: string): Promise<void> {
  const key = `user:usage:${userId}`;
  await cacheIncr(key);
  await cacheExpire(key, 3600);
}

export async function decrementUsage(userId: string): Promise<void> {
  await cacheDecr(`user:usage:${userId}`);
}
