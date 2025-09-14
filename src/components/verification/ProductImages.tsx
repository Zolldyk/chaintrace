/**
 * ProductImages component for displaying product images and metadata (AC: 6)
 *
 * @example
 * ```tsx
 * <ProductImages
 *   productId={product.id}
 *   images={product.images}
 *   metadata={product.metadata}
 * />
 * ```
 *
 * @since 1.0.0
 */

'use client';

import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { ProductWithEvents } from '@/types/product';

export interface ProductImagesProps {
  /** Product data */
  product: ProductWithEvents;

  /** Whether to show QR code display */
  showQRCode?: boolean;

  /** Whether to show placeholder when no images available */
  showPlaceholder?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Maximum number of images to display */
  maxImages?: number;

  /** Whether to enable mobile-optimized gallery */
  mobileOptimized?: boolean;

  /** Callback when image is clicked */
  onImageClick?: (imageUrl: string, index: number) => void;

  /** Callback when QR code is clicked */
  onQRCodeClick?: () => void;
}

/**
 * Enhanced product images and metadata display component
 */
export function ProductImages({
  product,
  showQRCode = true,
  showPlaceholder = true,
  className,
  maxImages = 6,
  mobileOptimized = true,
  onImageClick,
  onQRCodeClick,
}: ProductImagesProps) {
  const [selectedImageIndex, setSelectedImageIndex] = React.useState(0);
  const [imageLoadErrors, setImageLoadErrors] = React.useState<Set<number>>(
    new Set()
  );

  // Extract images from product metadata or use default placeholder
  const productImages = React.useMemo(() => {
    const images: string[] = [];

    // Check for images in metadata
    if (product.metadata?.images) {
      images.push(...product.metadata.images);
    }

    // Check for QR code
    if (showQRCode && product.qrCode) {
      // QR code will be handled separately
    }

    return images.slice(0, maxImages);
  }, [product.metadata?.images, maxImages, showQRCode, product.qrCode]);

  const handleImageError = React.useCallback((index: number) => {
    setImageLoadErrors(prev => new Set([...prev, index]));
  }, []);

  const handleImageClick = React.useCallback(
    (imageUrl: string, index: number) => {
      setSelectedImageIndex(index);
      onImageClick?.(imageUrl, index);
    },
    [onImageClick]
  );

  return (
    <div className={cn('space-y-6', className)}>
      {/* Main Image Gallery */}
      <div className='rounded-lg border border-gray-200 bg-white p-6 shadow-sm'>
        <div className='mb-4 flex items-center justify-between'>
          <h3 className='text-lg font-semibold text-gray-900'>
            Product Images
          </h3>
          <div className='flex items-center gap-2 text-sm text-gray-500'>
            <svg className='h-4 w-4' fill='currentColor' viewBox='0 0 20 20'>
              <path
                fillRule='evenodd'
                d='M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z'
                clipRule='evenodd'
              />
            </svg>
            <span>
              {productImages.length > 0
                ? `${productImages.length} image${productImages.length === 1 ? '' : 's'}`
                : 'No images available'}
            </span>
          </div>
        </div>

        {productImages.length > 0 ? (
          <div className={cn('space-y-4', mobileOptimized && 'sm:space-y-6')}>
            {/* Featured Image */}
            <div className='relative aspect-video w-full overflow-hidden rounded-lg bg-gray-100'>
              {!imageLoadErrors.has(selectedImageIndex) ? (
                <Image
                  src={productImages[selectedImageIndex]}
                  alt={`Product image ${selectedImageIndex + 1}`}
                  fill
                  sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
                  className='cursor-pointer object-cover transition-transform duration-300 hover:scale-105'
                  onError={() => handleImageError(selectedImageIndex)}
                  onClick={() =>
                    handleImageClick(
                      productImages[selectedImageIndex],
                      selectedImageIndex
                    )
                  }
                  priority={selectedImageIndex === 0}
                />
              ) : (
                <div className='flex h-full items-center justify-center text-gray-400'>
                  <div className='text-center'>
                    <svg
                      className='mx-auto h-12 w-12'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
                      />
                    </svg>
                    <p className='mt-2 text-sm'>Image failed to load</p>
                  </div>
                </div>
              )}

              {/* Image counter overlay */}
              {productImages.length > 1 && (
                <div className='absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-1 text-xs text-white'>
                  {selectedImageIndex + 1} of {productImages.length}
                </div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {productImages.length > 1 && (
              <div
                className={cn(
                  'flex gap-2 overflow-x-auto pb-2',
                  mobileOptimized && 'sm:gap-3'
                )}
              >
                {productImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={cn(
                      'flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200',
                      selectedImageIndex === index
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300',
                      mobileOptimized
                        ? 'h-16 w-16 sm:h-20 sm:w-20'
                        : 'h-20 w-20'
                    )}
                  >
                    {!imageLoadErrors.has(index) ? (
                      <Image
                        src={image}
                        alt={`Product thumbnail ${index + 1}`}
                        fill
                        sizes='80px'
                        className='object-cover'
                        onError={() => handleImageError(index)}
                      />
                    ) : (
                      <div className='flex h-full items-center justify-center bg-gray-100 text-gray-400'>
                        <svg
                          className='h-6 w-6'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                          aria-label='Image load error'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M6 18L18 6M6 6l12 12'
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : showPlaceholder ? (
          <div className='flex aspect-video w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500'>
            <svg
              className='h-16 w-16 text-gray-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={1.5}
                d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
              />
            </svg>
            <h4 className='mt-4 text-lg font-medium text-gray-900'>
              No Product Images Available
            </h4>
            <p className='mt-2 max-w-sm text-center text-sm'>
              Product images will be displayed here when available from the
              producer or supply chain participants.
            </p>
          </div>
        ) : null}
      </div>

      {/* QR Code Display Section */}
      {showQRCode && product.qrCode && (
        <div className='rounded-lg border border-gray-200 bg-white p-6 shadow-sm'>
          <div className='mb-4 flex items-center justify-between'>
            <h4 className='text-lg font-semibold text-gray-900'>
              Product QR Code
            </h4>
            <button
              onClick={onQRCodeClick}
              className='inline-flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500'
            >
              <svg
                className='h-4 w-4'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z'
                />
              </svg>
              Copy QR Code
            </button>
          </div>

          <div className='flex flex-col items-center gap-4 sm:flex-row'>
            <div className='flex-shrink-0'>
              {/* QR Code display - would need proper QRCodeResult object */}
              <div className='flex h-32 w-32 items-center justify-center rounded-lg border border-gray-200 bg-white p-2 shadow-sm'>
                <div className='text-center'>
                  <svg
                    className='mx-auto h-16 w-16 text-gray-400'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path d='M3 4a1 1 0 000 2h1.586l4.707 4.707a1 1 0 001.414 0L15.414 6H17a1 1 0 100-2H3z' />
                    <path d='M3 8a1 1 0 000 2h1.586l4.707 4.707a1 1 0 001.414 0L15.414 10H17a1 1 0 100-2H3z' />
                  </svg>
                  <p className='mt-2 text-xs text-gray-500'>QR Code</p>
                </div>
              </div>
            </div>
            <div className='flex-1 text-center sm:text-left'>
              <h5 className='font-medium text-gray-900'>
                Verification QR Code
              </h5>
              <p className='mt-1 text-sm text-gray-600'>
                Scan this QR code to quickly verify this product on any device.
                The code contains the product ID and verification link.
              </p>
              <div className='mt-3 rounded-md bg-gray-50 p-2'>
                <code className='break-all text-xs text-gray-700'>
                  {product.qrCode}
                </code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Additional Metadata Display */}
      {product.metadata && Object.keys(product.metadata).length > 0 && (
        <div className='rounded-lg border border-gray-200 bg-white p-6 shadow-sm'>
          <h4 className='mb-4 text-lg font-semibold text-gray-900'>
            Additional Product Information
          </h4>

          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            {Object.entries(product.metadata).map(([key, value]) => {
              // Skip images as they're handled above
              if (key === 'images') return null;

              return (
                <div key={key} className='rounded-lg bg-gray-50 p-3'>
                  <dt className='text-sm font-medium capitalize text-gray-500'>
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </dt>
                  <dd className='mt-1 text-sm text-gray-900'>
                    {typeof value === 'object'
                      ? JSON.stringify(value, null, 2)
                      : String(value)}
                  </dd>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Lightweight product image display for use in cards and summaries
 */
export function ProductImageThumbnail({
  product,
  size = 'md',
  className,
  onClick,
}: {
  product: ProductWithEvents;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}) {
  const [imageError, setImageError] = React.useState(false);

  const primaryImage = product.metadata?.images?.[0];

  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-16 w-16',
    lg: 'h-24 w-24',
  };

  if (!primaryImage || imageError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg bg-gray-100 text-gray-400',
          sizeClasses[size],
          onClick && 'cursor-pointer hover:bg-gray-200',
          className
        )}
        onClick={onClick}
      >
        <svg
          className='h-1/2 w-1/2'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
          aria-label={imageError ? 'Image load failed' : 'No image available'}
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg',
        sizeClasses[size],
        onClick && 'cursor-pointer transition-transform hover:scale-105',
        className
      )}
      onClick={onClick}
    >
      <Image
        src={primaryImage}
        alt={`${product.name} thumbnail`}
        fill
        sizes='96px'
        className='object-cover'
        onError={() => setImageError(true)}
      />
    </div>
  );
}
