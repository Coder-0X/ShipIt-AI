import { NextResponse } from 'next/server';

/**
 * Health Check Endpoint for Container Orchestration.
 * Used by Docker, Kubernetes, Cloud Run, and AWS ECS for
 * readiness and liveness probes.
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0-enterprise',
    uptime: process.uptime(),
  }, { status: 200 });
}
