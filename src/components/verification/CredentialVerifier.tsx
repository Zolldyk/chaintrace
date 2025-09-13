/**
 * CredentialVerifier component for third-party credential verification
 *
 * @example
 * ```tsx
 * <CredentialVerifier
 *   onVerificationComplete={handleVerification}
 *   allowManualEntry={true}
 *   showQRScanner={true}
 * />
 * ```
 *
 * @since 1.0.0
 */

'use client';

import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { CredentialDisplay } from './CredentialDisplay';
import { CredentialVerificationBadge } from './CredentialBadge';
import { CredentialErrorDisplay } from '@/components/ui/CredentialErrorDisplay';
import { CredentialProgress } from '@/components/ui/CredentialProgress';
import type {
  CredentialVerificationRequest,
  CredentialVerificationResponse,
} from '@/types/compliance';
import { isValidCredentialId } from '@/lib/credential-validations';
import { parseCredentialQRData } from '@/lib/credential-formatting';
import { cn } from '@/lib/utils';

export interface CredentialVerifierProps {
  /** Whether to show QR code scanner */
  showQRScanner?: boolean;

  /** Whether to allow manual credential ID entry */
  allowManualEntry?: boolean;

  /** Whether to show detailed verification results */
  showDetailedResults?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Callback when verification is completed */
  onVerificationComplete?: (result: CredentialVerificationResponse) => void;

  /** Callback when verification starts */
  onVerificationStart?: (credentialId: string) => void;

  /** Default credential ID to verify */
  defaultCredentialId?: string;
}

/**
 * Verification state management
 */
type VerificationState = 'idle' | 'verifying' | 'success' | 'error';

/**
 * Third-party credential verification interface
 */
export function CredentialVerifier({
  showQRScanner = true,
  allowManualEntry = true,
  showDetailedResults = true,
  className,
  onVerificationComplete,
  onVerificationStart,
  defaultCredentialId,
}: CredentialVerifierProps) {
  const [credentialId, setCredentialId] = React.useState(
    defaultCredentialId || ''
  );
  const [verificationState, setVerificationState] =
    React.useState<VerificationState>('idle');
  const [verificationResult, setVerificationResult] =
    React.useState<CredentialVerificationResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showScanner, setShowScanner] = React.useState(false);

  // Handle credential ID input
  const handleCredentialIdChange = (value: string) => {
    setCredentialId(value);
    setError(null);
    setVerificationResult(null);
  };

  // Handle QR code scan result
  const handleQRScan = (qrData: string) => {
    const parsedData = parseCredentialQRData(qrData);
    if (parsedData && parsedData.type === 'credential_verification') {
      setCredentialId(parsedData.credentialId);
      setShowScanner(false);
      // Auto-verify if valid credential ID found
      handleVerify(parsedData.credentialId);
    } else {
      setError(
        'Invalid QR code. Please scan a valid credential verification QR code.'
      );
    }
  };

  // Perform credential verification
  const handleVerify = async (targetCredentialId?: string) => {
    const idToVerify = targetCredentialId || credentialId;

    if (!isValidCredentialId(idToVerify)) {
      setError('Invalid credential ID format. Expected: CRED-YYYY-XXX-ABCDEF');
      return;
    }

    setVerificationState('verifying');
    setError(null);
    onVerificationStart?.(idToVerify);

    try {
      const verificationRequest: CredentialVerificationRequest = {
        credentialId: idToVerify,
        verifySignature: true,
        verifyBlockchain: true,
      };

      const response = await fetch('/api/compliance/credentials/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verificationRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const result: CredentialVerificationResponse = await response.json();
      setVerificationResult(result);
      setVerificationState(result.isValid ? 'success' : 'error');

      onVerificationComplete?.(result);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Verification failed';
      setError(errorMessage);
      setVerificationState('error');
    }
  };

  // Reset verification state
  const handleReset = () => {
    setCredentialId('');
    setVerificationState('idle');
    setVerificationResult(null);
    setError(null);
  };

  return (
    <Card className={cn('p-6', className)}>
      <div className='space-y-6'>
        {/* Header */}
        <div className='text-center'>
          <h2 className='mb-2 text-xl font-semibold text-gray-900'>
            Verify Compliance Credential
          </h2>
          <p className='text-sm text-gray-600'>
            Verify the authenticity and status of a ChainTrace compliance
            credential
          </p>
        </div>

        {/* Input Methods */}
        <div className='space-y-4'>
          {allowManualEntry && (
            <div>
              <label className='mb-2 block text-sm font-medium text-gray-700'>
                Credential ID
              </label>
              <div className='flex gap-2'>
                <Input
                  type='text'
                  value={credentialId}
                  onChange={e => handleCredentialIdChange(e.target.value)}
                  placeholder='CRED-2024-001-ABC123'
                  className='font-mono text-sm'
                  disabled={verificationState === 'verifying'}
                />
                <Button
                  onClick={() => handleVerify()}
                  disabled={!credentialId || verificationState === 'verifying'}
                  className='whitespace-nowrap'
                >
                  {verificationState === 'verifying'
                    ? 'Verifying...'
                    : 'Verify'}
                </Button>
              </div>
            </div>
          )}

          {showQRScanner && (
            <div className='text-center'>
              <div className='mb-3 text-sm text-gray-500'>or</div>
              <Button
                onClick={() => setShowScanner(true)}
                variant='outline'
                disabled={verificationState === 'verifying'}
              >
                📱 Scan QR Code
              </Button>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <CredentialErrorDisplay
            error={new Error(error)}
            context={{ credentialId, operation: 'verification' }}
            showRecoveryOptions={true}
            onRetry={() => handleVerify()}
          />
        )}

        {/* Verification Results */}
        {verificationResult && (
          <VerificationResults
            result={verificationResult}
            showDetails={showDetailedResults}
            onReset={handleReset}
          />
        )}

        {/* Loading State with Progress */}
        {verificationState === 'verifying' && (
          <CredentialProgress
            steps={[
              {
                id: 'fetch',
                label: 'Fetching Credential',
                description: 'Retrieving credential data from secure database',
                status: 'completed',
                estimatedDuration: 2,
              },
              {
                id: 'signature',
                label: 'Verifying Signature',
                description: 'Checking cryptographic signature authenticity',
                status: 'in_progress',
                estimatedDuration: 3,
              },
              {
                id: 'blockchain',
                label: 'Blockchain Verification',
                description: 'Validating credential on Hedera blockchain',
                status: 'pending',
                estimatedDuration: 5,
              },
              {
                id: 'status',
                label: 'Status Check',
                description: 'Checking expiration and revocation status',
                status: 'pending',
                estimatedDuration: 2,
              },
            ]}
            currentStep='signature'
            title='Verifying Credential'
            showEstimatedTime={true}
          />
        )}
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScannerModal
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          onScan={handleQRScan}
        />
      )}
    </Card>
  );
}

/**
 * Verification results display component
 */
function VerificationResults({
  result,
  showDetails,
  onReset,
}: {
  result: CredentialVerificationResponse;
  showDetails: boolean;
  onReset: () => void;
}) {
  return (
    <div className='space-y-4'>
      {/* Result Summary */}
      <div className='text-center'>
        <CredentialVerificationBadge
          isValid={result.isValid}
          verifiedAt={result.verification.verifiedAt}
          className='mb-3'
        />
        <div className='text-lg font-semibold text-gray-900'>
          {result.isValid ? 'Credential Verified' : 'Credential Invalid'}
        </div>
        <div className='text-sm text-gray-600'>
          Verified at {result.verification.verifiedAt.toLocaleString()}
        </div>
      </div>

      {/* Error Details */}
      {!result.isValid && result.error && (
        <div className='rounded-lg border border-red-200 bg-red-50 p-3'>
          <div className='mb-1 text-sm font-medium text-red-800'>
            {result.error.message}
          </div>
          {result.error.details && (
            <div className='text-xs text-red-700'>
              Error Code: {result.error.code}
            </div>
          )}
        </div>
      )}

      {/* Credential Details */}
      {result.isValid && result.credential && showDetails && (
        <div>
          <h3 className='mb-3 text-sm font-medium text-gray-900'>
            Credential Details
          </h3>
          <CredentialDisplay
            credential={result.credential}
            compact={true}
            showActions={false}
            showQRCode={false}
          />
        </div>
      )}

      {/* Verification Details */}
      {showDetails && (
        <div className='space-y-3'>
          <h3 className='text-sm font-medium text-gray-900'>
            Verification Checks
          </h3>
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <VerificationCheck
              label='Signature Valid'
              status={result.verification.signatureValid}
            />
            <VerificationCheck
              label='Not Expired'
              status={result.verification.notExpired}
            />
            <VerificationCheck
              label='Not Revoked'
              status={result.verification.notRevoked}
            />
            {result.verification.blockchainValid !== undefined && (
              <VerificationCheck
                label='Blockchain Verified'
                status={result.verification.blockchainValid}
              />
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className='flex justify-center border-t border-gray-200 pt-4'>
        <Button onClick={onReset} variant='outline'>
          Verify Another Credential
        </Button>
      </div>
    </div>
  );
}

/**
 * Individual verification check component
 */
function VerificationCheck({
  label,
  status,
}: {
  label: string;
  status: boolean;
}) {
  return (
    <div className='flex items-center gap-2 rounded bg-gray-50 p-2'>
      <span className={status ? 'text-green-600' : 'text-red-600'}>
        {status ? '✓' : '❌'}
      </span>
      <span className='text-sm text-gray-700'>{label}</span>
    </div>
  );
}

/**
 * QR Scanner modal component
 */
function QRScannerModal({
  isOpen,
  onClose,
  onScan,
}: {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
}) {
  const [error, setError] = React.useState<string | null>(null);

  // Placeholder for QR scanner implementation
  // In a real implementation, this would use a camera/QR scanner library
  const handleManualEntry = (data: string) => {
    if (data.trim()) {
      onScan(data.trim());
    } else {
      setError('Please enter valid QR code data');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className='space-y-4 p-6'>
        <h3 className='mb-4 text-lg font-semibold text-gray-900'>
          Scan Credential QR Code
        </h3>
        <div className='rounded-lg border-2 border-dashed border-gray-300 py-8 text-center'>
          <div className='mb-2 text-4xl'>📱</div>
          <div className='text-gray-600'>
            QR Scanner would be implemented here
          </div>
          <div className='mt-2 text-sm text-gray-500'>
            For demo purposes, paste QR code data below
          </div>
        </div>

        {/* Manual QR Data Entry (for demo) */}
        <div>
          <label className='mb-1 block text-sm font-medium text-gray-700'>
            QR Code Data (Demo)
          </label>
          <div className='flex gap-2'>
            <Input
              type='text'
              placeholder='Paste QR code JSON data...'
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleManualEntry(e.currentTarget.value);
                }
              }}
            />
            <Button
              onClick={e => {
                const input = e.currentTarget
                  .previousElementSibling as HTMLInputElement;
                handleManualEntry(input.value);
              }}
              variant='outline'
              size='sm'
            >
              Parse
            </Button>
          </div>
          {error && <div className='mt-1 text-sm text-red-600'>{error}</div>}
        </div>

        <div className='text-xs text-gray-500'>
          Expected format: JSON with credentialId and verification URL
        </div>
      </div>
    </Modal>
  );
}
