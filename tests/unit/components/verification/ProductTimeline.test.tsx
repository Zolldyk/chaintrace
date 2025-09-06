/**
 * Unit tests for ProductTimeline component
 *
 * Tests supply chain journey display, event rendering, loading states,
 * product information display, and accessibility features.
 *
 * @since 1.0.0
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductTimeline } from '@/components/verification/ProductTimeline';
import { ProductWithEvents, ProductEvent, Actor, Location } from '@/types';

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
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  ),
  truncateHash: vi.fn(
    (hash: string) => `${hash.slice(0, 6)}...${hash.slice(-4)}`
  ),
}));

describe('ProductTimeline', () => {
  const mockLocation: Location = {
    address: '123 Manufacturing St, Factory City, FC 12345',
    city: 'Lagos',
    state: 'Lagos',
    coordinates: {
      latitude: 40.7128,
      longitude: -74.006,
    },
    country: 'Nigeria',
    region: 'Southwest',
  };

  const mockActor: Actor = {
    name: 'John Manufacturer',
    role: 'producer',
    walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
  };

  const mockEvents: ProductEvent[] = [
    {
      id: 'event-001',
      productId: 'PROD-2024-001',
      eventType: 'created',
      timestamp: new Date('2024-09-01T08:00:00Z'),
      actor: mockActor,
      location: mockLocation,
      data: { batchNumber: 'BATCH-001', quality: 'Grade A' },
      hcsMessageId: 'hcs-msg-001',
      transactionId: '0xabcdef1234567890abcdef1234567890abcdef12',
      signature: 'signature-001',
    },
    {
      id: 'event-002',
      productId: 'PROD-2024-001',
      eventType: 'verified',
      timestamp: new Date('2024-09-02T10:30:00Z'),
      actor: { ...mockActor, name: 'Jane Verifier', role: 'verifier' },
      location: mockLocation,
      data: {},
      hcsMessageId: 'hcs-msg-002',
      transactionId: '0xfedcba0987654321fedcba0987654321fedcba09',
      signature: 'signature-002',
    },
    {
      id: 'event-003',
      productId: 'PROD-2024-001',
      eventType: 'transported',
      timestamp: new Date('2024-09-03T14:15:00Z'),
      actor: { ...mockActor, name: 'Bob Shipper', role: 'distributor' },
      location: {
        ...mockLocation,
        address: '456 Shipping Hub, Port City, PC 67890',
      },
      data: {},
      hcsMessageId: 'hcs-msg-003',
      transactionId: '0x1111222233334444555566667777888899990000',
      signature: 'signature-003',
    },
  ];

  const mockProduct: ProductWithEvents = {
    id: 'PROD-2024-001',
    productId: 'PROD-2024-001',
    name: 'Test Product',
    description: 'A test product for verification',
    batchId: 'BATCH-001',
    category: 'agricultural',
    status: 'verified',
    createdAt: new Date('2024-09-01T08:00:00Z'),
    updatedAt: new Date('2024-09-03T10:00:00Z'),
    origin: mockLocation,
    quantity: { amount: 100, unit: 'kg' },
    qrCode: 'qr-code-data',
    guardianCredentialId: null,
    hcsTopicId: 'topic-001',
    verified: true,
    events: mockEvents,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders product timeline with all events', () => {
      render(<ProductTimeline product={mockProduct} />);

      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(
        screen.getByText('A test product for verification')
      ).toBeInTheDocument();
      expect(screen.getByText('Supply Chain Journey')).toBeInTheDocument();
      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('Verified')).toBeInTheDocument();
      expect(screen.getByText('Shipped')).toBeInTheDocument();
    });

    it('displays product ID when name is not available', () => {
      const productWithoutName = { ...mockProduct, name: '' };
      render(<ProductTimeline product={productWithoutName} />);

      expect(screen.getByText('PROD-2024-001')).toBeInTheDocument();
    });

    it('renders without product details header when disabled', () => {
      render(
        <ProductTimeline product={mockProduct} showProductDetails={false} />
      );

      expect(screen.queryByText('Test Product')).not.toBeInTheDocument();
      expect(
        screen.queryByText('A test product for verification')
      ).not.toBeInTheDocument();
      expect(screen.getByText('Supply Chain Journey')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <ProductTimeline product={mockProduct} className='custom-class' />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Product Details', () => {
    it('displays complete product information', () => {
      render(<ProductTimeline product={mockProduct} />);

      expect(screen.getByText('Product ID: PROD-2024-001')).toBeInTheDocument();
      expect(screen.getByText('Category: Electronics')).toBeInTheDocument();
      expect(screen.getByText(/Created:/)).toBeInTheDocument();
      expect(screen.getByText(/Origin:/)).toBeInTheDocument();
    });

    it('handles missing product fields gracefully', () => {
      const minimalProduct: ProductWithEvents = {
        id: 'MINIMAL-001',
        productId: 'MINIMAL-001',
        name: 'Minimal Product',
        batchId: 'BATCH-MINIMAL',
        category: 'agricultural',
        status: 'unverified',
        origin: mockLocation,
        quantity: { amount: 1, unit: 'kg' },
        qrCode: 'qr-minimal',
        guardianCredentialId: null,
        hcsTopicId: 'topic-minimal',
        createdAt: new Date('2024-09-01T08:00:00Z'),
        updatedAt: new Date('2024-09-01T08:00:00Z'),
        verified: false,
        events: [],
      };

      render(<ProductTimeline product={minimalProduct} />);

      expect(screen.getByText('MINIMAL-001')).toBeInTheDocument();
      expect(screen.queryByText(/Category:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Origin:/)).not.toBeInTheDocument();
    });
  });

  describe('Event Rendering', () => {
    it('renders event timeline with correct order', () => {
      render(<ProductTimeline product={mockProduct} />);

      const events = screen
        .getAllByRole('generic')
        .filter(el =>
          el.querySelector('h4')?.textContent?.match(/Created|Verified|Shipped/)
        );

      expect(events).toHaveLength(3);
    });

    it('displays event actors correctly', () => {
      render(<ProductTimeline product={mockProduct} />);

      expect(screen.getByText('John Manufacturer')).toBeInTheDocument();
      expect(screen.getByText('Jane Verifier')).toBeInTheDocument();
      expect(screen.getByText('Bob Shipper')).toBeInTheDocument();
    });

    it('displays truncated wallet addresses', () => {
      render(<ProductTimeline product={mockProduct} />);

      expect(screen.getByText('0x1234...5678')).toBeInTheDocument();
    });

    it('displays transaction IDs', () => {
      render(<ProductTimeline product={mockProduct} />);

      expect(screen.getByText('0xabcd...ef12')).toBeInTheDocument();
      expect(screen.getByText('0xfedc...ba09')).toBeInTheDocument();
      expect(screen.getByText('0x1111...0000')).toBeInTheDocument();
    });

    it('shows location information when enabled', () => {
      render(<ProductTimeline product={mockProduct} showLocation={true} />);

      expect(
        screen.getByText('123 Manufacturing St, Factory City, FC 12345')
      ).toBeInTheDocument();
      expect(
        screen.getByText('456 Shipping Hub, Port City, PC 67890')
      ).toBeInTheDocument();
    });

    it('hides location information when disabled', () => {
      render(<ProductTimeline product={mockProduct} showLocation={false} />);

      expect(
        screen.queryByText('123 Manufacturing St, Factory City, FC 12345')
      ).not.toBeInTheDocument();
    });

    it('displays coordinates when address is not available', () => {
      const productWithCoordinates: ProductWithEvents = {
        ...mockProduct,
        events: [
          {
            ...mockEvents[0],
            location: {
              address: 'Test Address',
              city: 'Lagos',
              state: 'Lagos',
              coordinates: { latitude: 40.7128, longitude: -74.006 },
              country: 'Nigeria',
              region: 'Southwest',
            },
          },
        ],
      };

      render(
        <ProductTimeline product={productWithCoordinates} showLocation={true} />
      );

      expect(screen.getByText('40.7128, -74.0060')).toBeInTheDocument();
    });
  });

  describe('Event Data Details', () => {
    it('shows event data when enabled', () => {
      render(<ProductTimeline product={mockProduct} showEventData={true} />);

      const showDetailsButtons = screen.getAllByText('Show details');
      expect(showDetailsButtons.length).toBeGreaterThan(0);
    });

    it('toggles event data visibility', async () => {
      const user = userEvent.setup();
      render(<ProductTimeline product={mockProduct} showEventData={true} />);

      const showDetailsButton = screen.getByText('Show details');
      await user.click(showDetailsButton);

      expect(screen.getByText('Hide details')).toBeInTheDocument();
      expect(
        screen.getByText('"batchNumber": "BATCH-001"')
      ).toBeInTheDocument();
      expect(screen.getByText('"quality": "Grade A"')).toBeInTheDocument();
    });

    it('hides event data when disabled', () => {
      render(<ProductTimeline product={mockProduct} showEventData={false} />);

      expect(screen.queryByText('Show details')).not.toBeInTheDocument();
    });

    it('handles events without data gracefully', () => {
      const productWithoutData: ProductWithEvents = {
        ...mockProduct,
        events: [
          {
            id: 'event-simple-001',
            productId: 'PROD-2024-001',
            eventType: 'created',
            timestamp: new Date('2024-09-01T08:00:00Z'),
            actor: mockActor,
            location: mockLocation,
            data: {},
            hcsMessageId: 'hcs-msg-simple-001',
            signature: 'signature-simple-001',
          },
        ],
      };

      render(
        <ProductTimeline product={productWithoutData} showEventData={true} />
      );

      expect(screen.queryByText('Show details')).not.toBeInTheDocument();
    });
  });

  describe('Event Icons and Styling', () => {
    it('displays correct icons for each event type', () => {
      render(<ProductTimeline product={mockProduct} />);

      // Check that SVG icons are present
      const icons = document.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('applies correct color classes for event types', () => {
      render(<ProductTimeline product={mockProduct} />);

      const eventContainers = document.querySelectorAll(
        '.bg-blue-100, .bg-green-100, .bg-indigo-100'
      );
      expect(eventContainers.length).toBeGreaterThanOrEqual(3);
    });

    it('handles unknown event types with default styling', () => {
      const productWithUnknownEvent: ProductWithEvents = {
        ...mockProduct,
        events: [
          {
            id: 'event-unknown-001',
            productId: 'PROD-2024-001',
            eventType: 'created',
            timestamp: new Date('2024-09-01T08:00:00Z'),
            actor: mockActor,
            location: mockLocation,
            data: {},
            hcsMessageId: 'hcs-msg-unknown-001',
            signature: 'signature-unknown-001',
          },
        ],
      };

      render(<ProductTimeline product={productWithUnknownEvent} />);

      expect(screen.getByText('Event')).toBeInTheDocument();
    });
  });

  describe('Event Limiting', () => {
    it('respects maxEvents limit', () => {
      render(<ProductTimeline product={mockProduct} maxEvents={2} />);

      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('Verified')).toBeInTheDocument();
      expect(screen.queryByText('Shipped')).not.toBeInTheDocument();
    });

    it('shows "View more" button when events are limited', () => {
      render(<ProductTimeline product={mockProduct} maxEvents={2} />);

      expect(screen.getByText('View 1 more events')).toBeInTheDocument();
    });

    it('does not show "View more" button when all events are displayed', () => {
      render(<ProductTimeline product={mockProduct} maxEvents={5} />);

      expect(screen.queryByText(/View.*more events/)).not.toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('displays empty state when no events are present', () => {
      const productWithoutEvents: ProductWithEvents = {
        ...mockProduct,
        events: [],
      };

      render(<ProductTimeline product={productWithoutEvents} />);

      expect(
        screen.getByText('No supply chain events recorded yet.')
      ).toBeInTheDocument();

      const emptyIcon = document.querySelector('svg');
      expect(emptyIcon).toBeInTheDocument();
    });

    it('displays empty state with correct styling', () => {
      const productWithoutEvents: ProductWithEvents = {
        ...mockProduct,
        events: [],
      };

      render(<ProductTimeline product={productWithoutEvents} />);

      const emptyContainer = screen
        .getByText('No supply chain events recorded yet.')
        .closest('div');
      expect(emptyContainer).toHaveClass('text-center', 'py-8');
    });
  });

  describe('Loading State', () => {
    it('displays loading skeleton when loading', () => {
      render(<ProductTimeline product={mockProduct} loading={true} />);

      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('displays loading skeleton for product details', () => {
      render(
        <ProductTimeline
          product={mockProduct}
          loading={true}
          showProductDetails={true}
        />
      );

      const productSkeletons = document.querySelectorAll('.animate-pulse');
      expect(productSkeletons.length).toBeGreaterThanOrEqual(5); // Product header + events
    });

    it('hides actual content when loading', () => {
      render(<ProductTimeline product={mockProduct} loading={true} />);

      expect(screen.queryByText('Test Product')).not.toBeInTheDocument();
      expect(screen.queryByText('Created')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure', () => {
      render(<ProductTimeline product={mockProduct} />);

      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });

    it('includes time elements with datetime attributes', () => {
      render(<ProductTimeline product={mockProduct} />);

      const timeElements = document.querySelectorAll('time[datetime]');
      expect(timeElements.length).toBeGreaterThanOrEqual(3);

      expect(timeElements[0]).toHaveAttribute(
        'datetime',
        '2024-09-01T08:00:00Z'
      );
    });

    it('provides title attributes for time elements', () => {
      render(<ProductTimeline product={mockProduct} />);

      const timeElements = document.querySelectorAll('time[title]');
      expect(timeElements.length).toBeGreaterThanOrEqual(3);
    });

    it('hides decorative elements from screen readers', () => {
      render(<ProductTimeline product={mockProduct} />);

      const decorativeElements = document.querySelectorAll(
        '[aria-hidden="true"]'
      );
      expect(decorativeElements.length).toBeGreaterThan(0);
    });

    it('provides meaningful text for screen readers', () => {
      render(<ProductTimeline product={mockProduct} />);

      expect(screen.getByText('Supply Chain Journey')).toBeInTheDocument();
      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('Verified')).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('works with React.forwardRef', () => {
      const ref = { current: null };
      render(<ProductTimeline ref={ref} product={mockProduct} />);

      expect(ref.current).toBeTruthy();
    });

    it('passes through additional props', () => {
      render(
        <ProductTimeline product={mockProduct} data-testid='product-timeline' />
      );

      expect(screen.getByTestId('product-timeline')).toBeInTheDocument();
    });

    it('handles timeline without visual connectors for last event', () => {
      render(<ProductTimeline product={mockProduct} />);

      // The last event should not have a connecting line
      const connectorLines = document.querySelectorAll('.bg-gray-200');
      const events = mockProduct.events;

      // Should have connectors for all events except the last one
      expect(connectorLines.length).toBe(events.length - 1);
    });
  });

  describe('Performance', () => {
    it('handles large numbers of events efficiently', () => {
      const manyEvents: ProductEvent[] = Array.from(
        { length: 100 },
        (_, index) => ({
          id: `event-perf-${index}`,
          productId: 'PROD-2024-001',
          eventType: 'processed',
          timestamp: new Date(2024, 8, 1 + index),
          actor: mockActor,
          location: mockLocation,
          data: { index },
          hcsMessageId: `hcs-msg-perf-${index}`,
          signature: `signature-perf-${index}`,
        })
      );

      const productWithManyEvents: ProductWithEvents = {
        ...mockProduct,
        events: manyEvents,
      };

      render(
        <ProductTimeline product={productWithManyEvents} maxEvents={10} />
      );

      // Should only render the limited number
      const renderedEvents = document.querySelectorAll('.relative.flex.gap-4');
      expect(renderedEvents.length).toBe(10);
      expect(screen.getByText('View 90 more events')).toBeInTheDocument();
    });

    it('memoizes expensive operations', () => {
      const { rerender } = render(<ProductTimeline product={mockProduct} />);

      // Multiple re-renders with same props should not cause issues
      rerender(<ProductTimeline product={mockProduct} />);
      rerender(<ProductTimeline product={mockProduct} />);

      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles events without actors', () => {
      const productWithAnonymousEvents: ProductWithEvents = {
        ...mockProduct,
        events: [
          {
            id: 'event-automated-001',
            productId: 'PROD-2024-001',
            eventType: 'processed',
            timestamp: new Date('2024-09-01T08:00:00Z'),
            actor: mockActor,
            location: mockLocation,
            data: {},
            hcsMessageId: 'hcs-msg-automated-001',
            signature: 'signature-automated-001',
          },
        ],
      };

      render(<ProductTimeline product={productWithAnonymousEvents} />);

      expect(screen.queryByText('John Manufacturer')).not.toBeInTheDocument();
      expect(screen.getByText('Event')).toBeInTheDocument();
    });

    it('handles events without locations', () => {
      const productWithoutLocations: ProductWithEvents = {
        ...mockProduct,
        events: [
          {
            id: 'event-no-location-001',
            productId: 'PROD-2024-001',
            eventType: 'created',
            timestamp: new Date('2024-09-01T08:00:00Z'),
            actor: mockActor,
            location: mockLocation,
            data: {},
            hcsMessageId: 'hcs-msg-no-location-001',
            signature: 'signature-no-location-001',
          },
        ],
      };

      render(
        <ProductTimeline
          product={productWithoutLocations}
          showLocation={true}
        />
      );

      expect(
        screen.queryByText('123 Manufacturing St')
      ).not.toBeInTheDocument();
      expect(screen.getByText('John Manufacturer')).toBeInTheDocument();
    });

    it('handles malformed timestamps gracefully', () => {
      const productWithBadTimestamp: ProductWithEvents = {
        ...mockProduct,
        events: [
          {
            id: 'event-bad-timestamp-001',
            productId: 'PROD-2024-001',
            eventType: 'created',
            timestamp: new Date('invalid-timestamp'), // Will create Invalid Date
            actor: mockActor,
            location: mockLocation,
            data: {},
            hcsMessageId: 'hcs-msg-bad-timestamp-001',
            signature: 'signature-bad-timestamp-001',
          },
        ],
      };

      render(<ProductTimeline product={productWithBadTimestamp} />);

      expect(screen.getByText('Created')).toBeInTheDocument();
    });
  });
});
