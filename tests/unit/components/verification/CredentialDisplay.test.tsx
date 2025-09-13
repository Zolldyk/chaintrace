/**
 * Unit tests for CredentialDisplay component
 *
 * @since 1.0.0
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CredentialDisplay } from '@/components/verification/CredentialDisplay';
import type { ComplianceCredential } from '@/types/compliance';

// Mock dependencies
vi.mock('@/lib/credential-formatting', () => ({
  formatCredential: (credential: ComplianceCredential) => ({
    credential,
    display: {
      title: 'Supply Chain Compliance Certificate',
      description: `This certificate validates compliance with ${credential.metadata.complianceRules.length} compliance rules for product ${credential.productId}.`,
      status: { label: 'Active', color: 'green', icon: '✓' },
      type: {
        label: 'Supply Chain',
        description: 'Validates supply chain traceability',
        icon: '🔗',
      },
      verificationLevel: {
        label: 'Enhanced',
        description: 'Enhanced verification',
        badge: 'E',
      },
      issuer: {
        name: credential.issuer,
        displayName: 'ChainTrace',
        trusted: true,
      },
      timing: {
        issuedDate: new Date(credential.issuedAt).toLocaleDateString(),
        issuedRelative: '2 days ago',
        expirationDate: credential.expiresAt?.toLocaleDateString() || null,
        expirationRelative: credential.expiresAt ? '363 days' : null,
        daysUntilExpiration: credential.expiresAt ? 363 : null,
        warningLevel: 'none' as const,
      },
      complianceRules: credential.metadata.complianceRules.map(rule => ({
        rule,
        displayName: rule
          .replace(/_/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase()),
        description: `Compliance validation for ${rule.replace(/_/g, ' ')}`,
      })),
    },
  }),
  generateCredentialQRData: (credential: ComplianceCredential) =>
    JSON.stringify({
      type: 'credential_verification',
      credentialId: credential.id,
      productId: credential.productId,
    }),
}));

describe('CredentialDisplay', () => {
  let mockCredential: ComplianceCredential;
  let mockOnVerify: ReturnType<typeof vi.fn>;
  let mockOnQRCodeClick: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockCredential = {
      id: 'CRED-2024-001-ABC123',
      productId: 'CT-2024-001-ABC123',
      issuer: 'ChainTrace Compliance Engine',
      issuedAt: new Date('2024-09-11T10:00:00Z'),
      expiresAt: new Date('2025-09-11T10:00:00Z'),
      status: 'active',
      credentialType: 'supply_chain',
      metadata: {
        validationDetails: { score: 95, compliant: true },
        complianceRules: ['organic_certification', 'fair_trade'],
        verificationLevel: 'enhanced',
        validatedAt: new Date('2024-09-11T10:00:00Z'),
      },
      signature: 'test-signature-hash',
      hcsMessageId: '0.0.7777777-1234567890',
    };

    mockOnVerify = vi.fn();
    mockOnQRCodeClick = vi.fn();
  });

  describe('Full Display Mode', () => {
    test('should render credential information correctly', () => {
      render(
        <CredentialDisplay
          credential={mockCredential}
          onVerify={mockOnVerify}
          onQRCodeClick={mockOnQRCodeClick}
        />
      );

      // Check header information
      expect(
        screen.getByText('Supply Chain Compliance Certificate')
      ).toBeInTheDocument();
      expect(screen.getByText('CRED-2024-001-ABC123')).toBeInTheDocument();

      // Check key information
      expect(screen.getByText('CT-2024-001-ABC123')).toBeInTheDocument();
      expect(screen.getByText('Enhanced')).toBeInTheDocument();
      expect(screen.getByText('ChainTrace')).toBeInTheDocument();
    });

    test('should display compliance rules', () => {
      render(
        <CredentialDisplay credential={mockCredential} showDetails={true} />
      );

      expect(screen.getByText('Compliance Rules')).toBeInTheDocument();
      expect(screen.getByText('Organic Certification')).toBeInTheDocument();
      expect(screen.getByText('Fair Trade')).toBeInTheDocument();
    });

    test('should handle verify button click', () => {
      render(
        <CredentialDisplay
          credential={mockCredential}
          onVerify={mockOnVerify}
        />
      );

      const verifyButton = screen.getByText('Verify Credential');
      fireEvent.click(verifyButton);

      expect(mockOnVerify).toHaveBeenCalledWith(mockCredential);
    });

    test('should toggle QR code display', async () => {
      render(
        <CredentialDisplay
          credential={mockCredential}
          onQRCodeClick={mockOnQRCodeClick}
        />
      );

      const qrButton = screen.getByText('Show QR Code');
      fireEvent.click(qrButton);

      await waitFor(() => {
        expect(screen.getByText('Verification QR Code')).toBeInTheDocument();
      });

      const hideQrButton = screen.getByText('Hide QR Code');
      fireEvent.click(hideQrButton);

      await waitFor(() => {
        expect(
          screen.queryByText('Verification QR Code')
        ).not.toBeInTheDocument();
      });
    });

    test('should show expiration warning for expired credentials', () => {
      const expiredCredential = {
        ...mockCredential,
        status: 'expired' as const,
        expiresAt: new Date('2024-09-01T10:00:00Z'), // Past date
      };

      // Mock formatCredential to return critical warning level
      vi.mocked(
        require('@/lib/credential-formatting').formatCredential
      ).mockReturnValueOnce({
        credential: expiredCredential,
        display: {
          title: 'Supply Chain Compliance Certificate',
          description: 'Test description',
          status: { label: 'Expired', color: 'red', icon: '⏰' },
          type: { label: 'Supply Chain', description: 'Test', icon: '🔗' },
          verificationLevel: {
            label: 'Enhanced',
            description: 'Test',
            badge: 'E',
          },
          issuer: { name: 'Test', displayName: 'Test', trusted: true },
          timing: {
            issuedDate: '9/11/2024',
            issuedRelative: '2 days ago',
            expirationDate: '9/1/2024',
            expirationRelative: '12 days ago',
            daysUntilExpiration: -12,
            warningLevel: 'critical' as const,
          },
          complianceRules: [],
        },
      });

      render(<CredentialDisplay credential={expiredCredential} />);

      expect(screen.getByText('Credential Expired')).toBeInTheDocument();
      expect(
        screen.getByText(/This credential has expired and is no longer valid/)
      ).toBeInTheDocument();
    });
  });

  describe('Compact Display Mode', () => {
    test('should render compact layout', () => {
      render(<CredentialDisplay credential={mockCredential} compact={true} />);

      // Should show minimal information
      expect(
        screen.getByText('Supply Chain Compliance Certificate')
      ).toBeInTheDocument();
      expect(screen.getByText('CRED-2024-001-ABC123')).toBeInTheDocument();

      // Should not show detailed information
      expect(screen.queryByText('Compliance Rules')).not.toBeInTheDocument();
      expect(screen.queryByText('Verify Credential')).not.toBeInTheDocument();
    });
  });

  describe('Configuration Options', () => {
    test('should hide actions when showActions is false', () => {
      render(
        <CredentialDisplay credential={mockCredential} showActions={false} />
      );

      expect(screen.queryByText('Verify Credential')).not.toBeInTheDocument();
      expect(screen.queryByText('Show QR Code')).not.toBeInTheDocument();
    });

    test('should hide details when showDetails is false', () => {
      render(
        <CredentialDisplay credential={mockCredential} showDetails={false} />
      );

      expect(screen.queryByText('Compliance Rules')).not.toBeInTheDocument();
    });

    test('should show QR code by default when showQRCode is true', () => {
      render(
        <CredentialDisplay credential={mockCredential} showQRCode={true} />
      );

      expect(screen.getByText('Verification QR Code')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      render(<CredentialDisplay credential={mockCredential} />);

      // Check for accessible button labels
      const verifyButton = screen.getByRole('button', {
        name: /verify credential/i,
      });
      expect(verifyButton).toBeInTheDocument();

      const qrButton = screen.getByRole('button', { name: /show qr code/i });
      expect(qrButton).toBeInTheDocument();
    });

    test('should support keyboard navigation', () => {
      render(<CredentialDisplay credential={mockCredential} />);

      const verifyButton = screen.getByText('Verify Credential');

      // Focus the button
      verifyButton.focus();
      expect(verifyButton).toHaveFocus();

      // Press Enter
      fireEvent.keyDown(verifyButton, { key: 'Enter', code: 'Enter' });
      fireEvent.click(verifyButton);

      expect(mockOnVerify).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('should handle credential without expiration date', () => {
      const neverExpiresCredential = {
        ...mockCredential,
        expiresAt: null,
      };

      render(<CredentialDisplay credential={neverExpiresCredential} />);

      // Should not show expiration information
      expect(screen.queryByText(/Expires/)).not.toBeInTheDocument();
    });

    test('should handle credential with empty compliance rules', () => {
      const noRulesCredential = {
        ...mockCredential,
        metadata: {
          ...mockCredential.metadata,
          complianceRules: [],
        },
      };

      // Mock formatCredential for empty rules
      vi.mocked(
        require('@/lib/credential-formatting').formatCredential
      ).mockReturnValueOnce({
        credential: noRulesCredential,
        display: {
          title: 'Supply Chain Compliance Certificate',
          description: 'Test description',
          status: { label: 'Active', color: 'green', icon: '✓' },
          type: { label: 'Supply Chain', description: 'Test', icon: '🔗' },
          verificationLevel: {
            label: 'Enhanced',
            description: 'Test',
            badge: 'E',
          },
          issuer: { name: 'Test', displayName: 'Test', trusted: true },
          timing: {
            issuedDate: '9/11/2024',
            issuedRelative: '2 days ago',
            expirationDate: null,
            expirationRelative: null,
            daysUntilExpiration: null,
            warningLevel: 'none' as const,
          },
          complianceRules: [],
        },
      });

      render(
        <CredentialDisplay credential={noRulesCredential} showDetails={true} />
      );

      // Should not show compliance rules section
      expect(screen.queryByText('Compliance Rules')).not.toBeInTheDocument();
    });

    test('should handle very long credential IDs', () => {
      const longIdCredential = {
        ...mockCredential,
        id: 'CRED-2024-001-VERYLONGCREDENTIALIDENTIFIERTHATMIGHTBREAKTHELAYOUT',
      };

      render(<CredentialDisplay credential={longIdCredential} />);

      expect(
        screen.getByText(
          'CRED-2024-001-VERYLONGCREDENTIALIDENTIFIERTHATMIGHTBREAKTHELAYOUT'
        )
      ).toBeInTheDocument();
    });
  });
});
