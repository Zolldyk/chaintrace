/**
 * Cooperative Manager Dashboard Page
 *
 * Main dashboard interface for cooperative managers to oversee product
 * batch creation, view statistics, and access key management features.
 * This serves as the primary navigation hub for Story 2.2 functionality.
 *
 * Features:
 * - Quick access to batch creation
 * - Dashboard statistics and metrics
 * - Recent batches overview
 * - Quick actions and navigation
 *
 * @since 1.0.0
 */

'use client';

// Disable static generation due to crypto dependencies
export const dynamic = 'force-dynamic';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

/**
 * Manager Dashboard Page Component
 */
export default function ManagerDashboardPage() {
  return (
    <div className='mx-auto max-w-6xl px-4 py-8'>
      {/* Header */}
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-gray-900'>Manager Dashboard</h1>
        <p className='mt-2 text-gray-600'>
          Manage your cooperative&apos;s product batches and verification
          workflow.
        </p>
      </div>

      {/* Quick Actions */}
      <div className='mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
        <Card className='p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='text-lg font-medium text-gray-900'>
                Create Product Batch
              </h3>
              <p className='mt-1 text-sm text-gray-600'>
                Log new products with compliance validation
              </p>
            </div>
            <div className='flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100'>
              <span className='text-2xl'>📦</span>
            </div>
          </div>
          <div className='mt-4'>
            <Link href='/batch/create'>
              <Button className='w-full'>Create Batch</Button>
            </Link>
          </div>
        </Card>

        <Card className='p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='text-lg font-medium text-gray-900'>
                View Batches
              </h3>
              <p className='mt-1 text-sm text-gray-600'>
                Review and manage existing product batches
              </p>
            </div>
            <div className='flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100'>
              <span className='text-2xl'>📋</span>
            </div>
          </div>
          <div className='mt-4'>
            <Button variant='outline' className='w-full' disabled>
              View Batches
            </Button>
            <p className='mt-1 text-xs text-gray-500'>Coming soon</p>
          </div>
        </Card>

        <Card className='p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='text-lg font-medium text-gray-900'>
                Compliance Reports
              </h3>
              <p className='mt-1 text-sm text-gray-600'>
                View compliance status and reports
              </p>
            </div>
            <div className='flex h-12 w-12 items-center justify-center rounded-lg bg-green-100'>
              <span className='text-2xl'>✅</span>
            </div>
          </div>
          <div className='mt-4'>
            <Link href='/compliance'>
              <Button variant='outline' className='w-full'>
                View Compliance
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Dashboard Stats */}
      <div className='mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4'>
        <Card className='p-6'>
          <div className='text-2xl font-bold text-gray-900'>0</div>
          <div className='text-sm text-gray-600'>Total Batches</div>
        </Card>
        <Card className='p-6'>
          <div className='text-2xl font-bold text-gray-900'>0</div>
          <div className='text-sm text-gray-600'>Products Logged</div>
        </Card>
        <Card className='p-6'>
          <div className='text-2xl font-bold text-green-600'>0%</div>
          <div className='text-sm text-gray-600'>Compliance Rate</div>
        </Card>
        <Card className='p-6'>
          <div className='text-2xl font-bold text-blue-600'>0</div>
          <div className='text-sm text-gray-600'>Verified Products</div>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className='mb-8'>
        <h2 className='mb-4 text-xl font-semibold text-gray-900'>
          Recent Activity
        </h2>
        <Card className='p-6'>
          <div className='py-8 text-center'>
            <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100'>
              <span className='text-2xl'>📊</span>
            </div>
            <h3 className='mt-4 text-lg font-medium text-gray-900'>
              No recent activity
            </h3>
            <p className='mt-2 text-sm text-gray-600'>
              Create your first product batch to see activity here.
            </p>
            <div className='mt-4'>
              <Link href='/batch/create'>
                <Button>Create First Batch</Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>

      {/* Help Section */}
      <div>
        <h2 className='mb-4 text-xl font-semibold text-gray-900'>
          Getting Started
        </h2>
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
          <Card className='p-6'>
            <h3 className='mb-2 text-lg font-medium text-gray-900'>
              Quick Start Guide
            </h3>
            <ul className='space-y-2 text-sm text-gray-600'>
              <li>• Connect your Hedera wallet</li>
              <li>• Create your first product batch</li>
              <li>• Generate QR codes for verification</li>
              <li>• Monitor compliance status</li>
            </ul>
          </Card>
          <Card className='p-6'>
            <h3 className='mb-2 text-lg font-medium text-gray-900'>
              Key Features
            </h3>
            <ul className='space-y-2 text-sm text-gray-600'>
              <li>• Batch operations up to 100 products</li>
              <li>• Real-time compliance validation</li>
              <li>• Automatic local backup</li>
              <li>• Processing time under 2 minutes</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
