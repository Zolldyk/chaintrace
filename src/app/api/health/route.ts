import { NextRequest, NextResponse } from 'next/server';
import { getHealthCheckService } from '@/services/health/HealthCheckService';
import { logger } from '@/lib/logger';

/**
 * System health check endpoint
 *
 * @route GET /api/health
 * @returns {SystemHealthSummary} Complete system health summary with all service statuses
 * @throws {500} Internal server error during health check execution
 * @throws {503} Service unavailable when critical services are down
 *
 * @example
 * GET /api/health
 * Response: {
 *   "status": "healthy",
 *   "totalResponseTime": 2450,
 *   "healthyServices": 5,
 *   "degradedServices": 1,
 *   "unhealthyServices": 0,
 *   "totalServices": 6,
 *   "timestamp": "2024-01-01T12:00:00Z",
 *   "uptime": 1800000,
 *   "services": [
 *     {
 *       "service": "hedera",
 *       "status": "healthy",
 *       "responseTime": 1200,
 *       "timestamp": "2024-01-01T12:00:00Z",
 *       "critical": true,
 *       "details": {
 *         "accountId": "0.0.6628267",
 *         "balance": "5.2345 HBAR",
 *         "networkType": "testnet"
 *       }
 *     },
 *     // ... other services
 *   ]
 * }
 *
 * @security Public endpoint for monitoring - no authentication required
 * @ratelimit 60 requests per minute per IP
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const services = searchParams.get('services')?.split(',') || undefined;
    const timeout = searchParams.get('timeout')
      ? parseInt(searchParams.get('timeout')!)
      : undefined;
    const parallel = searchParams.get('parallel') !== 'false'; // Default to true

    // Initialize health check service with query parameters
    const healthCheckService = getHealthCheckService({
      ...(services && { services }),
      ...(timeout && { timeout }),
      parallel,
    });

    // Perform comprehensive health check
    const healthSummary = await healthCheckService.checkOverallHealth();

    // Determine HTTP status code based on system health
    let statusCode = 200;
    if (healthSummary.status === 'degraded') {
      statusCode = 206; // Partial Content - some services degraded
    } else if (healthSummary.status === 'unhealthy') {
      statusCode = 503; // Service Unavailable - critical services down
    }

    // Add additional metadata
    const responseData = {
      ...healthSummary,
      metadata: {
        healthCheckVersion: '1.0.0',
        endpoint: '/api/health',
        requestedServices: services,
        checkParameters: {
          timeout,
          parallel,
        },
      },
    };

    return NextResponse.json(responseData, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    logger.error(
      'Health check endpoint error',
      error instanceof Error ? error : new Error(String(error)),
      { endpoint: '/api/health' }
    );

    // Return error response with minimal system information
    const errorResponse = {
      status: 'unknown' as const,
      error: 'Health check execution failed',
      timestamp: new Date().toISOString(),
      details: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * Specific service health check endpoint
 *
 * @route GET /api/health/[service]
 * @param service - Name of specific service to check (hedera, mirror-node, hcs, hts, compliance, database)
 * @returns {HealthCheckResult} Individual service health result
 * @throws {404} Service not found or not configured
 * @throws {500} Internal server error during health check execution
 *
 * @example
 * GET /api/health/hedera
 * Response: {
 *   "service": "hedera",
 *   "status": "healthy",
 *   "responseTime": 1200,
 *   "timestamp": "2024-01-01T12:00:00Z",
 *   "critical": true,
 *   "details": {
 *     "accountId": "0.0.6628267",
 *     "balance": "5.2345 HBAR",
 *     "networkType": "testnet",
 *     "hasInsufficientBalance": false
 *   }
 * }
 *
 * @security Public endpoint for monitoring - no authentication required
 * @ratelimit 100 requests per minute per IP
 */
export async function checkSpecificService(serviceName: string) {
  try {
    const healthCheckService = getHealthCheckService();

    // Get overall health to find the specific service
    const healthSummary = await healthCheckService.checkOverallHealth();
    const serviceResult = healthSummary.services.find(
      s => s.service === serviceName
    );

    if (!serviceResult) {
      return NextResponse.json(
        {
          error: `Service '${serviceName}' not found`,
          availableServices: healthSummary.services.map(s => s.service),
        },
        { status: 404 }
      );
    }

    // Determine HTTP status code based on service health
    let statusCode = 200;
    if (serviceResult.status === 'degraded') {
      statusCode = 206; // Partial Content - service degraded
    } else if (serviceResult.status === 'unhealthy') {
      statusCode = 503; // Service Unavailable - service down
    }

    return NextResponse.json(serviceResult, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    logger.error(
      `Health check for service '${serviceName}' failed`,
      error instanceof Error ? error : new Error(String(error)),
      {
        endpoint: '/api/health',
        service: serviceName,
      }
    );

    const errorResponse = {
      service: serviceName,
      status: 'unknown' as const,
      error: 'Service health check failed',
      timestamp: new Date().toISOString(),
      details: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
