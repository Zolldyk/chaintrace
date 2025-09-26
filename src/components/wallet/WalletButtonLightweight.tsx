/**
 * Lightweight wallet button fallback for production stability
 *
 * This component provides a basic wallet connection interface without
 * heavy blockchain dependencies to prevent chunk loading errors.
 *
 * @since 2.4.1
 */

'use client';

import React, { useState } from 'react';

export interface WalletButtonProps {
  /** Custom CSS classes */
  className?: string;
}

/**
 * Lightweight wallet button component
 */
export function WalletButtonLightweight({ className = '' }: WalletButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleConnect = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      {/* Wallet Button */}
      <button
        onClick={handleConnect}
        className={`flex items-center space-x-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 ${className}`}
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
            d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
          />
        </svg>
        <span>Connect Wallet</span>
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
          <div className='mx-4 w-full max-w-md rounded-lg bg-white p-6'>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-lg font-semibold'>Wallet Connection</h2>
              <button
                onClick={closeModal}
                className='text-gray-400 hover:text-gray-600'
              >
                <svg
                  className='h-6 w-6'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              </button>
            </div>

            <div className='space-y-4'>
              <div className='rounded-md border border-amber-200 bg-amber-50 p-4'>
                <div className='flex'>
                  <div className='flex-shrink-0'>
                    <svg
                      className='h-5 w-5 text-amber-400'
                      viewBox='0 0 20 20'
                      fill='currentColor'
                    >
                      <path
                        fillRule='evenodd'
                        d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z'
                        clipRule='evenodd'
                      />
                    </svg>
                  </div>
                  <div className='ml-3'>
                    <h3 className='text-sm font-medium text-amber-800'>
                      Wallet Integration Under Maintenance
                    </h3>
                    <div className='mt-2 text-sm text-amber-700'>
                      <p>
                        We&apos;re currently optimizing the wallet connection
                        experience. The wallet functionality is temporarily
                        unavailable while we resolve some technical issues.
                      </p>
                      <p className='mt-2'>In the meantime, you can still:</p>
                      <ul className='mt-1 list-disc pl-5'>
                        <li>Verify products using the verification tool</li>
                        <li>View compliance dashboards</li>
                        <li>Access all public product information</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className='text-center'>
                <button
                  onClick={closeModal}
                  className='rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700'
                >
                  Continue to ChainTrace
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
