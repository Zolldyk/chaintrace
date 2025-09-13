/**
 * CredentialProgress component for showing operation progress
 *
 * @example
 * ```tsx
 * <CredentialProgress
 *   steps={verificationSteps}
 *   currentStep="verifying"
 *   onCancel={handleCancel}
 * />
 * ```
 *
 * @since 1.0.0
 */

'use client';

import * as React from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { cn } from '@/lib/utils';

export interface ProgressStep {
  /** Unique step identifier */
  id: string;

  /** Step label */
  label: string;

  /** Step description */
  description?: string;

  /** Step status */
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';

  /** Step icon */
  icon?: string;

  /** Estimated duration in seconds */
  estimatedDuration?: number;

  /** Whether this step is optional */
  optional?: boolean;
}

export interface CredentialProgressProps {
  /** Progress steps */
  steps: ProgressStep[];

  /** Current active step ID */
  currentStep?: string;

  /** Overall progress title */
  title?: string;

  /** Whether operation can be cancelled */
  cancellable?: boolean;

  /** Whether to show estimated time remaining */
  showEstimatedTime?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Callback when operation is cancelled */
  onCancel?: () => void;

  /** Callback when step is clicked (for skippable steps) */
  onStepClick?: (stepId: string) => void;

  /** Custom completion message */
  completionMessage?: string;
}

/**
 * Progress indicator for credential operations
 */
export function CredentialProgress({
  steps,
  currentStep,
  title = 'Processing...',
  cancellable = false,
  showEstimatedTime = true,
  className,
  onCancel,
  onStepClick,
  completionMessage = 'Operation completed successfully!',
}: CredentialProgressProps) {
  const [startTime] = React.useState(Date.now());
  const [elapsedTime, setElapsedTime] = React.useState(0);

  // Update elapsed time
  React.useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  // Calculate progress percentage
  const totalSteps = steps.length;
  const completedSteps = steps.filter(
    step => step.status === 'completed'
  ).length;
  const progressPercentage =
    totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  // Check if all steps are completed
  const isCompleted = steps.every(
    step => step.status === 'completed' || step.status === 'skipped'
  );

  // Check if any step failed
  const hasFailed = steps.some(step => step.status === 'failed');

  // Calculate estimated time remaining
  const estimatedTimeRemaining = React.useMemo(() => {
    if (!showEstimatedTime || isCompleted) return null;

    const remainingSteps = steps.filter(
      step => step.status === 'pending' || step.status === 'in_progress'
    );

    const totalEstimatedTime = remainingSteps.reduce(
      (total, step) => total + (step.estimatedDuration || 5),
      0
    );

    return totalEstimatedTime * 1000; // Convert to milliseconds
  }, [steps, showEstimatedTime, isCompleted]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <Card className={cn('p-6', className)}>
      {/* Header */}
      <div className='mb-4 flex items-center justify-between'>
        <div>
          <h3 className='text-lg font-semibold text-gray-900'>{title}</h3>
          {showEstimatedTime && (
            <div className='mt-1 text-sm text-gray-600'>
              <span>Elapsed: {formatTime(elapsedTime)}</span>
              {estimatedTimeRemaining && (
                <span className='ml-4'>
                  Estimated remaining: {formatTime(estimatedTimeRemaining)}
                </span>
              )}
            </div>
          )}
        </div>
        {cancellable && onCancel && !isCompleted && (
          <Button onClick={onCancel} variant='outline' size='sm'>
            Cancel
          </Button>
        )}
      </div>

      {/* Progress Bar */}
      <div className='mb-6'>
        <div className='mb-2 flex justify-between text-sm text-gray-600'>
          <span>Progress</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <div className='h-2 w-full rounded-full bg-gray-200'>
          <div
            className={cn('h-2 rounded-full transition-all duration-300', {
              'bg-blue-600': !isCompleted && !hasFailed,
              'bg-green-600': isCompleted,
              'bg-red-600': hasFailed,
            })}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className='space-y-3'>
        {steps.map(step => (
          <ProgressStepItem
            key={step.id}
            step={step}
            isActive={step.id === currentStep}
            onClick={onStepClick}
          />
        ))}
      </div>

      {/* Completion/Error Message */}
      {isCompleted && (
        <div className='mt-4 rounded-lg border border-green-200 bg-green-50 p-3'>
          <div className='flex items-center gap-2 text-green-800'>
            <span className='text-lg'>✅</span>
            <span className='font-medium'>{completionMessage}</span>
          </div>
        </div>
      )}

      {hasFailed && (
        <div className='mt-4 rounded-lg border border-red-200 bg-red-50 p-3'>
          <div className='flex items-center gap-2 text-red-800'>
            <span className='text-lg'>❌</span>
            <span className='font-medium'>
              Operation failed. Please check the steps above for details.
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}

/**
 * Individual progress step component
 */
function ProgressStepItem({
  step,
  isActive,
  onClick,
}: {
  step: ProgressStep;
  isActive: boolean;
  onClick?: (stepId: string) => void;
}) {
  const handleClick = () => {
    if (onClick && (step.status === 'pending' || step.optional)) {
      onClick(step.id);
    }
  };

  const getStatusIcon = () => {
    switch (step.status) {
      case 'completed':
        return '✅';
      case 'in_progress':
        return '⏳';
      case 'failed':
        return '❌';
      case 'skipped':
        return '⏭️';
      default:
        return step.icon || '⭕';
    }
  };

  const getStatusColor = () => {
    switch (step.status) {
      case 'completed':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'in_progress':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'failed':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'skipped':
        return 'text-gray-700 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border p-3 transition-all',
        getStatusColor(),
        {
          'ring-2 ring-blue-200': isActive,
          'cursor-pointer hover:shadow-sm':
            onClick && (step.status === 'pending' || step.optional),
        }
      )}
      onClick={handleClick}
    >
      {/* Step Number/Icon */}
      <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center'>
        {step.status === 'in_progress' ? (
          <div className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
        ) : (
          <span className='text-lg'>{getStatusIcon()}</span>
        )}
      </div>

      {/* Step Content */}
      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-2'>
          <span className='font-medium'>{step.label}</span>
          {step.optional && (
            <span className='rounded-full bg-gray-200 px-2 py-1 text-xs text-gray-600'>
              Optional
            </span>
          )}
        </div>
        {step.description && (
          <div className='mt-1 text-sm opacity-80'>{step.description}</div>
        )}
      </div>

      {/* Status Indicator */}
      <div className='flex-shrink-0 text-sm font-medium'>
        {step.status === 'in_progress' && 'In Progress...'}
        {step.status === 'completed' && 'Done'}
        {step.status === 'failed' && 'Failed'}
        {step.status === 'skipped' && 'Skipped'}
        {step.status === 'pending' && 'Waiting'}
      </div>
    </div>
  );
}

/**
 * Compact progress indicator for inline use
 */
export function CredentialProgressCompact({
  progress,
  label = 'Processing...',
  showPercentage = true,
  className,
}: {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className='flex-1'>
        <div className='mb-1 flex justify-between text-sm'>
          <span className='text-gray-700'>{label}</span>
          {showPercentage && (
            <span className='text-gray-500'>{Math.round(progress)}%</span>
          )}
        </div>
        <div className='h-2 w-full rounded-full bg-gray-200'>
          <div
            className='h-2 rounded-full bg-blue-600 transition-all duration-300'
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      </div>
      {progress < 100 && (
        <div className='h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent' />
      )}
    </div>
  );
}
