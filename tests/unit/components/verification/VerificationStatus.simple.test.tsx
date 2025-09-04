/**
 * Basic unit tests for VerificationStatus component
 * Simple test suite to validate QA fixes
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VerificationStatus } from '@/components/verification/VerificationStatus';

// Mock utils
vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
  formatDate: vi.fn((timestamp: number) =>
    new Date(timestamp).toLocaleDateString()
  ),
}));

describe('VerificationStatus - QA Validation', () => {
  it('should render verified status', () => {
    render(<VerificationStatus status='verified' />);

    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Verification status: Verified'
    );
  });

  it('should render pending status', () => {
    render(<VerificationStatus status='pending' />);

    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Verification status: Pending'
    );
  });

  it('should render unverified status', () => {
    render(<VerificationStatus status='unverified' />);

    expect(screen.getByText('Unverified')).toBeInTheDocument();
  });

  it('should render rejected status', () => {
    render(<VerificationStatus status='rejected' />);

    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('should render expired status', () => {
    render(<VerificationStatus status='expired' />);

    expect(screen.getByText('Expired')).toBeInTheDocument();
  });
});
