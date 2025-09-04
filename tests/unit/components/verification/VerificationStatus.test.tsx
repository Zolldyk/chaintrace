/**
 * Unit tests for VerificationStatus component
 *
 * Tests all verification status variants, accessibility features, time formatting,
 * expiration handling, and visual indicators.
 *
 * @since 1.0.0
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VerificationStatus } from '@/components/verification/VerificationStatus';
import { VerificationStatus as Status } from '@/types';

// Mock the utils
vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
  formatDate: vi.fn(
    (timestamp: number, options?: Intl.DateTimeFormatOptions) => {
      const date = new Date(timestamp);
      if (options?.dateStyle === 'full' && options?.timeStyle === 'medium') {
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
        });
      }
      return date.toLocaleDateString('en-US');
    }
  ),
}));

describe('VerificationStatus', () => {
  const baseProps = {
    status: 'verified' as Status,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with verified status', () => {
      render(<VerificationStatus {...baseProps} />);

      expect(screen.getByText('Verified')).toBeInTheDocument();
      expect(
        screen.getByText(
          'This product has been successfully verified and is authentic.'
        )
      ).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveAttribute(
        'aria-label',
        'Verification status: Verified'
      );
    });

    it('renders with pending status', () => {
      render(<VerificationStatus status='pending' />);

      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(
        screen.getByText(
          'This product is currently being verified. Please check back later.'
        )
      ).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveAttribute(
        'aria-label',
        'Verification status: Pending'
      );
    });

    it('renders with unverified status', () => {
      render(<VerificationStatus status='unverified' />);

      expect(screen.getByText('Unverified')).toBeInTheDocument();
      expect(
        screen.getByText(
          'This product has not been verified yet or verification data is unavailable.'
        )
      ).toBeInTheDocument();
    });

    it('renders with rejected status', () => {
      render(<VerificationStatus status='rejected' />);

      expect(screen.getByText('Rejected')).toBeInTheDocument();
      expect(
        screen.getByText(
          'This product failed verification or has been flagged as potentially fraudulent.'
        )
      ).toBeInTheDocument();
    });

    it('renders with expired status', () => {
      render(<VerificationStatus status='expired' />);

      expect(screen.getByText('Expired')).toBeInTheDocument();
      expect(
        screen.getByText(
          "This product's verification has expired and needs to be re-verified."
        )
      ).toBeInTheDocument();
    });
  });

  describe('Status Icons', () => {
    it('displays correct icon for verified status', () => {
      render(<VerificationStatus status='verified' showIcon={true} />);

      const icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon?.querySelector('path')).toHaveAttribute(
        'fill-rule',
        'evenodd'
      );
    });

    it('displays correct icon for pending status', () => {
      render(<VerificationStatus status='pending' showIcon={true} />);

      const icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('hides icon when showIcon is false', () => {
      render(<VerificationStatus status='verified' showIcon={false} />);

      const icon = document.querySelector('svg');
      expect(icon).not.toBeInTheDocument();
    });
  });

  describe('Status Colors and Styling', () => {
    it('applies correct color classes for verified status', () => {
      const { container } = render(<VerificationStatus status='verified' />);

      const statusContainer = container.firstChild as HTMLElement;
      expect(statusContainer).toHaveClass('bg-green-50', 'border-green-200');

      const titleElement = screen.getByText('Verified');
      expect(titleElement).toHaveClass('text-green-900');
    });

    it('applies correct color classes for pending status', () => {
      const { container } = render(<VerificationStatus status='pending' />);

      const statusContainer = container.firstChild as HTMLElement;
      expect(statusContainer).toHaveClass('bg-yellow-50', 'border-yellow-200');

      const titleElement = screen.getByText('Pending');
      expect(titleElement).toHaveClass('text-yellow-900');
    });

    it('applies correct color classes for rejected status', () => {
      const { container } = render(<VerificationStatus status='rejected' />);

      const statusContainer = container.firstChild as HTMLElement;
      expect(statusContainer).toHaveClass('bg-red-50', 'border-red-200');
    });

    it('applies correct color classes for unverified status', () => {
      const { container } = render(<VerificationStatus status='unverified' />);

      const statusContainer = container.firstChild as HTMLElement;
      expect(statusContainer).toHaveClass('bg-gray-50', 'border-gray-200');
    });

    it('applies correct color classes for expired status', () => {
      const { container } = render(<VerificationStatus status='expired' />);

      const statusContainer = container.firstChild as HTMLElement;
      expect(statusContainer).toHaveClass('bg-orange-50', 'border-orange-200');
    });
  });

  describe('Size Variants', () => {
    it('applies small size styling', () => {
      const { container } = render(
        <VerificationStatus status='verified' size='sm' />
      );

      const statusContainer = container.firstChild as HTMLElement;
      expect(statusContainer).toHaveClass('p-2');

      const titleElement = screen.getByText('Verified');
      expect(titleElement).toHaveClass('text-sm');
    });

    it('applies medium size styling (default)', () => {
      const { container } = render(
        <VerificationStatus status='verified' size='md' />
      );

      const statusContainer = container.firstChild as HTMLElement;
      expect(statusContainer).toHaveClass('p-4');

      const titleElement = screen.getByText('Verified');
      expect(titleElement).toHaveClass('text-base');
    });

    it('applies large size styling', () => {
      const { container } = render(
        <VerificationStatus status='verified' size='lg' />
      );

      const statusContainer = container.firstChild as HTMLElement;
      expect(statusContainer).toHaveClass('p-6');

      const titleElement = screen.getByText('Verified');
      expect(titleElement).toHaveClass('text-lg');
    });
  });

  describe('Timestamp Handling', () => {
    const mockTimestamp = '2024-09-03T10:00:00Z';

    beforeEach(() => {
      // Mock current date for consistent relative time testing
      vi.setSystemTime(new Date('2024-09-03T10:30:00Z'));
    });

    it('displays last verified timestamp', () => {
      render(
        <VerificationStatus status='verified' lastVerified={mockTimestamp} />
      );

      expect(screen.getByText(/Last verified:/)).toBeInTheDocument();
      expect(screen.getByText(/30m ago/)).toBeInTheDocument();
    });

    it('displays relative time correctly for different intervals', () => {
      const { rerender } = render(
        <VerificationStatus
          status='verified'
          lastVerified='2024-09-03T10:29:30Z'
        />
      );
      expect(screen.getByText(/just now/)).toBeInTheDocument();

      rerender(
        <VerificationStatus
          status='verified'
          lastVerified='2024-09-03T10:15:00Z'
        />
      );
      expect(screen.getByText(/15m ago/)).toBeInTheDocument();

      rerender(
        <VerificationStatus
          status='verified'
          lastVerified='2024-09-03T08:00:00Z'
        />
      );
      expect(screen.getByText(/2h ago/)).toBeInTheDocument();

      rerender(
        <VerificationStatus
          status='verified'
          lastVerified='2024-09-01T10:00:00Z'
        />
      );
      expect(screen.getByText(/2d ago/)).toBeInTheDocument();
    });

    it('displays expiration date for verified products', () => {
      const expiresAt = '2024-12-03T10:00:00Z';
      render(<VerificationStatus status='verified' expiresAt={expiresAt} />);

      expect(screen.getByText(/Expires:/)).toBeInTheDocument();
    });

    it('handles expired verification correctly', () => {
      const pastExpiry = '2024-08-03T10:00:00Z';
      render(<VerificationStatus status='verified' expiresAt={pastExpiry} />);

      // Should show as expired status instead of verified
      expect(screen.getByText('Expired')).toBeInTheDocument();
      expect(
        screen.getByText(
          "This product's verification has expired and needs to be re-verified."
        )
      ).toBeInTheDocument();
    });

    it('does not show expiration for non-verified status', () => {
      render(
        <VerificationStatus status='pending' expiresAt='2024-12-03T10:00:00Z' />
      );

      expect(screen.queryByText(/Expires:/)).not.toBeInTheDocument();
    });
  });

  describe('Custom Messages', () => {
    it('displays custom message instead of default description', () => {
      const customMessage = 'Custom verification message';
      render(
        <VerificationStatus status='verified' customMessage={customMessage} />
      );

      expect(screen.getByText(customMessage)).toBeInTheDocument();
      expect(
        screen.queryByText(
          'This product has been successfully verified and is authentic.'
        )
      ).not.toBeInTheDocument();
    });
  });

  describe('Details Toggle', () => {
    it('shows details by default', () => {
      render(<VerificationStatus status='verified' />);

      expect(
        screen.getByText(
          'This product has been successfully verified and is authentic.'
        )
      ).toBeInTheDocument();
    });

    it('hides details when showDetails is false', () => {
      render(<VerificationStatus status='verified' showDetails={false} />);

      expect(
        screen.queryByText(
          'This product has been successfully verified and is authentic.'
        )
      ).not.toBeInTheDocument();
    });

    it('hides timestamp when showDetails is false', () => {
      render(
        <VerificationStatus
          status='verified'
          lastVerified='2024-09-03T10:00:00Z'
          showDetails={false}
        />
      );

      expect(screen.queryByText(/Last verified:/)).not.toBeInTheDocument();
    });
  });

  describe('Status Badges', () => {
    it('displays status badge for verified products', () => {
      render(<VerificationStatus status='verified' />);

      expect(screen.getByText('✓ Verified')).toBeInTheDocument();
    });

    it('displays status badge for pending products', () => {
      render(<VerificationStatus status='pending' />);

      expect(screen.getByText('⏳ Pending')).toBeInTheDocument();
    });

    it('does not display status badge for other statuses', () => {
      render(<VerificationStatus status='rejected' />);

      expect(screen.queryByText('✓ Verified')).not.toBeInTheDocument();
      expect(screen.queryByText('⏳ Pending')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<VerificationStatus status='verified' />);

      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveAttribute(
        'aria-label',
        'Verification status: Verified'
      );
    });

    it('marks icon as decorative', () => {
      render(<VerificationStatus status='verified' showIcon={true} />);

      const iconContainer = document.querySelector('[aria-hidden="true"]');
      expect(iconContainer).toBeInTheDocument();
    });

    it('provides proper time element with datetime attribute', () => {
      const timestamp = '2024-09-03T10:00:00Z';
      render(<VerificationStatus status='verified' lastVerified={timestamp} />);

      const timeElement = screen.getByRole('time');
      expect(timeElement).toHaveAttribute('datetime', timestamp);
    });

    it('provides tooltip for time element', () => {
      const timestamp = '2024-09-03T10:00:00Z';
      render(<VerificationStatus status='verified' lastVerified={timestamp} />);

      const timeElement = screen.getByRole('time');
      expect(timeElement).toHaveAttribute('title');
    });

    it('maintains semantic structure', () => {
      render(<VerificationStatus status='verified' />);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <VerificationStatus status='verified' className='custom-class' />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('passes through additional props', () => {
      render(
        <VerificationStatus
          status='verified'
          data-testid='verification-status'
        />
      );

      expect(screen.getByTestId('verification-status')).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('works with React.forwardRef', () => {
      const ref = { current: null };
      render(<VerificationStatus ref={ref} status='verified' />);

      expect(ref.current).toBeTruthy();
    });

    it('handles all status variants correctly', () => {
      const statuses: Status[] = [
        'verified',
        'pending',
        'unverified',
        'rejected',
        'expired',
      ];

      statuses.forEach(status => {
        const { container } = render(<VerificationStatus status={status} />);
        expect(container.firstChild).toBeInTheDocument();
      });
    });

    it('handles edge cases gracefully', () => {
      // Test with undefined timestamps
      render(
        <VerificationStatus
          status='verified'
          lastVerified={undefined}
          expiresAt={undefined}
        />
      );

      expect(screen.queryByText(/Last verified:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Expires:/)).not.toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('memoizes expensive calculations', () => {
      const props = {
        status: 'verified' as Status,
        expiresAt: '2024-12-03T10:00:00Z',
        lastVerified: '2024-09-03T10:00:00Z',
      };

      const { rerender } = render(<VerificationStatus {...props} />);

      // Multiple re-renders with same props should not cause issues
      rerender(<VerificationStatus {...props} />);
      rerender(<VerificationStatus {...props} />);

      expect(screen.getByText('Verified')).toBeInTheDocument();
    });
  });
});
