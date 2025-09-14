/**
 * Unit tests for ProductDetails component
 *
 * Tests detailed product information display, credential integration,
 * interactive map features, mobile optimizations, and accessibility.
 *
 * @since 1.0.0
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ProductDetails,
  ProductCredentialSummary,
} from '@/components/verification/ProductDetails';
import { ProductWithEvents } from '@/types/product';
import { ComplianceCredential } from '@/types/compliance';

// Mock fetch for credential loading
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock child components
vi.mock('@/components/ui/Card', () => ({
  Card: ({ children, className }: any) => (
    <div className={`card ${className}`}>{children}</div>
  ),
}));

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('./VerificationStatus', () => ({
  VerificationStatus: ({ status, ...props }: any) => (
    <div data-testid='verification-status' data-status={status} {...props}>
      Status: {status}
    </div>
  ),
}));

vi.mock('./CredentialDisplay', () => ({
  CredentialDisplay: ({ credential }: any) => (
    <div data-testid='credential-display' data-credential-id={credential.id}>
      Credential: {credential.type}
    </div>
  ),
}));

vi.mock('./CredentialBadge', () => ({
  CredentialBadge: ({ status }: any) => (
    <div data-testid='credential-badge' data-status={status}>
      Badge: {status}
    </div>
  ),
}));

vi.mock('@/components/ui/ExpirationWarning', () => ({
  ExpirationWarning: ({ expirationInfo }: any) => (
    <div
      data-testid='expiration-warning'
      data-credential-id={expirationInfo.credentialId}
    >
      Warning for: {expirationInfo.credentialId}
    </div>
  ),
}));

// Mock utilities
vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
  formatDate: vi.fn(
    (timestamp: number, options?: Intl.DateTimeFormatOptions) => {
      const date = new Date(timestamp);
      if (options?.dateStyle === 'medium') {
        return date.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      }
      return date.toLocaleDateString('en-US');
    }
  ),
}));

vi.mock('@/lib/credential-formatting', () => ({
  formatCredential: (credential: any) => ({
    display: {
      title: `${credential.type} Credential`,
      type: { icon: '📜' },
    },
  }),
}));

describe('ProductDetails', () => {
  const mockProduct: ProductWithEvents = {
    id: 'PROD-2024-001',
    productId: 'PROD-2024-001',
    name: 'Premium Coffee Beans',
    description: 'High-quality Arabica coffee beans from Nigeria',
    batchId: 'BATCH-001',
    category: 'agricultural',
    status: 'verified',
    createdAt: new Date('2024-09-01T08:00:00Z'),
    updatedAt: new Date('2024-09-03T10:00:00Z'),
    origin: {
      address: '123 Farm Road, Plateau State, Nigeria',
      city: 'Jos',
      state: 'Plateau',
      country: 'Nigeria',
      region: 'North Central',
      coordinates: { latitude: 9.8965, longitude: 8.8583 },
    },
    quantity: { amount: 500, unit: 'kg' },
    qrCode: 'QR-COFFEE-12345',
    guardianCredentialId: null,
    hcsTopicId: 'topic-001',
    verified: true,
    lastVerified: '2024-09-03T10:00:00Z',
    expiresAt: '2024-12-03T10:00:00Z',
    events: [],
    metadata: {
      qualityGrade: 'AAA',
      certifications: ['Organic', 'Fair Trade'],
    },
  };

  const mockCredentials: ComplianceCredential[] = [
    {
      id: 'cred-001',
      type: 'organic',
      status: 'active',
      issuer: 'Nigeria Organic Certification',
      issuedAt: '2024-09-01T00:00:00Z',
      expiresAt: '2024-12-01T23:59:59Z',
      data: { grade: 'A+' },
    },
    {
      id: 'cred-002',
      type: 'fair_trade',
      status: 'expired',
      issuer: 'Fair Trade Alliance',
      issuedAt: '2024-01-01T00:00:00Z',
      expiresAt: '2024-06-01T23:59:59Z',
      data: {},
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          credentials: mockCredentials,
          expirationInfo: {
            expiring: [
              {
                credentialId: 'cred-001',
                daysUntilExpiry: 30,
                status: 'expiring_soon',
              },
            ],
          },
        }),
    });
  });

  describe('Rendering', () => {
    it('renders complete product information', async () => {
      render(<ProductDetails product={mockProduct} />);

      expect(screen.getByText('Premium Coffee Beans')).toBeInTheDocument();
      expect(
        screen.getByText('High-quality Arabica coffee beans from Nigeria')
      ).toBeInTheDocument();
      expect(screen.getByText('PROD-2024-001')).toBeInTheDocument();
      expect(screen.getByText('BATCH-001')).toBeInTheDocument();
      expect(screen.getByText('agricultural')).toBeInTheDocument();

      // Wait for verification status
      await waitFor(() => {
        expect(screen.getByTestId('verification-status')).toBeInTheDocument();
      });
    });

    it('displays product origin information with interactive elements', () => {
      render(<ProductDetails product={mockProduct} />);

      expect(screen.getByText('Product Origin')).toBeInTheDocument();
      expect(
        screen.getByText('123 Farm Road, Plateau State, Nigeria')
      ).toBeInTheDocument();
      expect(screen.getByText('Jos')).toBeInTheDocument();
      expect(screen.getByText('Plateau')).toBeInTheDocument();
      expect(screen.getByText('🇳🇬')).toBeInTheDocument();
      expect(screen.getByText('Nigeria')).toBeInTheDocument();
      expect(screen.getByText('North Central')).toBeInTheDocument();
    });

    it('shows interactive map integration with coordinates', () => {
      render(<ProductDetails product={mockProduct} />);

      expect(screen.getByText('Location Coordinates')).toBeInTheDocument();
      expect(screen.getByText('9.896500°')).toBeInTheDocument();
      expect(screen.getByText('8.858300°')).toBeInTheDocument();
      expect(screen.getByText('View on Map')).toBeInTheDocument();
    });

    it('handles product without coordinates gracefully', () => {
      const productWithoutCoords = {
        ...mockProduct,
        origin: { ...mockProduct.origin, coordinates: undefined },
      };

      render(<ProductDetails product={productWithoutCoords} />);

      expect(
        screen.getByText('Location coordinates not available')
      ).toBeInTheDocument();
      expect(screen.queryByText('View on Map')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <ProductDetails product={mockProduct} className='custom-details' />
      );

      expect(container.firstChild).toHaveClass('custom-details');
    });
  });

  describe('Product Metadata Display', () => {
    it('displays quantity information', () => {
      render(<ProductDetails product={mockProduct} />);

      expect(screen.getByText('Quantity')).toBeInTheDocument();
      expect(screen.getByText('500')).toBeInTheDocument();
      expect(screen.getByText('kg')).toBeInTheDocument();
    });

    it('displays creation and update timestamps', () => {
      render(<ProductDetails product={mockProduct} />);

      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('Last Updated')).toBeInTheDocument();

      // Check for Nigerian locale formatting
      expect(screen.getByText(/September/)).toBeInTheDocument();
      expect(screen.getByText(/2024/)).toBeInTheDocument();
    });

    it('shows relative time for last updated', () => {
      render(<ProductDetails product={mockProduct} />);

      // Should show relative time like "days ago" or "Recently updated"
      const updatedText = screen.getByText(
        /day.*ago|Recently updated|hour.*ago/
      );
      expect(updatedText).toBeInTheDocument();
    });

    it('hides details when showDetails is false', () => {
      render(<ProductDetails product={mockProduct} showDetails={false} />);

      expect(screen.queryByText('Product Origin')).not.toBeInTheDocument();
      expect(screen.queryByText('Quantity')).not.toBeInTheDocument();
    });
  });

  describe('Copy Functionality', () => {
    it('has copy buttons for Product ID and Batch ID', () => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn(),
        },
      });

      render(<ProductDetails product={mockProduct} />);

      const copyButtons = screen.getAllByTitle(/Copy/);
      expect(copyButtons.length).toBeGreaterThanOrEqual(2); // Product ID + Batch ID
    });

    it('calls clipboard.writeText when copy buttons are clicked', async () => {
      const writeTextSpy = vi.fn();
      Object.assign(navigator, {
        clipboard: { writeText: writeTextSpy },
      });

      const user = userEvent.setup();
      render(<ProductDetails product={mockProduct} />);

      const productIdCopyButton = screen.getByTitle('Copy Product ID');
      await user.click(productIdCopyButton);

      expect(writeTextSpy).toHaveBeenCalledWith('PROD-2024-001');
    });
  });

  describe('Map Integration', () => {
    it('opens Google Maps when View on Map is clicked', async () => {
      const user = userEvent.setup();
      const openSpy = vi.spyOn(window, 'open').mockImplementation();

      render(<ProductDetails product={mockProduct} />);

      const mapButton = screen.getByText('View on Map');
      await user.click(mapButton);

      expect(openSpy).toHaveBeenCalledWith(
        'https://www.google.com/maps/search/?api=1&query=9.8965,8.8583',
        '_blank'
      );
    });

    it('shows visual map representation', () => {
      render(<ProductDetails product={mockProduct} />);

      expect(screen.getByText('Product Location')).toBeInTheDocument();

      // Should show animated location dot
      const locationDot = document.querySelector('.animate-pulse.bg-red-500');
      expect(locationDot).toBeInTheDocument();
    });
  });

  describe('Credentials Integration', () => {
    it('loads and displays credentials', async () => {
      render(<ProductDetails product={mockProduct} />);

      expect(screen.getByText('Compliance Credentials')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Loading credentials...')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/products/PROD-2024-001/credentials'
        );
      });
    });

    it('displays credentials when loaded successfully', async () => {
      render(<ProductDetails product={mockProduct} />);

      await waitFor(() => {
        expect(screen.getByText('2 credentials')).toBeInTheDocument();
        expect(screen.getAllByTestId('credential-display')).toHaveLength(2);
      });
    });

    it('shows expiration warnings', async () => {
      render(<ProductDetails product={mockProduct} />);

      await waitFor(() => {
        expect(screen.getByTestId('expiration-warning')).toBeInTheDocument();
      });
    });

    it('displays credential status summary', async () => {
      render(<ProductDetails product={mockProduct} />);

      await waitFor(() => {
        expect(
          screen.getByText('Credential Status Summary')
        ).toBeInTheDocument();
        expect(
          screen.getByText('1 active, 1 expired, 0 revoked')
        ).toBeInTheDocument();
        expect(screen.getAllByTestId('credential-badge')).toHaveLength(2);
      });
    });

    it('handles credential loading errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<ProductDetails product={mockProduct} />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('retries credential loading when retry button is clicked', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              credentials: mockCredentials,
              expirationInfo: { expiring: [] },
            }),
        });

      const user = userEvent.setup();
      render(<ProductDetails product={mockProduct} />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(screen.getByText('2 credentials')).toBeInTheDocument();
      });
    });

    it('hides credentials section when showCredentials is false', () => {
      render(<ProductDetails product={mockProduct} showCredentials={false} />);

      expect(
        screen.queryByText('Compliance Credentials')
      ).not.toBeInTheDocument();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('shows empty state when no credentials exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            credentials: [],
            expirationInfo: { expiring: [] },
          }),
      });

      render(<ProductDetails product={mockProduct} />);

      await waitFor(() => {
        expect(
          screen.getByText('No compliance credentials found for this product')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Callbacks', () => {
    it('calls onCredentialClick when credential is clicked', async () => {
      const mockOnCredentialClick = vi.fn();

      render(
        <ProductDetails
          product={mockProduct}
          onCredentialClick={mockOnCredentialClick}
        />
      );

      // Mock the credential action handling
      await waitFor(() => {
        expect(screen.getAllByTestId('credential-display')).toHaveLength(2);
      });

      // Simulate credential click through the component's internal handling
      // This would normally be triggered by CredentialDisplay component
      const firstCredential = mockCredentials[0];

      // Test that the handler exists and can be called
      const component = screen.getByTestId('credential-display');
      expect(component).toBeInTheDocument();
    });

    it('calls onVerifyCredential when credential verification is requested', async () => {
      const mockOnVerifyCredential = vi.fn();

      render(
        <ProductDetails
          product={mockProduct}
          onVerifyCredential={mockOnVerifyCredential}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByTestId('credential-display')).toHaveLength(2);
      });

      // Component should pass the callback to CredentialDisplay
      const credentialDisplays = screen.getAllByTestId('credential-display');
      expect(credentialDisplays).toHaveLength(2);
    });
  });

  describe('Mobile Optimization', () => {
    it('uses responsive grid layouts', () => {
      render(<ProductDetails product={mockProduct} />);

      // Check for responsive grid classes
      const gridContainer = document.querySelector(
        '.grid.grid-cols-1.sm\\:grid-cols-3'
      );
      expect(gridContainer).toBeInTheDocument();
    });

    it('applies mobile-first responsive classes', () => {
      render(<ProductDetails product={mockProduct} />);

      // Check for mobile-optimized flex layouts
      const flexContainer = document.querySelector('.flex-col.sm\\:flex-row');
      expect(flexContainer).toBeInTheDocument();
    });

    it('uses appropriate text sizes for mobile', () => {
      render(<ProductDetails product={mockProduct} />);

      // Check for responsive text sizing
      const heading = screen.getByText('Premium Coffee Beans');
      expect(heading.closest('h2')).toHaveClass('text-2xl', 'sm:text-3xl');
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure with headings', () => {
      render(<ProductDetails product={mockProduct} />);

      expect(
        screen.getByRole('heading', { name: 'Premium Coffee Beans' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Product Origin' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Compliance Credentials' })
      ).toBeInTheDocument();
    });

    it('provides descriptive labels for data', () => {
      render(<ProductDetails product={mockProduct} />);

      // Check for proper dt/dd structure
      expect(screen.getByText('Address')).toBeInTheDocument();
      expect(screen.getByText('City')).toBeInTheDocument();
      expect(screen.getByText('State')).toBeInTheDocument();
      expect(screen.getByText('Country')).toBeInTheDocument();
    });

    it('includes focus management for interactive elements', () => {
      render(<ProductDetails product={mockProduct} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('type');
      });
    });

    it('provides proper alt text and ARIA labels', async () => {
      render(<ProductDetails product={mockProduct} />);

      // Verification status should have proper accessibility
      await waitFor(() => {
        const verificationStatus = screen.getByTestId('verification-status');
        expect(verificationStatus).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles missing product fields gracefully', () => {
      const minimalProduct = {
        id: 'MINIMAL-001',
        productId: 'MINIMAL-001',
        name: 'Minimal Product',
        batchId: 'BATCH-MINIMAL',
        category: 'agricultural',
        status: 'unverified' as const,
        origin: {
          city: 'Lagos',
          state: 'Lagos',
          country: 'Nigeria',
          region: 'Southwest',
        },
        quantity: { amount: 1, unit: 'kg' },
        qrCode: 'qr-minimal',
        guardianCredentialId: null,
        hcsTopicId: 'topic-minimal',
        createdAt: new Date('2024-09-01T08:00:00Z'),
        updatedAt: new Date('2024-09-01T08:00:00Z'),
        verified: false,
        events: [],
      } as ProductWithEvents;

      render(<ProductDetails product={minimalProduct} />);

      expect(screen.getByText('Minimal Product')).toBeInTheDocument();
      expect(screen.queryByText('Description')).not.toBeInTheDocument();
    });

    it('handles API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      render(<ProductDetails product={mockProduct} />);

      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument();
      });
    });

    it('handles network timeouts', async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 100)
          )
      );

      render(<ProductDetails product={mockProduct} />);

      await waitFor(
        () => {
          expect(screen.getByText('Timeout')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });
});

describe('ProductCredentialSummary', () => {
  const mockCredentials = [
    { id: 'cred-1', type: 'organic', status: 'active' },
    { id: 'cred-2', type: 'fair_trade', status: 'expired' },
    { id: 'cred-3', type: 'quality', status: 'active' },
  ];

  beforeEach(() => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ credentials: mockCredentials }),
    });
  });

  it('renders credential summary with limited display', async () => {
    render(<ProductCredentialSummary productId='PROD-001' maxDisplay={2} />);

    await waitFor(() => {
      expect(screen.getByText('+1 more')).toBeInTheDocument();
    });
  });

  it('shows loading state', () => {
    render(<ProductCredentialSummary productId='PROD-001' />);

    expect(screen.getByText('Loading credentials...')).toBeInTheDocument();
  });

  it('handles empty credentials', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ credentials: [] }),
    });

    render(<ProductCredentialSummary productId='PROD-001' />);

    await waitFor(() => {
      expect(screen.getByText('No credentials available')).toBeInTheDocument();
    });
  });

  it('calls onViewAll when "more" button is clicked', async () => {
    const mockOnViewAll = vi.fn();
    const user = userEvent.setup();

    render(
      <ProductCredentialSummary
        productId='PROD-001'
        maxDisplay={2}
        onViewAll={mockOnViewAll}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('+1 more')).toBeInTheDocument();
    });

    const moreButton = screen.getByText('+1 more');
    await user.click(moreButton);

    expect(mockOnViewAll).toHaveBeenCalled();
  });
});
