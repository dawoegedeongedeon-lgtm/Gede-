import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Connection string from environment variable or standard local development default
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/tre13ze_db';

// Centralized Postgres connection pool
let pool: pg.Pool | null = null;
let prismaInstance: PrismaClient | null = null;

export function getPgPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('[PostgreSQL Pool Error]:', err.message);
    });
  }
  return pool;
}

export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    try {
      const pgPool = getPgPool();
      const adapter = new PrismaPg(pgPool);
      prismaInstance = new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
      });
    } catch (err: any) {
      console.warn('[Prisma Initialization Warning]:', err?.message);
      // Fallback direct PrismaClient instance if adapter creation encounters environment variances
      prismaInstance = new PrismaClient({
        log: ['error'],
      });
    }
  }
  return prismaInstance;
}

export const prisma = getPrismaClient();

/**
 * Health check to verify PostgreSQL connectivity
 */
export async function checkDatabaseConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    const client = getPrismaClient();
    // Test basic query to confirm connection
    await client.$queryRaw`SELECT 1 as health_check`;
    return { connected: true };
  } catch (err: any) {
    return {
      connected: false,
      error: err.message || 'Unable to connect to PostgreSQL database',
    };
  }
}
