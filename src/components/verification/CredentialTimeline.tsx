/**
 * CredentialTimeline component for displaying credential history timeline
 *
 * @example
 * ```tsx
 * <CredentialTimeline
 *   credentials={credentials}
 *   showProductEvents={true}
 *   compact={false}
 * />
 * ```
 *
 * @since 1.0.0
 */

'use client';

import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { CredentialBadge } from './CredentialBadge';
import type {
  ComplianceCredential,
  CredentialTimelineEntry,
  // CredentialType, // Imported but not used
} from '@/types/compliance';
import type { ProductEvent } from '@/types/product';
import { formatCredential } from '@/lib/credential-formatting';
import { cn } from '@/lib/utils';

export interface CredentialTimelineProps {
  /** Credentials to display in timeline */
  credentials: ComplianceCredential[];

  /** Product events to merge with credential timeline */
  productEvents?: ProductEvent[];

  /** Whether to show product events alongside credentials */
  showProductEvents?: boolean;

  /** Whether to display in compact mode */
  compact?: boolean;

  /** Maximum number of entries to show */
  maxEntries?: number;

  /** Additional CSS classes */
  className?: string;

  /** Callback when credential is clicked */
  onCredentialClick?: (credential: ComplianceCredential) => void;

  /** Callback when product event is clicked */
  onEventClick?: (event: ProductEvent) => void;

  /** Whether to show relative timestamps */
  showRelativeTime?: boolean;
}

/**
 * Timeline entry interface combining credentials and events
 */
interface TimelineEntry {
  id: string;
  type: 'credential' | 'event';
  timestamp: Date;
  credential?: ComplianceCredential;
  event?: ProductEvent;
  formattedCredential?: ReturnType<typeof formatCredential>;
}

/**
 * Display credential and event timeline with chronological ordering
 */
export function CredentialTimeline({
  credentials,
  productEvents = [],
  showProductEvents = false,
  compact = false,
  maxEntries = 20,
  className,
  onCredentialClick,
  onEventClick,
  showRelativeTime = true,
}: CredentialTimelineProps) {
  // Combine and sort timeline entries
  const timelineEntries = React.useMemo(() => {
    const entries: TimelineEntry[] = [];

    // Add credential entries
    credentials.forEach(credential => {
      entries.push({
        id: `credential-${credential.id}`,
        type: 'credential',
        timestamp: credential.issuedAt,
        credential,
        formattedCredential: formatCredential(credential),
      });

      // Add expiration entries for expired credentials
      if (credential.status === 'expired' && credential.expiresAt) {
        entries.push({
          id: `credential-expired-${credential.id}`,
          type: 'credential',
          timestamp: credential.expiresAt,
          credential: { ...credential, status: 'expired' as const },
          formattedCredential: formatCredential(credential),
        });
      }
    });

    // Add product event entries if enabled
    if (showProductEvents && productEvents.length > 0) {
      productEvents.forEach(event => {
        entries.push({
          id: `event-${event.id}`,
          type: 'event',
          timestamp: event.timestamp,
          event,
        });
      });
    }

    // Sort by timestamp (newest first)
    return entries
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, maxEntries);
  }, [credentials, productEvents, showProductEvents, maxEntries]);

  if (timelineEntries.length === 0) {
    return (
      <Card className={cn('p-6 text-center', className)}>
        <div className='text-gray-500'>
          <div className='mb-2 text-2xl'>📋</div>
          <div className='text-sm'>No credential timeline data available</div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('p-6', className)}>
      <div className='mb-4 flex items-center gap-2'>
        <h3 className='text-lg font-semibold text-gray-900'>
          Credential Timeline
        </h3>
        <span className='text-sm text-gray-500'>
          ({timelineEntries.length}{' '}
          {timelineEntries.length === 1 ? 'entry' : 'entries'})
        </span>
      </div>

      <div className='space-y-4'>
        {timelineEntries.map((entry, index) => (
          <TimelineEntryComponent
            key={entry.id}
            entry={entry}
            isLast={index === timelineEntries.length - 1}
            compact={compact}
            showRelativeTime={showRelativeTime}
            onCredentialClick={onCredentialClick}
            onEventClick={onEventClick}
          />
        ))}
      </div>
    </Card>
  );
}

/**
 * Individual timeline entry component
 */
function TimelineEntryComponent({
  entry,
  isLast,
  compact,
  showRelativeTime,
  onCredentialClick,
  onEventClick,
}: {
  entry: TimelineEntry;
  isLast: boolean;
  compact: boolean;
  showRelativeTime: boolean;
  onCredentialClick?: (credential: ComplianceCredential) => void;
  onEventClick?: (event: ProductEvent) => void;
}) {
  const handleClick = () => {
    if (entry.type === 'credential' && entry.credential && onCredentialClick) {
      onCredentialClick(entry.credential);
    } else if (entry.type === 'event' && entry.event && onEventClick) {
      onEventClick(entry.event);
    }
  };

  return (
    <div className='relative flex items-start gap-4'>
      {/* Timeline Line */}
      <div className='relative flex flex-col items-center'>
        {/* Timeline Dot */}
        <div
          className={cn('h-3 w-3 rounded-full border-2 bg-white', {
            'border-green-500':
              entry.type === 'credential' &&
              entry.credential?.status === 'active',
            'border-blue-500':
              entry.type === 'credential' &&
              entry.credential?.status === 'issued',
            'border-red-500':
              entry.type === 'credential' &&
              (entry.credential?.status === 'expired' ||
                entry.credential?.status === 'revoked'),
            'border-gray-400': entry.type === 'event',
          })}
        />

        {/* Connecting Line */}
        {!isLast && <div className='mt-1 h-12 w-px bg-gray-200' />}
      </div>

      {/* Content */}
      <div
        className={cn('min-w-0 flex-1 pb-4', {
          '-m-2 cursor-pointer rounded p-2 hover:bg-gray-50':
            onCredentialClick || onEventClick,
        })}
        onClick={handleClick}
      >
        {entry.type === 'credential' &&
          entry.credential &&
          entry.formattedCredential && (
            <CredentialTimelineEntry
              credential={entry.credential}
              formattedCredential={entry.formattedCredential}
              timestamp={entry.timestamp}
              compact={compact}
              showRelativeTime={showRelativeTime}
            />
          )}

        {entry.type === 'event' && entry.event && (
          <EventTimelineEntry
            event={entry.event}
            timestamp={entry.timestamp}
            compact={compact}
            showRelativeTime={showRelativeTime}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Credential timeline entry
 */
function CredentialTimelineEntry({
  credential,
  formattedCredential,
  timestamp,
  compact,
  showRelativeTime,
}: {
  credential: ComplianceCredential;
  formattedCredential: ReturnType<typeof formatCredential>;
  timestamp: Date;
  compact: boolean;
  showRelativeTime: boolean;
}) {
  const isExpiredEntry =
    credential.status === 'expired' && timestamp === credential.expiresAt;

  return (
    <div>
      {/* Header */}
      <div className='mb-1 flex items-center gap-2'>
        <span className='text-lg'>{formattedCredential.display.type.icon}</span>
        <div className='min-w-0 flex-1'>
          <div className='text-sm font-medium text-gray-900'>
            {isExpiredEntry ? 'Credential Expired' : 'Credential Issued'}
          </div>
          <div className='text-xs text-gray-500'>
            {showRelativeTime
              ? formatRelativeTime(timestamp)
              : timestamp.toLocaleString()}
          </div>
        </div>
        <CredentialBadge
          status={credential.status}
          size='sm'
          showWarning={
            formattedCredential.display.timing.warningLevel !== 'none'
          }
        />
      </div>

      {/* Details */}
      {!compact && (
        <div className='ml-7 space-y-1'>
          <div className='text-sm text-gray-700'>
            {formattedCredential.display.title}
          </div>
          <div className='text-xs text-gray-500'>ID: {credential.id}</div>
          <div className='text-xs text-gray-500'>
            Type: {formattedCredential.display.type.label} • Level:{' '}
            {formattedCredential.display.verificationLevel.label}
          </div>
          {credential.metadata.complianceRules.length > 0 && (
            <div className='text-xs text-gray-500'>
              Rules:{' '}
              {credential.metadata.complianceRules
                .slice(0, 2)
                .map(rule => rule.replace(/_/g, ' '))
                .join(', ')}
              {credential.metadata.complianceRules.length > 2 &&
                ` +${credential.metadata.complianceRules.length - 2} more`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Product event timeline entry
 */
function EventTimelineEntry({
  event,
  timestamp,
  compact,
  showRelativeTime,
}: {
  event: ProductEvent;
  timestamp: Date;
  compact: boolean;
  showRelativeTime: boolean;
}) {
  const eventIcons = {
    created: '🆕',
    processed: '⚙️',
    quality_check: '✅',
    transported: '🚚',
    verified: '🔍',
    rejected: '❌',
  };

  return (
    <div>
      {/* Header */}
      <div className='mb-1 flex items-center gap-2'>
        <span className='text-lg'>{eventIcons[event.eventType] || '📋'}</span>
        <div className='min-w-0 flex-1'>
          <div className='text-sm font-medium text-gray-900'>
            {event.eventType
              .replace(/_/g, ' ')
              .replace(/\b\w/g, l => l.toUpperCase())}
          </div>
          <div className='text-xs text-gray-500'>
            {showRelativeTime
              ? formatRelativeTime(timestamp)
              : timestamp.toLocaleString()}
          </div>
        </div>
        <div className='rounded bg-gray-100 px-2 py-1 text-xs text-gray-500'>
          {event.actor.role}
        </div>
      </div>

      {/* Details */}
      {!compact && (
        <div className='ml-7 space-y-1'>
          <div className='text-sm text-gray-700'>Product Event: {event.id}</div>
          <div className='text-xs text-gray-500'>
            Actor: {event.actor.name || event.actor.walletAddress}
          </div>
          {event.location && (
            <div className='text-xs text-gray-500'>
              Location: {event.location.city}, {event.location.state}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Format relative time for display
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}m ago`;
    }
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else if (diffDays < 30) {
    const diffWeeks = Math.floor(diffDays / 7);
    return `${diffWeeks}w ago`;
  } else if (diffDays < 365) {
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths}mo ago`;
  } else {
    const diffYears = Math.floor(diffDays / 365);
    return `${diffYears}y ago`;
  }
}
