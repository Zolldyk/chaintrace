/**
 * Server-only crypto utilities wrapper
 * This file should only be imported on the server side
 */

import { createHash, randomBytes } from 'crypto';

export const serverCrypto = {
  createHash,
  randomBytes,
};

// Re-export for compatibility
export { createHash, randomBytes };
