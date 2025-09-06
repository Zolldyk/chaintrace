/**
 * Production-ready signature verification utilities for HCS message authenticity
 *
 * @since 1.4.0
 */

import { PublicKey, AccountId } from '@hashgraph/sdk';
import type { HCSMessage } from '../../types/hedera';
import { hcsSerializer } from './HCSMessageSerializer';

/**
 * Signature verification result
 */
export interface SignatureVerificationResult {
  /** Whether signature is valid */
  valid: boolean;

  /** Verification timestamp */
  verifiedAt: Date;

  /** Signer wallet address (if verified) */
  signerAddress?: string;

  /** Verification error message (if invalid) */
  error?: string;
}

/**
 * Signature verification configuration
 */
export interface VerificationConfig {
  /** Expected signer wallet address */
  expectedSigner?: string;

  /** Maximum age for signature validation (milliseconds) */
  maxAge?: number;

  /** Whether to allow expired signatures */
  allowExpired?: boolean;

  /** Public key for verification (if not derived from signer address) */
  publicKey?: PublicKey;
}

/**
 * Production signature verification utilities for ChainTrace HCS messages
 *
 * @class SignatureVerifier
 * @since 1.4.0
 *
 * @example
 * ```typescript
 * const verifier = new SignatureVerifier();
 *
 * // Verify HCS message signature
 * const result = await verifier.verifyHCSMessage(hcsMessage, {
 *   expectedSigner: '0.0.12345',
 *   publicKey: PublicKey.fromString('302a300506032b657003210000...')
 * });
 *
 * if (result.valid) {
 *   console.log('Signature is valid');
 * }
 * ```
 */
export class SignatureVerifier {
  /**
   * Verify HCS message signature using Hedera SDK
   */
  async verifyHCSMessage(
    message: HCSMessage,
    config: VerificationConfig = {}
  ): Promise<SignatureVerificationResult> {
    try {
      // Get the payload that was signed (message without signature)
      const signaturePayload = hcsSerializer.getSignaturePayload(message);

      // Verify the signature format (hex-encoded signature)
      if (!this.isValidSignatureFormat(message.signature)) {
        return {
          valid: false,
          verifiedAt: new Date(),
          error: 'Invalid signature format - must be hex-encoded',
        };
      }

      // Check message age if specified
      if (config.maxAge && !config.allowExpired) {
        const messageAge = Date.now() - new Date(message.timestamp).getTime();
        if (messageAge > config.maxAge) {
          return {
            valid: false,
            verifiedAt: new Date(),
            error: 'Message signature has expired',
          };
        }
      }

      // Get public key for verification
      let publicKey: PublicKey;
      if (config.publicKey) {
        publicKey = config.publicKey;
      } else if (config.expectedSigner) {
        // In production, you would need to retrieve the public key from the account
        // This requires querying the Mirror Node or Hedera network
        throw new Error(
          'Public key must be provided or retrieved from Hedera network'
        );
      } else {
        return {
          valid: false,
          verifiedAt: new Date(),
          error: 'Public key required for signature verification',
        };
      }

      // Verify signature using Hedera SDK
      const isValid = await this.verifyWithHederaSDK(
        signaturePayload,
        message.signature,
        publicKey
      );

      if (!isValid) {
        return {
          valid: false,
          verifiedAt: new Date(),
          error: 'Signature verification failed',
        };
      }

      return {
        valid: true,
        verifiedAt: new Date(),
        signerAddress: config.expectedSigner,
      };
    } catch (error) {
      return {
        valid: false,
        verifiedAt: new Date(),
        error:
          error instanceof Error ? error.message : 'Unknown verification error',
      };
    }
  }

  /**
   * Verify standalone signature against payload using Hedera SDK
   */
  async verifySignature(
    payload: string,
    signature: string,
    publicKey: PublicKey,
    expectedSigner?: string
  ): Promise<SignatureVerificationResult> {
    try {
      if (!this.isValidSignatureFormat(signature)) {
        return {
          valid: false,
          verifiedAt: new Date(),
          error: 'Invalid signature format',
        };
      }

      const isValid = await this.verifyWithHederaSDK(
        payload,
        signature,
        publicKey
      );

      if (!isValid) {
        return {
          valid: false,
          verifiedAt: new Date(),
          error: 'Signature verification failed',
        };
      }

      return {
        valid: true,
        verifiedAt: new Date(),
        signerAddress: expectedSigner,
      };
    } catch (error) {
      return {
        valid: false,
        verifiedAt: new Date(),
        error:
          error instanceof Error
            ? error.message
            : 'Signature verification failed',
      };
    }
  }

  /**
   * Retrieve public key from Hedera account using Mirror Node
   */
  async getPublicKeyFromAccount(accountId: string): Promise<PublicKey> {
    try {
      const accountIdObj = AccountId.fromString(accountId);

      // Query Mirror Node for account information
      const mirrorNodeUrl =
        process.env.NEXT_PUBLIC_HEDERA_MIRROR_NODE_URL ||
        'https://testnet.mirrornode.hedera.com';

      const response = await fetch(
        `${mirrorNodeUrl}/api/v1/accounts/${accountIdObj.toString()}`,
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch account info: ${response.statusText}`);
      }

      const accountData = await response.json();

      if (!accountData.key?.key) {
        throw new Error('No public key found for account');
      }

      // Parse the public key from the account data
      return PublicKey.fromString(accountData.key.key);
    } catch (error) {
      throw new Error(
        `Failed to retrieve public key for account ${accountId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Validate signature format (should be hex-encoded)
   */
  private isValidSignatureFormat(signature: string): boolean {
    // Signature should be hex-encoded string
    const hexRegex = /^[0-9a-fA-F]+$/;
    return hexRegex.test(signature) && signature.length >= 128; // Minimum expected length
  }

  /**
   * Verify signature using Hedera SDK crypto functions
   */
  private async verifyWithHederaSDK(
    payload: string,
    signature: string,
    publicKey: PublicKey
  ): Promise<boolean> {
    try {
      // Convert payload to bytes
      const payloadBytes = new TextEncoder().encode(payload);

      // Convert hex signature to bytes
      const signatureBytes = this.hexToBytes(signature);

      // Use Hedera SDK to verify the signature
      return publicKey.verify(payloadBytes, signatureBytes);
    } catch (error) {
      console.error('Hedera SDK signature verification error:', error);
      return false;
    }
  }

  /**
   * Convert hex string to byte array
   */
  private hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  }

  /**
   * Hash payload using SHA-256 for consistent signature verification
   */
  async hashPayload(payload: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hashBuffer);
  }
}

/**
 * Default signature verifier instance
 */
export const signatureVerifier = new SignatureVerifier();
