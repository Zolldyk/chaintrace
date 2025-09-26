/**
 * Specific credential verification page
 * Direct verification page for a specific credential ID
 *
 * @since 1.0.0
 */

'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CredentialDisplay } from '@/components/verification/CredentialDisplay';
import { CredentialVerificationBadge } from '@/components/verification/CredentialBadge';
import type { CredentialVerificationResponse } from '@/types/compliance';
import { isValidCredentialId } from '@/lib/credential-validations';

/**
 * Loading state component
 */
function LoadingState() {
  return (
    <Card className='p-8 text-center'>
      <div className='mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-current border-t-transparent text-blue-600'></div>
      <div className='mb-2 text-lg font-medium text-gray-900'>
        Verifying Credential
      </div>
      <div className='text-sm text-gray-600'>
        Checking credential authenticity and status...
      </div>
    </Card>
  );
}

/**
 * Error state component
 */
function ErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <Card className='p-8 text-center'>
      <div className='mb-4 text-4xl'>❌</div>
      <div className='mb-2 text-lg font-medium text-red-900'>
        Verification Failed
      </div>
      <div className='mb-4 text-sm text-red-700'>{error}</div>
      <Button onClick={onRetry} variant='outline'>
        Try Again
      </Button>
    </Card>
  );
}

/**
 * Success state component
 */
function SuccessState({ result }: { result: CredentialVerificationResponse }) {
  return (
    <div className='space-y-6'>
      {/* Verification Result */}
      <Card className='p-6 text-center'>
        <CredentialVerificationBadge
          isValid={result.isValid}
          verifiedAt={result.verification.verifiedAt}
          className='mb-4'
        />
        <div className='mb-2 text-2xl font-bold text-gray-900'>
          {result.isValid ? 'Credential Verified' : 'Invalid Credential'}
        </div>
        <div className='text-sm text-gray-600'>
          Verified on {result.verification.verifiedAt.toLocaleDateString()} at{' '}
          {result.verification.verifiedAt.toLocaleTimeString()}
        </div>
      </Card>

      {/* Credential Details */}
      {result.isValid && result.credential && (
        <Card className='p-6'>
          <h2 className='mb-4 text-lg font-semibold text-gray-900'>
            Credential Details
          </h2>
          <CredentialDisplay
            credential={result.credential}
            showQRCode={false}
            showActions={false}
            showDetails={true}
          />
        </Card>
      )}

      {/* Verification Details */}
      <Card className='p-6'>
        <h2 className='mb-4 text-lg font-semibold text-gray-900'>
          Verification Summary
        </h2>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <div className='flex items-center gap-2'>
            <span
              className={
                result.verification.signatureValid
                  ? 'text-green-600'
                  : 'text-red-600'
              }
            >
              {result.verification.signatureValid ? '✓' : '❌'}
            </span>
            <span className='text-sm'>Signature Valid</span>
          </div>
          <div className='flex items-center gap-2'>
            <span
              className={
                result.verification.notExpired
                  ? 'text-green-600'
                  : 'text-red-600'
              }
            >
              {result.verification.notExpired ? '✓' : '❌'}
            </span>
            <span className='text-sm'>Not Expired</span>
          </div>
          <div className='flex items-center gap-2'>
            <span
              className={
                result.verification.notRevoked
                  ? 'text-green-600'
                  : 'text-red-600'
              }
            >
              {result.verification.notRevoked ? '✓' : '❌'}
            </span>
            <span className='text-sm'>Not Revoked</span>
          </div>
          {result.verification.blockchainValid !== undefined && (
            <div className='flex items-center gap-2'>
              <span
                className={
                  result.verification.blockchainValid
                    ? 'text-green-600'
                    : 'text-red-600'
                }
              >
                {result.verification.blockchainValid ? '✓' : '❌'}
              </span>
              <span className='text-sm'>Blockchain Verified</span>
            </div>
          )}
        </div>
      </Card>

      {/* Error Details */}
      {!result.isValid && result.error && (
        <Card className='border-red-200 bg-red-50 p-6'>
          <h2 className='mb-2 text-lg font-semibold text-red-900'>
            Verification Failed
          </h2>
          <div className='mb-1 text-sm text-red-800'>
            {result.error.message}
          </div>
          <div className='text-xs text-red-700'>
            Error Code: {result.error.code}
          </div>
        </Card>
      )}
    </div>
  );
}

/**
 * Direct credential verification page
 */
export default function SpecificCredentialVerificationPage() {
  const params = useParams();
  const credentialId = params.credentialId as string;

  const [verificationResult, setVerificationResult] =
    React.useState<CredentialVerificationResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Verify credential on page load
  const verifyCredential = React.useCallback(async () => {
    if (!credentialId) return;

    setLoading(true);
    setError(null);

    // Validate credential ID format
    if (!isValidCredentialId(credentialId)) {
      setError(
        'Invalid credential ID format. Expected format: CRED-YYYY-XXX-ABCDEF'
      );
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/compliance/credentials/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credentialId,
          verifySignature: true,
          verifyBlockchain: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      setVerificationResult(result);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Verification failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [credentialId]);

  React.useEffect(() => {
    verifyCredential();
  }, [verifyCredential]);

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mx-auto max-w-4xl'>
        {/* Page Header */}
        <div className='mb-8 text-center'>
          <h1 className='mb-4 text-3xl font-bold text-gray-900'>
            Credential Verification
          </h1>
          <div className='mb-2 text-lg text-gray-600'>
            Credential ID: <span className='font-mono'>{credentialId}</span>
          </div>
          <p className='text-sm text-gray-500'>
            Real-time verification of ChainTrace compliance credential
          </p>
        </div>

        {/* Content based on state */}
        {loading && <LoadingState />}
        {error && <ErrorState error={error} onRetry={verifyCredential} />}
        {verificationResult && <SuccessState result={verificationResult} />}

        {/* Actions */}
        <div className='mt-8 space-x-4 text-center'>
          <Button
            onClick={() => (window.location.href = '/verify/credential')}
            variant='outline'
          >
            Verify Another Credential
          </Button>
          <Button
            onClick={() => (window.location.href = '/verify')}
            variant='ghost'
          >
            Verify product
          </Button>
        </div>

        {/* Information Footer */}
        <Card className='mt-8 border-blue-200 bg-blue-50 p-6'>
          <div className='flex items-start gap-3'>
            <span className='text-2xl'>ℹ️</span>
            <div className='text-sm text-blue-800'>
              <div className='mb-2 font-semibold'>About This Verification</div>
              <p>
                This verification checks the credential against
                ChainTrace&apos;s secure database and Hedera blockchain records
                to ensure authenticity and current status. All verifications are
                logged for audit purposes.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
