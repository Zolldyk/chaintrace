/**
 * Basic unit tests for ProductTimeline component
 * Simple test suite to validate QA fixes
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductTimeline } from '@/components/verification/ProductTimeline';
import { ProductWithEvents } from '@/types';

// Mock utils
vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
  formatDate: vi.fn((timestamp: number) =>
    new Date(timestamp).toLocaleDateString()
  ),
  truncateHash: vi.fn(
    (hash: string) => `${hash.slice(0, 6)}...${hash.slice(-4)}`
  ),
}));

describe('ProductTimeline - QA Validation', () => {
  const mockProduct: ProductWithEvents = {
    id: 'PROD-2024-001',
    productId: 'PROD-2024-001',
    name: 'Test Product',
    description: 'A test product',
    batchId: 'BATCH-001',
    category: 'agricultural',
    origin: {
      address: '123 Farm Road',
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria',
      coordinates: { latitude: 6.5244, longitude: 3.3792 },
      region: 'Southwest',
    },
    quantity: { amount: 100, unit: 'kg' },
    qrCode: 'qr-code-data',
    guardianCredentialId: null,
    hcsTopicId: 'topic-001',
    createdAt: new Date('2024-09-01T08:00:00Z'),
    updatedAt: new Date('2024-09-03T10:00:00Z'),
    status: 'verified',
    verified: true,
    events: [
      {
        id: 'event-001',
        productId: 'PROD-2024-001',
        eventType: 'created',
        timestamp: new Date('2024-09-01T08:00:00Z'),
        actor: {
          name: 'John Manufacturer',
          role: 'producer',
          walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        },
        location: {
          address: '123 Farm Road',
          city: 'Lagos',
          state: 'Lagos',
          country: 'Nigeria',
          coordinates: { latitude: 6.5244, longitude: 3.3792 },
          region: 'Southwest',
        },
        data: { source: 'farm', organic: true },
        hcsMessageId: 'hcs-msg-001',
        signature: 'signature-001',
      },
    ],
  };

  it('should render product timeline', () => {
    render(<ProductTimeline product={mockProduct} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('A test product')).toBeInTheDocument();
    expect(screen.getByText('Supply Chain Journey')).toBeInTheDocument();
  });

  it('should render events', () => {
    render(<ProductTimeline product={mockProduct} />);

    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('John Manufacturer')).toBeInTheDocument();
  });

  it('should handle loading state', () => {
    render(<ProductTimeline product={mockProduct} loading={true} />);

    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should handle empty events', () => {
    const emptyProduct = { ...mockProduct, events: [] };
    render(<ProductTimeline product={emptyProduct} />);

    expect(
      screen.getByText('No supply chain events recorded yet.')
    ).toBeInTheDocument();
  });
});
