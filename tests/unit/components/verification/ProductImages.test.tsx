/**
 * Unit tests for ProductImages component
 *
 * Tests product image gallery display, QR code integration,
 * mobile optimizations, error handling, and accessibility features.
 *
 * @since 1.0.0
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ProductImages,
  ProductImageThumbnail,
} from '@/components/verification/ProductImages';
import { ProductWithEvents } from '@/types/product';

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    className,
    onError,
    onClick,
    fill,
    sizes,
    priority,
    ...props
  }: any) => (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={onError}
      onClick={onClick}
      data-testid='next-image'
      data-fill={fill}
      data-sizes={sizes}
      data-priority={priority}
      {...props}
    />
  ),
}));

// Mock utilities
vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
}));

describe('ProductImages', () => {
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
    origin: {
      address: '123 Test St',
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria',
      region: 'Southwest',
      coordinates: { latitude: 6.5244, longitude: 3.3792 },
    },
    quantity: { amount: 100, unit: 'kg' },
    qrCode: 'QR-TEST-CODE-12345',
    guardianCredentialId: null,
    hcsTopicId: 'topic-001',
    verified: true,
    events: [],
    metadata: {
      images: [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg',
      ],
      qualityGrade: 'A+',
      certifications: ['Organic', 'Fair Trade'],
    },
  };

  const mockProductWithoutImages: ProductWithEvents = {
    ...mockProduct,
    metadata: {
      qualityGrade: 'A+',
      certifications: ['Organic'],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders product images gallery with all images', () => {
      render(<ProductImages product={mockProduct} />);

      expect(screen.getByText('Product Images')).toBeInTheDocument();
      expect(screen.getByText('3 images')).toBeInTheDocument();

      // Check that Next.js Image component is used
      const images = screen.getAllByTestId('next-image');
      expect(images).toHaveLength(4); // 1 featured + 3 thumbnails
    });

    it('renders placeholder when no images available', () => {
      render(<ProductImages product={mockProductWithoutImages} />);

      expect(
        screen.getByText('No Product Images Available')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Product images will be displayed here/)
      ).toBeInTheDocument();
    });

    it('hides placeholder when showPlaceholder is false', () => {
      render(
        <ProductImages
          product={mockProductWithoutImages}
          showPlaceholder={false}
        />
      );

      expect(
        screen.queryByText('No Product Images Available')
      ).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <ProductImages product={mockProduct} className='custom-class' />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Image Gallery Functionality', () => {
    it('displays featured image correctly', () => {
      render(<ProductImages product={mockProduct} />);

      const featuredImage = screen.getByAltText('Product image 1');
      expect(featuredImage).toHaveAttribute(
        'src',
        'https://example.com/image1.jpg'
      );
    });

    it('switches featured image when thumbnail is clicked', async () => {
      const user = userEvent.setup();
      render(<ProductImages product={mockProduct} />);

      // Click on second thumbnail
      const thumbnails = screen.getAllByAltText(/Product thumbnail/);
      await user.click(thumbnails[1]);

      // Featured image should now show the second image
      const featuredImage = screen.getByAltText('Product image 2');
      expect(featuredImage).toHaveAttribute(
        'src',
        'https://example.com/image2.jpg'
      );
    });

    it('shows correct image counter', () => {
      render(<ProductImages product={mockProduct} />);

      expect(screen.getByText('1 of 3')).toBeInTheDocument();
    });

    it('updates image counter when switching images', async () => {
      const user = userEvent.setup();
      render(<ProductImages product={mockProduct} />);

      const thumbnails = screen.getAllByAltText(/Product thumbnail/);
      await user.click(thumbnails[2]);

      expect(screen.getByText('3 of 3')).toBeInTheDocument();
    });

    it('limits images based on maxImages prop', () => {
      render(<ProductImages product={mockProduct} maxImages={2} />);

      expect(screen.getByText('2 images')).toBeInTheDocument();
      const thumbnails = screen.getAllByAltText(/Product thumbnail/);
      expect(thumbnails).toHaveLength(2);
    });

    it('calls onImageClick callback when image is clicked', async () => {
      const mockOnImageClick = vi.fn();
      const user = userEvent.setup();

      render(
        <ProductImages product={mockProduct} onImageClick={mockOnImageClick} />
      );

      const featuredImage = screen.getByAltText('Product image 1');
      await user.click(featuredImage);

      expect(mockOnImageClick).toHaveBeenCalledWith(
        'https://example.com/image1.jpg',
        0
      );
    });
  });

  describe('Error Handling', () => {
    it('handles image load errors gracefully', () => {
      render(<ProductImages product={mockProduct} />);

      const featuredImage = screen.getByAltText('Product image 1');
      fireEvent.error(featuredImage);

      expect(screen.getByText('Image failed to load')).toBeInTheDocument();
    });

    it('shows error placeholder for failed thumbnail images', () => {
      render(<ProductImages product={mockProduct} />);

      const thumbnails = screen.getAllByAltText(/Product thumbnail/);
      fireEvent.error(thumbnails[0]);

      // Error icon should be visible in thumbnail
      const errorIcon = screen.getByLabelText('Image load error');
      expect(errorIcon).toBeInTheDocument();
    });

    it('maintains functionality when some images fail to load', async () => {
      const user = userEvent.setup();
      render(<ProductImages product={mockProduct} />);

      // Simulate first image failing
      const thumbnails = screen.getAllByAltText(/Product thumbnail/);
      fireEvent.error(thumbnails[0]);

      // Should still be able to select other thumbnails
      await user.click(thumbnails[1]);
      expect(screen.getByText('2 of 3')).toBeInTheDocument();
    });
  });

  describe('QR Code Display', () => {
    it('displays QR code section when enabled and QR code exists', () => {
      render(<ProductImages product={mockProduct} showQRCode={true} />);

      expect(screen.getByText('Product QR Code')).toBeInTheDocument();
      expect(screen.getByText('Verification QR Code')).toBeInTheDocument();
      expect(screen.getByText('QR-TEST-CODE-12345')).toBeInTheDocument();
    });

    it('hides QR code section when disabled', () => {
      render(<ProductImages product={mockProduct} showQRCode={false} />);

      expect(screen.queryByText('Product QR Code')).not.toBeInTheDocument();
    });

    it('hides QR code section when no QR code exists', () => {
      const productWithoutQR = { ...mockProduct, qrCode: '' };
      render(<ProductImages product={productWithoutQR} showQRCode={true} />);

      expect(screen.queryByText('Product QR Code')).not.toBeInTheDocument();
    });

    it('calls onQRCodeClick callback when QR code button is clicked', async () => {
      const mockOnQRCodeClick = vi.fn();
      const user = userEvent.setup();

      render(
        <ProductImages
          product={mockProduct}
          onQRCodeClick={mockOnQRCodeClick}
        />
      );

      const qrButton = screen.getByText('Copy QR Code');
      await user.click(qrButton);

      expect(mockOnQRCodeClick).toHaveBeenCalled();
    });
  });

  describe('Metadata Display', () => {
    it('displays additional product metadata', () => {
      render(<ProductImages product={mockProduct} />);

      expect(
        screen.getByText('Additional Product Information')
      ).toBeInTheDocument();
      expect(screen.getByText('quality Grade')).toBeInTheDocument(); // Lowercase as rendered by capitalize class
      expect(screen.getByText('A+')).toBeInTheDocument();
      expect(screen.getByText('certifications')).toBeInTheDocument(); // Lowercase as rendered
    });

    it('handles metadata with nested objects', () => {
      const productWithComplexMetadata = {
        ...mockProduct,
        metadata: {
          ...mockProduct.metadata,
          specifications: {
            weight: '100kg',
            dimensions: { length: 50, width: 30, height: 20 },
          },
        },
      };

      render(<ProductImages product={productWithComplexMetadata} />);

      expect(screen.getByText('specifications')).toBeInTheDocument();
      // JSON stringified nested object should be visible
      expect(screen.getByText(/"weight": "100kg"/)).toBeInTheDocument();
    });

    it('does not display metadata section when no metadata exists', () => {
      const productWithoutMetadata = { ...mockProduct, metadata: {} };
      render(<ProductImages product={productWithoutMetadata} />);

      expect(
        screen.queryByText('Additional Product Information')
      ).not.toBeInTheDocument();
    });

    it('excludes images from metadata display', () => {
      render(<ProductImages product={mockProduct} />);

      // Images should be in gallery, not metadata section
      const metadataSection = screen
        .getByText('Additional Product Information')
        .closest('div');
      expect(metadataSection).not.toHaveTextContent(
        'https://example.com/image1.jpg'
      );
    });
  });

  describe('Mobile Optimization', () => {
    it('applies mobile-optimized classes when enabled', () => {
      render(<ProductImages product={mockProduct} mobileOptimized={true} />);

      // Check for mobile-specific classes on the gallery container
      const spacingContainer = document.querySelector(
        '.space-y-4.sm\\:space-y-6'
      );
      expect(spacingContainer).toBeTruthy();
    });

    it('uses standard classes when mobile optimization is disabled', () => {
      render(<ProductImages product={mockProduct} mobileOptimized={false} />);

      const thumbnailContainer = screen
        .getAllByAltText(/Product thumbnail/)[0]
        .closest('.flex');
      expect(thumbnailContainer).not.toHaveClass(
        'h-16',
        'w-16',
        'sm:h-20',
        'sm:w-20'
      );
    });

    it('handles touch interactions properly', async () => {
      const user = userEvent.setup();
      render(<ProductImages product={mockProduct} mobileOptimized={true} />);

      const thumbnails = screen.getAllByAltText(/Product thumbnail/);
      await user.click(thumbnails[1]);

      // Should update selected image index
      expect(screen.getByText('2 of 3')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and alt text', () => {
      render(<ProductImages product={mockProduct} />);

      expect(screen.getByAltText('Product image 1')).toBeInTheDocument();
      expect(screen.getByAltText('Product thumbnail 1')).toBeInTheDocument();
    });

    it('provides semantic structure with headings', () => {
      render(<ProductImages product={mockProduct} />);

      expect(
        screen.getByRole('heading', { name: 'Product Images' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Product QR Code' })
      ).toBeInTheDocument();
    });

    it('includes proper focus management for keyboard navigation', () => {
      render(<ProductImages product={mockProduct} />);

      const thumbnails = screen.getAllByRole('button');
      expect(thumbnails.length).toBeGreaterThan(0);
      // Buttons are created via button elements (implicit type="button")
      thumbnails.forEach(thumbnail => {
        expect(thumbnail.tagName).toBe('BUTTON');
      });
    });

    it('provides descriptive text for screen readers', () => {
      render(<ProductImages product={mockProduct} />);

      expect(
        screen.getByText(/Scan this QR code to quickly verify/)
      ).toBeInTheDocument();

      // For products without images, test the placeholder text
      render(<ProductImages product={mockProductWithoutImages} />);
      expect(
        screen.getByText(/Product images will be displayed here/)
      ).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('handles large numbers of images efficiently', () => {
      const productWithManyImages = {
        ...mockProduct,
        metadata: {
          ...mockProduct.metadata,
          images: Array.from(
            { length: 50 },
            (_, i) => `https://example.com/image${i}.jpg`
          ),
        },
      };

      render(<ProductImages product={productWithManyImages} maxImages={10} />);

      expect(screen.getByText('10 images')).toBeInTheDocument();
      const thumbnails = screen.getAllByAltText(/Product thumbnail/);
      expect(thumbnails).toHaveLength(10);
    });

    it('uses proper image sizes attribute for Next.js optimization', () => {
      render(<ProductImages product={mockProduct} />);

      const featuredImage = screen.getByAltText('Product image 1');
      expect(featuredImage).toHaveAttribute(
        'data-sizes',
        '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
      );

      const thumbnails = screen.getAllByAltText(/Product thumbnail/);
      expect(thumbnails[0]).toHaveAttribute('data-sizes', '80px');
    });
  });
});

describe('ProductImageThumbnail', () => {
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
    origin: {
      address: '123 Test St',
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria',
      region: 'Southwest',
      coordinates: { latitude: 6.5244, longitude: 3.3792 },
    },
    quantity: { amount: 100, unit: 'kg' },
    qrCode: 'QR-TEST-CODE-12345',
    guardianCredentialId: null,
    hcsTopicId: 'topic-001',
    verified: true,
    events: [],
    metadata: {
      images: ['https://example.com/thumbnail.jpg'],
    },
  };

  it('renders thumbnail with correct size classes', () => {
    render(<ProductImageThumbnail product={mockProduct} size='md' />);

    const container = screen
      .getByAltText('Test Product thumbnail')
      .closest('div');
    expect(container).toHaveClass('h-16', 'w-16');
  });

  it('renders different size variants correctly', () => {
    const { rerender } = render(
      <ProductImageThumbnail product={mockProduct} size='sm' />
    );

    let container = screen
      .getByAltText('Test Product thumbnail')
      .closest('div');
    expect(container).toHaveClass('h-12', 'w-12');

    rerender(<ProductImageThumbnail product={mockProduct} size='lg' />);

    container = screen.getByAltText('Test Product thumbnail').closest('div');
    expect(container).toHaveClass('h-24', 'w-24');
  });

  it('shows placeholder when no image is available', () => {
    const productWithoutImages = { ...mockProduct, metadata: {} };
    render(<ProductImageThumbnail product={productWithoutImages} />);

    const placeholder = screen.getByLabelText('No image available');
    expect(placeholder).toBeInTheDocument();
  });

  it('handles image load errors gracefully', () => {
    render(<ProductImageThumbnail product={mockProduct} />);

    const image = screen.getByAltText('Test Product thumbnail');
    fireEvent.error(image);

    const placeholder = screen.getByLabelText('Image load failed');
    expect(placeholder).toBeInTheDocument();
  });

  it('calls onClick callback when clicked', async () => {
    const mockOnClick = vi.fn();
    const user = userEvent.setup();

    render(
      <ProductImageThumbnail product={mockProduct} onClick={mockOnClick} />
    );

    const thumbnail = screen
      .getByAltText('Test Product thumbnail')
      .closest('div');
    await user.click(thumbnail!);

    expect(mockOnClick).toHaveBeenCalled();
  });

  it('applies hover effects when clickable', () => {
    render(<ProductImageThumbnail product={mockProduct} onClick={() => {}} />);

    const container = screen
      .getByAltText('Test Product thumbnail')
      .closest('div');
    expect(container).toHaveClass(
      'cursor-pointer',
      'transition-transform',
      'hover:scale-105'
    );
  });

  it('applies custom className', () => {
    render(
      <ProductImageThumbnail
        product={mockProduct}
        className='custom-thumbnail'
      />
    );

    const container = screen
      .getByAltText('Test Product thumbnail')
      .closest('div');
    expect(container).toHaveClass('custom-thumbnail');
  });
});
