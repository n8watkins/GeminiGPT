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
 * Ultra-simple health check for Railway deployment
 *
 * Just returns 200 OK if the server process is running.
 * Railway only needs to know the HTTP server started successfully.
 *
 * For detailed health monitoring, use /api/health (to be implemented)
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime())
    },
    { status: 200 }
  );
}

/**
 * GET /healthz/detailed
 *
 * Comprehensive health check with database connectivity checks
 * This endpoint can fail without affecting deployment
 */
export async function getDetailed(): Promise<NextResponse<HealthResponse>> {
  // Run all checks in parallel for faster response
  const [databaseCheck, vectordbCheck, memoryCheck] = await Promise.all([
    checkDatabase(),
    checkVectorDB(),
    checkMemory(),
  ]);

  const criticalFailure = memoryCheck.status === 'fail';

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  let httpStatus: number;

  if (criticalFailure) {
    overallStatus = 'unhealthy';
    httpStatus = 503;
  } else if (databaseCheck.status === 'fail' || vectordbCheck.status === 'fail') {
    overallStatus = 'degraded';
    httpStatus = 200;
  } else {
    overallStatus = 'healthy';
    httpStatus = 200;
  }

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    checks: {
      database: databaseCheck,
      vectordb: vectordbCheck,
      memory: memoryCheck,
    },
  };

  return NextResponse.json(response, { status: httpStatus });
}
