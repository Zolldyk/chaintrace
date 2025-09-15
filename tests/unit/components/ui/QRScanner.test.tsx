/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QRScanner } from '@/components/ui/QRScanner';

// Mock the @zxing/browser library
jest.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: jest.fn().mockImplementation(() => ({
    decodeFromVideoDevice: jest.fn(),
  })),
}));

// Mock navigator.mediaDevices
const mockGetUserMedia = jest.fn();
const mockEnumerateDevices = jest.fn();

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: mockGetUserMedia,
    enumerateDevices: mockEnumerateDevices,
  },
});

describe('QRScanner', () => {
  const mockOnScan = jest.fn();
  const mockOnError = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }],
    });
    mockEnumerateDevices.mockResolvedValue([
      { kind: 'videoinput', deviceId: 'camera1' },
    ]);
  });

  it('renders loading state initially', () => {
    render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Requesting camera permission...')).toBeInTheDocument();
  });

  it('shows error when camera access is denied', async () => {
    mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));

    render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Camera Access Required')).toBeInTheDocument();
    });

    expect(mockOnError).toHaveBeenCalledWith('Permission denied');
  });

  it('calls onClose when close button is clicked', async () => {
    render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        onClose={mockOnClose}
      />
    );

    // Wait for either error state or successful camera access
    await waitFor(() => {
      const closeButtons = screen.getAllByRole('button');
      expect(closeButtons.length).toBeGreaterThan(0);
    });

    const user = userEvent.setup();
    const closeButton = screen.getAllByRole('button')[0];
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('renders with custom className', () => {
    const { container } = render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        onClose={mockOnClose}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders try again button in error state', async () => {
    mockGetUserMedia.mockRejectedValue(new Error('Camera not found'));

    render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });
});