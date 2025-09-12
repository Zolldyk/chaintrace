'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  SystemHealthSummary,
  HealthCheckResult,
  HealthStatus,
} from '@/services/health/HealthCheckService';

/**
 * Props interface for HealthStatusDashboard component.
 */
interface HealthStatusDashboardProps {
  /** Automatic refresh interval in milliseconds (default: 30000) */
  refreshInterval?: number;
  /** Whether to show detailed service information */
  showDetails?: boolean;
  /** Whether to automatically refresh health status */
  autoRefresh?: boolean;
  /** Custom CSS classes */
  className?: string;
  /** Callback when health status changes */
  onHealthChange?: (health: SystemHealthSummary) => void;
}

/**
 * Comprehensive health status dashboard component for monitoring all ChainTrace services.
 *
 * Provides real-time monitoring of system health with visual indicators, service details,
 * performance metrics, and automated refresh capabilities for demonstration readiness.
 *
 * @component HealthStatusDashboard
 *
 * @example
 * ```tsx
 * <HealthStatusDashboard
 *   refreshInterval={15000}
 *   showDetails={true}
 *   autoRefresh={true}
 *   onHealthChange={(health) => console.log('Status:', health)}
 * />
 * ```
 *
 * @since 1.0.0
 */
export const HealthStatusDashboard: React.FC<HealthStatusDashboardProps> = ({
  refreshInterval = 30000,
  showDetails = true,
  autoRefresh = true,
  className = '',
  onHealthChange,
}) => {
  const [healthStatus, setHealthStatus] = useState<SystemHealthSummary | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches current system health status from API.
   */
  const fetchHealthStatus = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/health', {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(
          `Health check failed: ${response.status} ${response.statusText}`
        );
      }

      const health: SystemHealthSummary = await response.json();
      setHealthStatus(health);
      setLastRefresh(new Date());

      if (onHealthChange) {
        onHealthChange(health);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      // Error handled silently
    } finally {
      setIsLoading(false);
    }
  }, [onHealthChange]);

  // Initial fetch and auto-refresh setup
  useEffect(() => {
    fetchHealthStatus();

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchHealthStatus, refreshInterval);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [fetchHealthStatus, autoRefresh, refreshInterval]);

  /**
   * Gets status color class based on health status.
   */
  const getStatusColorClass = (status: HealthStatus): string => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'unhealthy':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  /**
   * Gets status icon based on health status.
   */
  const getStatusIcon = (status: HealthStatus): JSX.Element => {
    const iconClass = 'w-5 h-5';

    switch (status) {
      case 'healthy':
        return (
          <svg
            className={`${iconClass} text-green-600`}
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M5 13l4 4L19 7'
            />
          </svg>
        );
      case 'degraded':
        return (
          <svg
            className={`${iconClass} text-yellow-600`}
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
            />
          </svg>
        );
      case 'unhealthy':
        return (
          <svg
            className={`${iconClass} text-red-600`}
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M6 18L18 6M6 6l12 12'
            />
          </svg>
        );
      default:
        return (
          <svg
            className={`${iconClass} text-gray-600`}
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
        );
    }
  };

  /**
   * Formats uptime duration for display.
   */
  const formatUptime = (uptimeMs: number): string => {
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  /**
   * Renders individual service status card.
   */
  const renderServiceCard = (service: HealthCheckResult): JSX.Element => (
    <div
      key={service.service}
      className={`rounded-lg border p-4 ${getStatusColorClass(service.status)}`}
    >
      <div className='mb-2 flex items-center justify-between'>
        <div className='flex items-center space-x-2'>
          {getStatusIcon(service.status)}
          <h3 className='font-medium capitalize'>
            {service.service.replace('-', ' ')}
          </h3>
          {service.critical && (
            <span className='rounded bg-orange-100 px-2 py-1 text-xs text-orange-600'>
              Critical
            </span>
          )}
        </div>
        <span className='text-sm font-medium capitalize'>{service.status}</span>
      </div>

      <div className='space-y-1 text-sm'>
        <div className='flex justify-between'>
          <span>Response Time:</span>
          <span className='font-medium'>{service.responseTime}ms</span>
        </div>

        {service.error && (
          <div className='mt-2 rounded bg-red-50 p-2 text-xs text-red-600'>
            {service.error}
          </div>
        )}

        {showDetails && service.details && (
          <details className='mt-2'>
            <summary className='cursor-pointer text-xs opacity-75 hover:opacity-100'>
              Service Details
            </summary>
            <div className='mt-1 space-y-1 text-xs opacity-75'>
              {Object.entries(service.details).map(([key, value]) => (
                <div key={key} className='flex justify-between'>
                  <span className='capitalize'>
                    {key.replace(/([A-Z])/g, ' $1').trim()}:
                  </span>
                  <span className='font-mono'>{String(value)}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );

  if (error) {
    return (
      <div
        className={`rounded-lg border border-red-200 bg-red-50 p-6 ${className}`}
      >
        <div className='mb-2 flex items-center space-x-2'>
          <svg
            className='h-5 w-5 text-red-600'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 8v4m0 4h.01'
            />
          </svg>
          <h2 className='text-lg font-semibold text-red-800'>
            Health Check Failed
          </h2>
        </div>
        <p className='mb-4 text-red-700'>{error}</p>
        <button
          onClick={() => {
            setError(null);
            setIsLoading(true);
            fetchHealthStatus();
          }}
          className='rounded bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700'
        >
          Retry Health Check
        </button>
      </div>
    );
  }

  if (isLoading || !healthStatus) {
    return (
      <div
        className={`rounded-lg border border-gray-200 bg-gray-50 p-6 ${className}`}
      >
        <div className='flex items-center justify-center space-x-2'>
          <svg
            className='h-5 w-5 animate-spin text-gray-600'
            fill='none'
            viewBox='0 0 24 24'
          >
            <circle
              className='opacity-25'
              cx='12'
              cy='12'
              r='10'
              stroke='currentColor'
              strokeWidth='4'
            />
            <path
              className='opacity-75'
              fill='currentColor'
              d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
            />
          </svg>
          <span className='text-gray-600'>Checking system health...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overall System Status */}
      <div
        className={`rounded-lg border p-6 ${getStatusColorClass(healthStatus.status)}`}
      >
        <div className='mb-4 flex items-center justify-between'>
          <div className='flex items-center space-x-3'>
            {getStatusIcon(healthStatus.status)}
            <h1 className='text-xl font-semibold'>System Status</h1>
          </div>
          <div className='text-right'>
            <div className='text-2xl font-bold capitalize'>
              {healthStatus.status}
            </div>
            <div className='text-sm opacity-75'>
              {lastRefresh?.toLocaleTimeString()}
            </div>
          </div>
        </div>

        <div className='grid grid-cols-2 gap-4 text-sm md:grid-cols-4'>
          <div className='text-center'>
            <div className='text-2xl font-bold text-green-600'>
              {healthStatus.healthyServices}
            </div>
            <div className='opacity-75'>Healthy</div>
          </div>
          <div className='text-center'>
            <div className='text-2xl font-bold text-yellow-600'>
              {healthStatus.degradedServices}
            </div>
            <div className='opacity-75'>Degraded</div>
          </div>
          <div className='text-center'>
            <div className='text-2xl font-bold text-red-600'>
              {healthStatus.unhealthyServices}
            </div>
            <div className='opacity-75'>Unhealthy</div>
          </div>
          <div className='text-center'>
            <div className='text-2xl font-bold'>
              {healthStatus.totalResponseTime}ms
            </div>
            <div className='opacity-75'>Total Response</div>
          </div>
        </div>

        <div className='mt-4 border-t border-current border-opacity-20 pt-4'>
          <div className='flex items-center justify-between text-sm'>
            <span>System Uptime: {formatUptime(healthStatus.uptime)}</span>
            <div className='flex items-center space-x-4'>
              {autoRefresh && (
                <span className='opacity-75'>
                  Auto-refresh: {refreshInterval / 1000}s
                </span>
              )}
              <button
                onClick={fetchHealthStatus}
                disabled={isLoading}
                className='rounded bg-white bg-opacity-20 px-3 py-1 transition-colors hover:bg-opacity-30 disabled:opacity-50'
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Individual Service Status */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {healthStatus.services.map(renderServiceCard)}
      </div>

      {/* Performance Metrics */}
      {showDetails && (
        <div className='rounded-lg border border-gray-200 bg-gray-50 p-4'>
          <h3 className='mb-3 font-semibold'>Performance Summary</h3>
          <div className='grid grid-cols-2 gap-4 text-sm md:grid-cols-4'>
            <div>
              <div className='text-lg font-bold'>
                {Math.round(
                  (healthStatus.healthyServices / healthStatus.totalServices) *
                    100
                )}
                %
              </div>
              <div className='opacity-75'>Service Availability</div>
            </div>
            <div>
              <div className='text-lg font-bold'>
                {Math.round(
                  healthStatus.totalResponseTime / healthStatus.totalServices
                )}
                ms
              </div>
              <div className='opacity-75'>Avg Response Time</div>
            </div>
            <div>
              <div className='text-lg font-bold'>
                {healthStatus.services.filter(s => s.critical).length}
              </div>
              <div className='opacity-75'>Critical Services</div>
            </div>
            <div>
              <div className='text-lg font-bold'>
                {
                  healthStatus.services.filter(s => s.responseTime < 3000)
                    .length
                }
              </div>
              <div className='opacity-75'>Fast Responses (&lt;3s)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
