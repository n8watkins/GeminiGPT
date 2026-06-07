/**
 * Health Check Endpoint
 *
 * Ultra-simple health check for Railway deployment. Returns 200 OK if the
 * server process is running — Railway only needs to know the HTTP server
 * started successfully.
 */

import { NextResponse } from 'next/server';

/**
 * GET /healthz
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
