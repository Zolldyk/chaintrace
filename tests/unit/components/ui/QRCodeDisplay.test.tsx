/**
 * Unit tests for QRCodeDisplay component
 *
 * @since 2.4.0
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { QRCodeDisplay } from '../../../../src/components/ui/QRCodeDisplay';
import type { QRCodeResult } from '../../../../src/types/qr';

describe('QRCodeDisplay', () => {
  const mockQRCode: QRCodeResult = {
    data: 'data:image/png;base64,mockbase64data==',
    format: 'png',
    dimensions: { width: 256, height: 256 },
    timestamp: new Date('2024-01-01'),
    size: 1024,
    mimeType: 'image/png',
    encodedData: 'https://chaintrace.app/verify/CT-2024-123-ABC123?source=qr',
    metadata: {
      errorLevel: 'M',
      version: 5,
      mode: 'alphanumeric',
    },
  };

  const defaultProps = {
    qrCode: mockQRCode,
    productId: 'CT-2024-123-ABC123',
  };

  describe('Basic Rendering', () => {
    test('renders QR code image correctly', () => {
      render(<QRCodeDisplay {...defaultProps} />);

      const qrImage = screen.getByAltText(
        'QR code for product CT-2024-123-ABC123'
      );
      expect(qrImage).toBeInTheDocument();
      expect(qrImage).toHaveAttribute('src', mockQRCode.data);
      expect(qrImage).toHaveAttribute(
        'alt',
        'QR code for product CT-2024-123-ABC123'
      );
    });

    test('renders with accessible labels', () => {
      render(<QRCodeDisplay {...defaultProps} />);

      const container = screen.getByLabelText(
        /QR code for product CT-2024-123-ABC123/
      );
      expect(container).toHaveAttribute(
        'aria-label',
        expect.stringContaining('QR code for product CT-2024-123-ABC123')
      );
      expect(container).toHaveAttribute(
        'aria-label',
        expect.stringContaining(
          'https://chaintrace.app/verify/CT-2024-123-ABC123'
        )
      );
    });

    test('renders different sizes correctly', () => {
      const { rerender } = render(
        <QRCodeDisplay {...defaultProps} size='small' />
      );

      let container = screen.getByLabelText(/QR code for product/);
      expect(container).toHaveClass('w-24', 'h-24');

      rerender(<QRCodeDisplay {...defaultProps} size='large' />);
      container = screen.getByLabelText(/QR code for product/);
      expect(container).toHaveClass('w-48', 'h-48', 'sm:w-64', 'sm:h-64');
    });
  });

  describe('Loading State', () => {
    test('shows loading skeleton when isLoading is true', () => {
      render(
        <QRCodeDisplay
          {...defaultProps}
          qrCode={null as any}
          isLoading={true}
        />
      );

      expect(
        screen.getByRole('img', { name: /loading qr code/i })
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Loading QR code...')).toBeInTheDocument();
    });

    test('shows loading with metadata skeleton', () => {
      render(
        <QRCodeDisplay
          {...defaultProps}
          qrCode={null as any}
          isLoading={true}
          showMetadata={true}
        />
      );

      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(1); // QR skeleton + metadata skeletons
    });
  });

  describe('Error State', () => {
    test('displays error message when error prop is provided', () => {
      const errorMessage = 'Failed to generate QR code';

      render(
        <QRCodeDisplay
          {...defaultProps}
          qrCode={null as any}
          error={errorMessage}
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('QR Error')).toBeInTheDocument();

      // Error message is in screen reader text
      expect(
        screen.getByText(errorMessage, { selector: '.sr-only' })
      ).toBeInTheDocument();
    });

    test('has proper ARIA labels for error state', () => {
      render(
        <QRCodeDisplay
          {...defaultProps}
          qrCode={null as any}
          error='Test error'
        />
      );

      const errorContainer = screen.getByRole('alert');
      expect(errorContainer).toHaveAttribute(
        'aria-label',
        'QR code generation failed for product CT-2024-123-ABC123'
      );
    });
  });

  describe('Empty State', () => {
    test('shows empty state when no QR code is provided', () => {
      render(<QRCodeDisplay {...defaultProps} qrCode={null as any} />);

      expect(screen.getByText('No QR Code')).toBeInTheDocument();
    });
  });

  describe('Download Functionality', () => {
    test('shows download button when showDownload is true', () => {
      const onDownload = vi.fn();

      render(
        <QRCodeDisplay
          {...defaultProps}
          showDownload={true}
          onDownload={onDownload}
        />
      );

      const downloadButton = screen.getByRole('button', {
        name: /download qr code as png/i,
      });
      expect(downloadButton).toBeInTheDocument();
    });

    test('calls onDownload when download button is clicked', () => {
      const onDownload = vi.fn();

      render(
        <QRCodeDisplay
          {...defaultProps}
          showDownload={true}
          onDownload={onDownload}
        />
      );

      const downloadButton = screen.getByRole('button', {
        name: /download qr code as png/i,
      });
      fireEvent.click(downloadButton);

      expect(onDownload).toHaveBeenCalledWith(mockQRCode, 'png');
    });

    test('shows loading state on download button', async () => {
      const onDownload = vi
        .fn()
        .mockImplementation(
          () => new Promise(resolve => setTimeout(resolve, 100))
        );

      render(
        <QRCodeDisplay
          {...defaultProps}
          showDownload={true}
          onDownload={onDownload}
        />
      );

      const downloadButton = screen.getByRole('button', {
        name: /download qr code as png/i,
      });
      fireEvent.click(downloadButton);

      expect(screen.getByText('Downloading...')).toBeInTheDocument();
      expect(downloadButton).toBeDisabled();
    });
  });

  describe('Metadata Display', () => {
    test('shows metadata when showMetadata is true', () => {
      render(<QRCodeDisplay {...defaultProps} showMetadata={true} />);

      expect(screen.getByText('Product:')).toBeInTheDocument();
      expect(screen.getByText('CT-2024-123-ABC123')).toBeInTheDocument();
      expect(screen.getByText('Format:')).toBeInTheDocument();
      expect(screen.getByText('PNG')).toBeInTheDocument();
      expect(screen.getByText('Size:')).toBeInTheDocument();
      expect(screen.getByText('256×256')).toBeInTheDocument();
    });

    test('links QR code to metadata with aria-describedby', () => {
      render(<QRCodeDisplay {...defaultProps} showMetadata={true} />);

      const qrContainer = screen.getByLabelText(/QR code for product/);
      expect(qrContainer).toHaveAttribute(
        'aria-describedby',
        'qr-metadata-CT-2024-123-ABC123'
      );

      const metadata = document.getElementById(
        'qr-metadata-CT-2024-123-ABC123'
      );
      expect(metadata).toBeInTheDocument();
    });
  });

  describe('Click Interaction', () => {
    test('makes QR code clickable when onClick is provided', () => {
      const onClick = vi.fn();

      render(<QRCodeDisplay {...defaultProps} onClick={onClick} />);

      const qrContainer = screen.getByRole('button');
      expect(qrContainer).toBeInTheDocument();

      fireEvent.click(qrContainer);
      expect(onClick).toHaveBeenCalledWith(mockQRCode);
    });

    test('supports keyboard interaction when clickable', () => {
      const onClick = vi.fn();

      render(<QRCodeDisplay {...defaultProps} onClick={onClick} />);

      const qrContainer = screen.getByRole('button');

      fireEvent.keyDown(qrContainer, { key: 'Enter', code: 'Enter' });
      expect(onClick).toHaveBeenCalledWith(mockQRCode);

      onClick.mockClear();

      fireEvent.keyDown(qrContainer, { key: ' ', code: 'Space' });
      expect(onClick).toHaveBeenCalledWith(mockQRCode);
    });

    test('shows hover indicator when clickable', () => {
      const onClick = vi.fn();

      render(<QRCodeDisplay {...defaultProps} onClick={onClick} />);

      const qrContainer = screen.getByRole('button');
      expect(qrContainer).toHaveClass('cursor-pointer');
    });
  });

  describe('SVG Format Handling', () => {
    test('renders SVG QR codes using dangerouslySetInnerHTML', () => {
      const svgQRCode: QRCodeResult = {
        ...mockQRCode,
        format: 'svg',
        data: '<svg><rect width="100" height="100" fill="black"/></svg>',
        mimeType: 'image/svg+xml',
      };

      render(
        <QRCodeDisplay qrCode={svgQRCode} productId='CT-2024-123-ABC123' />
      );

      const svgContainer = document.querySelector('[aria-hidden="true"]');
      expect(svgContainer?.innerHTML).toContain('<svg>');
      expect(svgContainer?.innerHTML).toContain('<rect');
    });
  });

  describe('Responsive Design', () => {
    test('applies responsive classes correctly', () => {
      render(<QRCodeDisplay {...defaultProps} size='medium' />);

      const container = screen.getByLabelText(/QR code for product/);
      expect(container).toHaveClass('w-32', 'h-32', 'sm:w-40', 'sm:h-40');
    });
  });

  describe('Dark Mode Support', () => {
    test('applies dark mode classes', () => {
      render(<QRCodeDisplay {...defaultProps} />);

      // Check that the component renders with dark mode classes
      const container = screen.getByLabelText(/QR code for product/);
      expect(container).toHaveClass('dark:bg-gray-800');
    });
  });

  describe('Accessibility', () => {
    test('provides proper focus management', () => {
      const onClick = vi.fn();

      render(<QRCodeDisplay {...defaultProps} onClick={onClick} />);

      const qrContainer = screen.getByRole('button');
      expect(qrContainer).toHaveAttribute('tabIndex', '0');
    });

    test('has proper ARIA attributes', () => {
      render(<QRCodeDisplay {...defaultProps} showMetadata={true} />);

      const qrContainer = screen.getByLabelText(/QR code for product/);
      expect(qrContainer).toHaveAttribute(
        'aria-describedby',
        'qr-metadata-CT-2024-123-ABC123'
      );
    });
  });

  describe('Custom Styling', () => {
    test('applies custom className', () => {
      const { container } = render(
        <QRCodeDisplay {...defaultProps} className='custom-class' />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
