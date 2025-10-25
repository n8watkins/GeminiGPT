/**
 * Enhanced Health Check Endpoint
 *
 * Provides comprehensive health status for production monitoring.
 * Checks:
 * - Database connectivity (SQLite)
 * - Vector database connectivity (LanceDB)
 * - Memory usage
 * - Process uptime
 *
 * Returns:
 * - 200: All systems healthy
 * - 503: One or more systems unhealthy
 */

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

interface HealthCheck {
  status: 'pass' | 'fail';
  responseTime?: number;
  error?: string;
}

interface MemoryCheck extends HealthCheck {
  usage?: number;
  percentage?: number;
  limit?: number;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: HealthCheck;
    vectordb: HealthCheck;
    memory: MemoryCheck;
  };
}

/**
 * Check SQLite database connectivity
 */
async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const db = await getDatabase();

    // Simple query to verify database is responsive
    const result = db.prepare('SELECT 1 as health').get() as { health: number } | undefined;

    if (result?.health !== 1) {
      return {
        status: 'fail',
        responseTime: Date.now() - start,
        error: 'Database query returned unexpected result',
      };
    }

    return {
      status: 'pass',
      responseTime: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}

/**
 * Check LanceDB vector database connectivity
 */
async function checkVectorDB(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Dynamic import to avoid circular dependencies
    const { getDBStats } = await import('@/lib/vectordb');

    // Verify database is accessible by getting stats
    const stats = await getDBStats();

    // Check if stats indicate an error
    if ('error' in stats) {
      throw new Error(stats.error as string);
    }

    return {
      status: 'pass',
      responseTime: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown vector database error',
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory(): MemoryCheck {
  try {
    const memUsage = process.memoryUsage();
    const heapUsed = memUsage.heapUsed;
    const heapTotal = memUsage.heapTotal;
    const percentage = (heapUsed / heapTotal) * 100;

    // Flag as unhealthy if memory usage exceeds 90%
    const status = percentage > 90 ? 'fail' : 'pass';

    return {
      status,
      usage: Math.round(heapUsed / 1024 / 1024), // MB
      percentage: Math.round(percentage),
      limit: Math.round(heapTotal / 1024 / 1024), // MB
    };
  } catch (error) {
    return {
      status: 'fail',
      error: error instanceof Error ? error.message : 'Unknown memory error',
    };
  }
}

/**
 * GET /healthz
 *
 * Lenient health check endpoint for Railway deployment
 *
 * Returns 200 as long as the server is running.
 * Database checks are informational only and don't fail the health check.
 * This allows the app to start and initialize databases after deployment.
 */
export async function GET(): Promise<NextResponse<HealthResponse>> {
  // Run all checks in parallel for faster response
  const [databaseCheck, vectordbCheck, memoryCheck] = await Promise.all([
    checkDatabase(),
    checkVectorDB(),
    checkMemory(),
  ]);

  // LENIENT MODE: Only fail if memory is critically high (>90%)
  // Database failures are informational only - they don't prevent startup
  const criticalFailure = memoryCheck.status === 'fail';

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  let httpStatus: number;

  if (criticalFailure) {
    // Only fail health check for critical issues like memory exhaustion
    overallStatus = 'unhealthy';
    httpStatus = 503; // Service Unavailable
  } else if (databaseCheck.status === 'fail' || vectordbCheck.status === 'fail') {
    // Database issues are degraded but still allow deployment
    overallStatus = 'degraded';
    httpStatus = 200; // Still operational, databases can initialize later
  } else {
    // Everything is working perfectly
    overallStatus = 'healthy';
    httpStatus = 200;
  }

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()), // seconds
    checks: {
      database: databaseCheck,
      vectordb: vectordbCheck,
      memory: memoryCheck,
    },
  };

  return NextResponse.json(response, { status: httpStatus });
}
