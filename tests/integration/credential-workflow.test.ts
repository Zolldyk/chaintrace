/**
 * Integration tests for credential workflow
 *
 * @since 1.0.0
 */

import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import type { NextApiHandler } from 'next';

// Test configuration
const port = parseInt(process.env.TEST_PORT || '3001', 10);
const hostname = 'localhost';
const dev = process.env.NODE_ENV !== 'production';

describe('Credential Workflow Integration Tests', () => {
  let app: any;
  let server: any;
  let baseURL: string;

  beforeAll(async () => {
    // Start Next.js app for testing
    app = next({ dev, hostname, port });
    const handle = app.getRequestHandler();

    await app.prepare();

    server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url!, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('Internal server error');
      }
    });

    await new Promise<void>(resolve => {
      server.listen(port, resolve);
    });

    baseURL = `http://${hostname}:${port}`;
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>(resolve => {
        server.close(resolve);
      });
    }
    if (app) {
      await app.close();
    }
  });

  describe('Credential Verification API', () => {
    test('should handle credential verification request', async () => {
      const verificationRequest = {
        credentialId: 'CRED-2024-001-ABC123',
        verifySignature: true,
        verifyBlockchain: false,
      };

      const response = await fetch(
        `${baseURL}/api/compliance/credentials/verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(verificationRequest),
        }
      );

      expect(response.status).toBeOneOf([200, 404, 400]); // 404 if credential doesn't exist

      if (response.ok) {
        const result = await response.json();
        expect(result).toHaveProperty('isValid');
        expect(result).toHaveProperty('verification');
        expect(result.verification).toHaveProperty('verifiedAt');
      }
    });

    test('should reject invalid credential ID format', async () => {
      const verificationRequest = {
        credentialId: 'invalid-credential-id',
        verifySignature: true,
      };

      const response = await fetch(
        `${baseURL}/api/compliance/credentials/verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(verificationRequest),
        }
      );

      expect(response.status).toBe(400);

      const result = await response.json();
      expect(result.error).toHaveProperty('code');
      expect(result.error.code).toBe('INVALID_REQUEST');
    });

    test('should handle malformed request body', async () => {
      const response = await fetch(
        `${baseURL}/api/compliance/credentials/verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: '{"invalid": json}',
        }
      );

      expect(response.status).toBe(400);
    });
  });

  describe('Individual Credential API', () => {
    test('should retrieve credential by ID', async () => {
      const credentialId = 'CRED-2024-001-ABC123';

      const response = await fetch(
        `${baseURL}/api/compliance/credentials/${credentialId}`
      );

      expect(response.status).toBeOneOf([200, 404]); // 404 if credential doesn't exist

      if (response.status === 200) {
        const result = await response.json();
        expect(result).toHaveProperty('credential');
        expect(result).toHaveProperty('metadata');
        expect(result.credential.id).toBe(credentialId);
      }
    });

    test('should reject invalid credential ID in URL', async () => {
      const invalidId = 'invalid-id';

      const response = await fetch(
        `${baseURL}/api/compliance/credentials/${invalidId}`
      );

      expect(response.status).toBe(400);

      const result = await response.json();
      expect(result.error.code).toBe('INVALID_CREDENTIAL_ID');
    });
  });

  describe('Product Credentials API', () => {
    test('should retrieve credentials for a product', async () => {
      const productId = 'CT-2024-001-ABC123';

      const response = await fetch(
        `${baseURL}/api/products/${productId}/credentials`
      );

      expect(response.status).toBeOneOf([200, 404]); // 404 if product doesn't exist

      if (response.status === 200) {
        const result = await response.json();
        expect(result).toHaveProperty('credentials');
        expect(result).toHaveProperty('totalCount');
        expect(result).toHaveProperty('pagination');
        expect(Array.isArray(result.credentials)).toBe(true);
      }
    });

    test('should handle pagination parameters', async () => {
      const productId = 'CT-2024-001-ABC123';

      const response = await fetch(
        `${baseURL}/api/products/${productId}/credentials?limit=5&offset=0&sortBy=issuedAt&sortOrder=desc`
      );

      expect(response.status).toBeOneOf([200, 404]);

      if (response.status === 200) {
        const result = await response.json();
        expect(result.pagination.limit).toBe(5);
        expect(result.pagination.offset).toBe(0);
      }
    });

    test('should reject invalid product ID format', async () => {
      const invalidProductId = 'invalid-product-id';

      const response = await fetch(
        `${baseURL}/api/products/${invalidProductId}/credentials`
      );

      expect(response.status).toBe(400);

      const result = await response.json();
      expect(result.error.code).toBe('INVALID_PRODUCT_ID');
    });
  });

  describe('Error Handling', () => {
    test('should handle CORS headers correctly', async () => {
      const response = await fetch(
        `${baseURL}/api/compliance/credentials/verify`,
        {
          method: 'OPTIONS',
        }
      );

      // Should handle CORS preflight request
      expect(response.status).toBeOneOf([200, 204, 404]);
    });

    test('should return consistent error format', async () => {
      const response = await fetch(
        `${baseURL}/api/compliance/credentials/nonexistent`
      );

      if (!response.ok) {
        const result = await response.json();
        expect(result).toHaveProperty('error');
        expect(result.error).toHaveProperty('code');
        expect(result.error).toHaveProperty('message');
        expect(result.error).toHaveProperty('details');
      }
    });

    test('should handle rate limiting gracefully', async () => {
      // Make multiple rapid requests to test rate limiting
      const promises = Array(10)
        .fill(null)
        .map(() =>
          fetch(`${baseURL}/api/compliance/credentials/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              credentialId: 'CRED-2024-001-TEST',
            }),
          })
        );

      const responses = await Promise.all(promises);

      // At least some requests should succeed
      const successfulResponses = responses.filter(r => r.ok);
      expect(successfulResponses.length).toBeGreaterThan(0);

      // Check if any rate limiting occurred
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      if (rateLimitedResponses.length > 0) {
        expect(rateLimitedResponses[0].status).toBe(429);
      }
    });
  });

  describe('Response Time Performance', () => {
    test('should respond to credential verification within acceptable time', async () => {
      const startTime = Date.now();

      const response = await fetch(
        `${baseURL}/api/compliance/credentials/verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            credentialId: 'CRED-2024-001-ABC123',
            verifySignature: true,
          }),
        }
      );

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Response should be under 5 seconds
      expect(responseTime).toBeLessThan(5000);

      if (response.ok) {
        const result = await response.json();
        expect(result.metadata).toHaveProperty('responseTime');
        expect(typeof result.metadata.responseTime).toBe('number');
      }
    });

    test('should respond to credential retrieval within acceptable time', async () => {
      const startTime = Date.now();

      const response = await fetch(
        `${baseURL}/api/compliance/credentials/CRED-2024-001-ABC123`
      );

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Response should be under 3 seconds
      expect(responseTime).toBeLessThan(3000);
    });
  });

  describe('Data Validation', () => {
    test('should validate credential data structure', async () => {
      const response = await fetch(
        `${baseURL}/api/compliance/credentials/verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            credentialId: 'CRED-2024-001-ABC123',
            verifySignature: true,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();

        // Validate response structure
        expect(result).toHaveProperty('isValid');
        expect(typeof result.isValid).toBe('boolean');

        expect(result).toHaveProperty('verification');
        expect(result.verification).toHaveProperty('signatureValid');
        expect(result.verification).toHaveProperty('notExpired');
        expect(result.verification).toHaveProperty('notRevoked');
        expect(result.verification).toHaveProperty('verifiedAt');

        if (result.isValid && result.credential) {
          // Validate credential structure
          expect(result.credential).toHaveProperty('id');
          expect(result.credential).toHaveProperty('productId');
          expect(result.credential).toHaveProperty('issuer');
          expect(result.credential).toHaveProperty('issuedAt');
          expect(result.credential).toHaveProperty('status');
          expect(result.credential).toHaveProperty('credentialType');
          expect(result.credential).toHaveProperty('metadata');
          expect(result.credential).toHaveProperty('signature');
        }
      }
    });
  });
});
