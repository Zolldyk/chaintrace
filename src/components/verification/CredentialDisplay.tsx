/**
 * CredentialDisplay component for displaying individual compliance credentials
 *
 * @example
 * ```tsx
 * <CredentialDisplay
 *   credential={credential}
 *   showQRCode={true}
 *   onVerify={handleVerify}
 * />
 * ```
 *
 * @since 1.0.0
 */

'use client';

import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { QRCodeDisplay } from '@/components/ui/QRCodeDisplay';
import { CredentialBadge } from './CredentialBadge';
import type { ComplianceCredential } from '@/types/compliance';
import {
  formatCredential,
  generateCredentialQRData,
} from '@/lib/credential-formatting';
import { cn } from '@/lib/utils';

export interface CredentialDisplayProps {
  /** Credential to display */
  credential: ComplianceCredential;

  /** Whether to show QR code for verification */
  showQRCode?: boolean;

  /** Whether to show detailed information */
  showDetails?: boolean;

  /** Whether the component is in compact mode */
  compact?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Callback when verify button is clicked */
  onVerify?: (credential: ComplianceCredential) => void;

  /** Callback when QR code is clicked */
  onQRCodeClick?: (credential: ComplianceCredential) => void;

  /** Whether to show verification actions */
  showActions?: boolean;
}

/**
 * Display individual compliance credential with formatted information
 */
export function CredentialDisplay({
  credential,
  showQRCode = false,
  showDetails = true,
  compact = false,
  className,
  onVerify,
  onQRCodeClick,
  showActions = true,
}: CredentialDisplayProps) {
  const formatted = formatCredential(credential);
  const [showQR, setShowQR] = React.useState(showQRCode);

  const handleVerifyClick = () => {
    onVerify?.(credential);
  };

  const handleQRClick = () => {
    if (onQRCodeClick) {
      onQRCodeClick(credential);
    } else {
      setShowQR(!showQR);
    }
  };

  if (compact) {
    return (
      <Card className={cn('p-4', className)}>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <span className='text-lg'>{formatted.display.type.icon}</span>
            <div>
              <div className='text-sm font-medium'>
                {formatted.display.title}
              </div>
              <div className='text-xs text-gray-500'>{credential.id}</div>
            </div>
          </div>
          <CredentialBadge
            status={credential.status}
            size='sm'
            showWarning={formatted.display.timing.warningLevel !== 'none'}
          />
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('p-6', className)}>
      {/* Header */}
      <div className='mb-4 flex items-start justify-between'>
        <div className='flex items-center gap-3'>
          <span className='text-2xl'>{formatted.display.type.icon}</span>
          <div>
            <h3 className='text-lg font-semibold text-gray-900'>
              {formatted.display.title}
            </h3>
            <p className='text-sm text-gray-600'>{credential.id}</p>
          </div>
        </div>
        <CredentialBadge
          status={credential.status}
          size='md'
          showWarning={formatted.display.timing.warningLevel !== 'none'}
        />
      </div>

      {/* Description */}
      <p className='mb-4 text-gray-700'>{formatted.display.description}</p>

      {/* Key Information Grid */}
      <div className='mb-6 grid grid-cols-1 gap-4 md:grid-cols-2'>
        <div>
          <dt className='text-sm font-medium text-gray-500'>Product ID</dt>
          <dd className='font-mono text-sm text-gray-900'>
            {credential.productId}
          </dd>
        </div>
        <div>
          <dt className='text-sm font-medium text-gray-500'>
            Verification Level
          </dt>
          <dd className='text-sm text-gray-900'>
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium',
                {
                  'bg-blue-100 text-blue-800':
                    formatted.display.verificationLevel.badge === 'B',
                  'bg-green-100 text-green-800':
                    formatted.display.verificationLevel.badge === 'E',
                  'bg-purple-100 text-purple-800':
                    formatted.display.verificationLevel.badge === 'P',
                }
              )}
            >
              {formatted.display.verificationLevel.label}
            </span>
          </dd>
        </div>
        <div>
          <dt className='text-sm font-medium text-gray-500'>Issued By</dt>
          <dd className='flex items-center gap-1 text-sm text-gray-900'>
            {formatted.display.issuer.displayName}
            {formatted.display.issuer.trusted && (
              <span className='text-green-600' title='Trusted Issuer'>
                ✓
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className='text-sm font-medium text-gray-500'>Issued</dt>
          <dd className='text-sm text-gray-900'>
            {formatted.display.timing.issuedDate}
            <span className='ml-1 text-gray-500'>
              ({formatted.display.timing.issuedRelative})
            </span>
          </dd>
        </div>
        {formatted.display.timing.expirationDate && (
          <div>
            <dt className='text-sm font-medium text-gray-500'>Expires</dt>
            <dd
              className={cn('text-sm', {
                'text-red-600':
                  formatted.display.timing.warningLevel === 'critical',
                'text-yellow-600':
                  formatted.display.timing.warningLevel === 'warning',
                'text-blue-600':
                  formatted.display.timing.warningLevel === 'info',
                'text-gray-900':
                  formatted.display.timing.warningLevel === 'none',
              })}
            >
              {formatted.display.timing.expirationDate}
              {formatted.display.timing.daysUntilExpiration !== null && (
                <span className='ml-1'>
                  (
                  {formatted.display.timing.daysUntilExpiration > 0
                    ? `${formatted.display.timing.daysUntilExpiration} days`
                    : 'Expired'}
                  )
                </span>
              )}
            </dd>
          </div>
        )}
      </div>

      {/* Compliance Rules */}
      {showDetails && formatted.display.complianceRules.length > 0 && (
        <div className='mb-6'>
          <h4 className='mb-3 text-sm font-medium text-gray-900'>
            Compliance Rules
          </h4>
          <div className='space-y-2'>
            {formatted.display.complianceRules.map((rule, index) => (
              <div
                key={index}
                className='flex items-start gap-2 rounded-lg bg-gray-50 p-3'
              >
                <span className='mt-0.5 text-green-600'>✓</span>
                <div>
                  <div className='text-sm font-medium text-gray-900'>
                    {rule.displayName}
                  </div>
                  <div className='text-xs text-gray-600'>
                    {rule.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QR Code Display */}
      {showQR && (
        <div className='mb-6'>
          <h4 className='mb-3 text-sm font-medium text-gray-900'>
            Verification QR Code
          </h4>
          <div className='flex justify-center'>
            <QRCodeDisplay
              qrCode={{
                data: generateCredentialQRData(credential),
                format: 'png' as const,
                dimensions: { width: 200, height: 200 },
                timestamp: new Date(),
                size: Math.ceil(
                  generateCredentialQRData(credential).length * 0.75
                ), // Estimate size
                mimeType: 'image/png',
                encodedData: generateCredentialQRData(credential),
                metadata: {
                  errorLevel: 'M' as const,
                  version: 1,
                  mode: 'alphanumeric',
                },
              }}
              productId={credential.productId}
              size='medium'
              showDownload={true}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div className='flex items-center gap-3 border-t border-gray-200 pt-4'>
          <Button onClick={handleVerifyClick} variant='outline' size='sm'>
            Verify Credential
          </Button>
          <Button onClick={handleQRClick} variant='ghost' size='sm'>
            {showQR ? 'Hide QR Code' : 'Show QR Code'}
          </Button>
        </div>
      )}

      {/* Warning Message */}
      {formatted.display.timing.warningLevel === 'critical' && (
        <div className='mt-4 rounded-lg border border-red-200 bg-red-50 p-3'>
          <div className='flex items-center gap-2'>
            <span className='text-red-600'>⚠️</span>
            <div>
              <div className='text-sm font-medium text-red-800'>
                {credential.status === 'expired'
                  ? 'Credential Expired'
                  : 'Expiring Soon'}
              </div>
              <div className='text-xs text-red-700'>
                {credential.status === 'expired'
                  ? 'This credential has expired and is no longer valid.'
                  : 'This credential will expire soon. Consider renewing if needed.'}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
