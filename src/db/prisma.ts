// GPU Compute Platform - Database Client
// Prisma client wrapper with connection management

import { PrismaClient } from '@prisma/client';

// Global singleton for Prisma client (prevents connection exhaustion in development)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Save Prisma client in global for development hot-reloading
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

// Health check for database connection
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export default prisma;