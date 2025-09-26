/**
 * Third-party credential verification page
 * Allows external parties to verify ChainTrace compliance credentials
 *
 * @since 1.0.0
 */

'use client';

// Disable static generation due to crypto dependencies
export const dynamic = 'force-dynamic';

import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { CredentialVerifier } from '@/components/verification/CredentialVerifier';
import type { CredentialVerificationResponse } from '@/types/compliance';

/**
 * Public credential verification page for third-party verification
 */
export default function CredentialVerificationPage() {
  const [recentVerifications, setRecentVerifications] = React.useState<
    Array<{ result: CredentialVerificationResponse; timestamp: Date }>
  >([]);

  const handleVerificationComplete = (
    result: CredentialVerificationResponse
  ) => {
    setRecentVerifications(prev => [
      { result, timestamp: new Date() },
      ...prev.slice(0, 4), // Keep only 5 most recent
    ]);
  };

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mx-auto max-w-2xl space-y-8'>
        {/* Page Header */}
        <div className='text-center'>
          <h1 className='mb-4 text-3xl font-bold text-gray-900'>
            Verify compliance credential
          </h1>
          <p className='mb-2 text-lg text-gray-600'>
            Verify the authenticity of ChainTrace compliance credentials
          </p>
          <p className='text-sm text-gray-500'>
            Enter a credential ID or scan a QR code to verify its validity and
            status
          </p>
        </div>

        {/* Main Verification Interface */}
        <CredentialVerifier
          showQRScanner={true}
          allowManualEntry={true}
          showDetailedResults={true}
          onVerificationComplete={handleVerificationComplete}
        />

        {/* How It Works */}
        <Card className='p-6'>
          <h2 className='mb-4 text-lg font-semibold text-gray-900'>
            How credential verification works
          </h2>
          <div className='space-y-4 text-sm text-gray-600'>
            <div className='flex items-start gap-3'>
              <span className='font-semibold text-blue-600'>1.</span>
              <div>
                <div className='font-medium text-gray-900'>
                  Enter credential ID
                </div>
                <div>
                  Enter the credential ID manually or scan the QR code provided
                  with the credential.
                </div>
              </div>
            </div>
            <div className='flex items-start gap-3'>
              <span className='font-semibold text-blue-600'>2.</span>
              <div>
                <div className='font-medium text-gray-900'>
                  Verification checks
                </div>
                <div>
                  We verify the credential&apos;s cryptographic signature,
                  expiration status, and blockchain presence.
                </div>
              </div>
            </div>
            <div className='flex items-start gap-3'>
              <span className='font-semibold text-blue-600'>3.</span>
              <div>
                <div className='font-medium text-gray-900'>View results</div>
                <div>
                  Get instant verification results with detailed information
                  about the credential&apos;s validity.
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Recent Verifications */}
        {recentVerifications.length > 0 && (
          <Card className='p-6'>
            <h2 className='mb-4 text-lg font-semibold text-gray-900'>
              Recent verifications
            </h2>
            <div className='space-y-3'>
              {recentVerifications.map((verification, index) => (
                <div
                  key={index}
                  className='flex items-center justify-between rounded-lg bg-gray-50 p-3'
                >
                  <div>
                    <div className='font-mono text-sm'>
                      {verification.result.credential?.id || 'Unknown ID'}
                    </div>
                    <div className='text-xs text-gray-500'>
                      {verification.timestamp.toLocaleString()}
                    </div>
                  </div>
                  <div
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                      verification.result.isValid
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    <span>{verification.result.isValid ? '✓' : '❌'}</span>
                    <span>
                      {verification.result.isValid ? 'Valid' : 'Invalid'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Trust Information */}
        <Card className='border-blue-200 bg-blue-50 p-6'>
          <div className='flex items-start gap-3'>
            <span className='text-2xl'>🔒</span>
            <div>
              <h3 className='mb-2 font-semibold text-blue-900'>
                Secure verification process
              </h3>
              <div className='space-y-2 text-sm text-blue-800'>
                <p>
                  All ChainTrace compliance credentials are cryptographically
                  signed and logged to the Hedera blockchain for immutable
                  verification.
                </p>
                <p>
                  This verification process checks the credential against our
                  secure database and blockchain records to ensure authenticity.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Contact Information */}
        <div className='text-center text-sm text-gray-500'>
          <p>
            Questions about credential verification?{' '}
            <a href='/contact' className='text-blue-600 hover:text-blue-800'>
              Contact our support team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
