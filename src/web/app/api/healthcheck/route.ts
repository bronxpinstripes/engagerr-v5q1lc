import { NextResponse } from 'next/server';

/**
 * GET handler for the health check endpoint
 * Provides a simple HTTP ping response to verify API route availability
 * This implements the HTTP Ping health check that runs every 30 seconds
 * as specified in the monitoring strategy
 */
export async function GET() {
  // Record start time to calculate response time
  const startTime = performance.now();
  
  // Create health status object
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0', // In a real app this would come from package.json
    environment: process.env.NODE_ENV || 'development',
  };
  
  // Calculate response time
  const responseTime = performance.now() - startTime;
  healthStatus.responseTime = `${responseTime.toFixed(2)}ms`;
  
  // Return health status with headers to prevent caching
  return NextResponse.json(
    healthStatus,
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
    }
  );
}