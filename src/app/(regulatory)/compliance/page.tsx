/**
 * Regulatory Compliance Dashboard Page
 *
 * Dashboard interface for regulatory officers to monitor compliance
 * status across all cooperative product batches and view detailed
 * compliance reports and metrics.
 *
 * Features:
 * - Compliance metrics overview
 * - Flagged products and violations
 * - Regional compliance monitoring
 * - Detailed compliance reports
 *
 * @since 1.0.0
 */

'use client';

// Disable static generation due to crypto dependencies
export const dynamic = 'force-dynamic';

import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

/**
 * Compliance Dashboard Page Component
 */
export default function CompliancePage() {
  return (
    <div className='mx-auto max-w-6xl px-4 py-8'>
      {/* Header */}
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-gray-900'>
          Compliance Dashboard
        </h1>
        <p className='mt-2 text-gray-600'>
          Monitor regulatory compliance across all cooperative product batches.
        </p>
      </div>

      {/* Compliance Overview */}
      <div className='mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4'>
        <Card className='p-6'>
          <div className='text-2xl font-bold text-green-600'>100%</div>
          <div className='text-sm text-gray-600'>Overall Compliance Rate</div>
          <div className='mt-2 text-xs text-green-600'>
            All products compliant
          </div>
        </Card>
        <Card className='p-6'>
          <div className='text-2xl font-bold text-gray-900'>0</div>
          <div className='text-sm text-gray-600'>Flagged Products</div>
          <div className='mt-2 text-xs text-gray-500'>
            No violations detected
          </div>
        </Card>
        <Card className='p-6'>
          <div className='text-2xl font-bold text-blue-600'>0</div>
          <div className='text-sm text-gray-600'>Active Investigations</div>
          <div className='mt-2 text-xs text-gray-500'>No ongoing cases</div>
        </Card>
        <Card className='p-6'>
          <div className='text-2xl font-bold text-purple-600'>0</div>
          <div className='text-sm text-gray-600'>Reports Generated</div>
          <div className='mt-2 text-xs text-gray-500'>This month</div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className='mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
        <Card className='p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='text-lg font-medium text-gray-900'>
                Generate Report
              </h3>
              <p className='mt-1 text-sm text-gray-600'>
                Create compliance report for specific period
              </p>
            </div>
            <div className='flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100'>
              <span className='text-2xl'>📊</span>
            </div>
          </div>
          <div className='mt-4'>
            <Button className='w-full' disabled>
              Generate Report
            </Button>
            <p className='mt-1 text-xs text-gray-500'>Coming soon</p>
          </div>
        </Card>

        <Card className='p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='text-lg font-medium text-gray-900'>
                Review Violations
              </h3>
              <p className='mt-1 text-sm text-gray-600'>
                Investigate flagged products and violations
              </p>
            </div>
            <div className='flex h-12 w-12 items-center justify-center rounded-lg bg-red-100'>
              <span className='text-2xl'>🚩</span>
            </div>
          </div>
          <div className='mt-4'>
            <Button variant='outline' className='w-full' disabled>
              Review Violations
            </Button>
            <p className='mt-1 text-xs text-gray-500'>
              No violations to review
            </p>
          </div>
        </Card>

        <Card className='p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='text-lg font-medium text-gray-900'>Export Data</h3>
              <p className='mt-1 text-sm text-gray-600'>
                Export compliance data for external analysis
              </p>
            </div>
            <div className='flex h-12 w-12 items-center justify-center rounded-lg bg-green-100'>
              <span className='text-2xl'>📤</span>
            </div>
          </div>
          <div className='mt-4'>
            <Button variant='outline' className='w-full' disabled>
              Export Data
            </Button>
            <p className='mt-1 text-xs text-gray-500'>Coming soon</p>
          </div>
        </Card>
      </div>

      {/* Regional Overview */}
      <div className='mb-8'>
        <h2 className='mb-4 text-xl font-semibold text-gray-900'>
          Regional Compliance Overview
        </h2>
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
          <Card className='p-6'>
            <h3 className='mb-4 text-lg font-medium text-gray-900'>
              Nigeria - Regional Breakdown
            </h3>
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-gray-600'>Lagos State</span>
                <div className='flex items-center gap-2'>
                  <div className='h-2 w-16 rounded-full bg-gray-200'>
                    <div className='h-2 w-full rounded-full bg-green-500'></div>
                  </div>
                  <span className='text-sm font-medium text-green-600'>
                    100%
                  </span>
                </div>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-gray-600'>Ogun State</span>
                <div className='flex items-center gap-2'>
                  <div className='h-2 w-16 rounded-full bg-gray-200'>
                    <div className='h-2 w-full rounded-full bg-green-500'></div>
                  </div>
                  <span className='text-sm font-medium text-green-600'>
                    100%
                  </span>
                </div>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-gray-600'>Oyo State</span>
                <div className='flex items-center gap-2'>
                  <div className='h-2 w-16 rounded-full bg-gray-200'>
                    <div className='h-2 w-full rounded-full bg-green-500'></div>
                  </div>
                  <span className='text-sm font-medium text-green-600'>
                    100%
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card className='p-6'>
            <h3 className='mb-4 text-lg font-medium text-gray-900'>
              Compliance Trends
            </h3>
            <div className='py-8 text-center'>
              <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100'>
                <span className='text-2xl'>📈</span>
              </div>
              <p className='mt-4 text-sm text-gray-600'>
                Compliance trend chart will appear here when data is available.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <div className='mb-8'>
        <h2 className='mb-4 text-xl font-semibold text-gray-900'>
          Recent Compliance Activity
        </h2>
        <Card className='p-6'>
          <div className='py-8 text-center'>
            <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100'>
              <span className='text-2xl'>📋</span>
            </div>
            <h3 className='mt-4 text-lg font-medium text-gray-900'>
              No compliance activity
            </h3>
            <p className='mt-2 text-sm text-gray-600'>
              Compliance events and investigations will appear here.
            </p>
          </div>
        </Card>
      </div>

      {/* Help Section */}
      <div>
        <h2 className='mb-4 text-xl font-semibold text-gray-900'>
          Compliance Resources
        </h2>
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
          <Card className='p-6'>
            <h3 className='mb-2 text-lg font-medium text-gray-900'>
              Regulatory Framework
            </h3>
            <ul className='space-y-2 text-sm text-gray-600'>
              <li>• Nigeria Food Safety Standards</li>
              <li>• Organic Certification Requirements</li>
              <li>• Regional Trade Regulations</li>
              <li>• Hedera Compliance Guidelines</li>
            </ul>
          </Card>
          <Card className='p-6'>
            <h3 className='mb-2 text-lg font-medium text-gray-900'>
              Key Monitoring Areas
            </h3>
            <ul className='space-y-2 text-sm text-gray-600'>
              <li>• Daily production limits (1000kg)</li>
              <li>• Seasonal restrictions enforcement</li>
              <li>• Quality assessment compliance</li>
              <li>• Supply chain transparency</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
