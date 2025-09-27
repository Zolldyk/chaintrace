/**
 * HashPack Wallet Integration Service
 *
 * This service provides real HashPack wallet integration using HashConnect
 * protocol to retrieve actual wallet addresses and enable signing.
 *
 * @since 2.4.2
 */

'use client';

export interface HashPackConnectionResult {
  success: boolean;
  accountId?: string;
  error?: string;
}

/**
 * HashConnect instance management
 */
let globalHashConnect: any = null;

/**
 * Initialize HashConnect with proper error handling
 */
async function initializeHashConnect(): Promise<any> {
  if (globalHashConnect) {
    return globalHashConnect;
  }

  try {
    // Dynamic import with timeout
    const importPromise = import('hashconnect');
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('HashConnect import timeout')), 10000)
    );

    const { HashConnect } = (await Promise.race([
      importPromise,
      timeoutPromise,
    ])) as any;

    // Import Hedera SDK
    const { LedgerId } = await import('@hashgraph/sdk');

    const appMetadata = {
      name: 'ChainTrace',
      description: 'Supply Chain Verification Platform',
      icons: ['https://chaintrace.netlify.app/icon-192.png'],
      url: 'https://chaintrace.netlify.app',
    };

    const ledgerId = LedgerId.TESTNET;
    const projectId =
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
      'f1d96f692d709d35c43f9b1d63987ac8';

    globalHashConnect = new HashConnect(
      ledgerId,
      projectId,
      appMetadata,
      true // Debug mode
    );

    // Initialize with timeout
    const initPromise = globalHashConnect.init();
    const initTimeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('HashConnect init timeout')), 15000)
    );

    await Promise.race([initPromise, initTimeoutPromise]);

    console.log('HashConnect initialized successfully');
    return globalHashConnect;
  } catch (error) {
    console.error('Failed to initialize HashConnect:', error);
    globalHashConnect = null;
    throw error;
  }
}

/**
 * Debug function to log localStorage contents for HashPack debugging
 */
function debugLocalStorage(): void {
  if (typeof window === 'undefined') return;

  console.log('=== HashPack Debug: localStorage contents ===');
  const allKeys = Object.keys(localStorage);

  allKeys.forEach(key => {
    const value = localStorage.getItem(key);
    if (
      value &&
      (key.toLowerCase().includes('hashpack') ||
        key.toLowerCase().includes('hashconnect') ||
        key.toLowerCase().includes('walletconnect') ||
        value.includes('0.0.') ||
        key.toLowerCase().includes('wc@2'))
    ) {
      console.log(`Key: ${key}`);
      console.log(`Value:`, value);
      console.log('---');
    }
  });

  // Check window objects
  console.log('=== HashPack Debug: window objects ===');
  console.log('window.hashpack:', (window as any).hashpack);
  console.log('window.hashConnect:', (window as any).hashConnect);
  console.log('=======================================');
}

/**
 * Check if HashPack is available and connected
 */
export async function checkHashPackConnection(): Promise<HashPackConnectionResult> {
  try {
    if (typeof window === 'undefined') {
      return { success: false, error: 'Not available in server environment' };
    }

    // Enable debugging in development and when needed for troubleshooting
    const enableDebug =
      process.env.NODE_ENV === 'development' ||
      (typeof window !== 'undefined' &&
        window.location.hostname.includes('netlify'));

    if (enableDebug) {
      debugLocalStorage();
    }

    // Method 1: Check if HashPack extension is installed and has pairing data
    const hashpack = (window as any).hashpack;
    if (
      hashpack &&
      hashpack.pairingData &&
      hashpack.pairingData.accountIds?.length > 0
    ) {
      return {
        success: true,
        accountId: hashpack.pairingData.accountIds[0],
      };
    }

    // Method 2: Check localStorage for HashConnect session data
    const hashConnectKeys = [
      'hashconnect-data',
      'hashconnect:pairingData',
      'hashConnect:pairingData',
      'hashconnect_pairingData',
    ];

    for (const key of hashConnectKeys) {
      const sessionData = localStorage.getItem(key);
      if (sessionData) {
        try {
          const data = JSON.parse(sessionData);

          // Check various possible structures
          if (data.accountIds && data.accountIds.length > 0) {
            return {
              success: true,
              accountId: data.accountIds[0],
            };
          }

          if (data.sessions) {
            // HashConnect v3 structure
            const sessions = Object.values(data.sessions) as any[];
            for (const session of sessions) {
              if (session.accountIds && session.accountIds.length > 0) {
                return {
                  success: true,
                  accountId: session.accountIds[0],
                };
              }
            }
          }
        } catch (e) {
          console.debug(`Failed to parse session data for key ${key}:`, e);
        }
      }
    }

    // Method 3: Check for HashConnect instance in window
    const hashConnect = (window as any).hashConnect;
    if (
      hashConnect &&
      hashConnect.pairingData &&
      hashConnect.pairingData.accountIds?.length > 0
    ) {
      return {
        success: true,
        accountId: hashConnect.pairingData.accountIds[0],
      };
    }

    // Method 4: Check for WalletConnect-style storage and any key containing account IDs
    const allKeys = Object.keys(localStorage);

    // Look for any storage that might contain Hedera account IDs
    for (const key of allKeys) {
      if (
        key.includes('walletconnect') ||
        key.includes('wc@2') ||
        key.includes('hashpack')
      ) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');

          // Check accounts array
          if (data.accounts && data.accounts.length > 0) {
            const hederaAccount = data.accounts.find((acc: string) =>
              acc.includes('hedera:')
            );
            if (hederaAccount) {
              const accountId = hederaAccount.split(':').pop();
              if (accountId) {
                return {
                  success: true,
                  accountId: accountId,
                };
              }
            }
          }

          // Check for direct account ID patterns
          if (typeof data === 'string' && data.match(/0\.0\.\d+/)) {
            return {
              success: true,
              accountId: data,
            };
          }

          // Recursively search for account IDs in nested objects
          const findAccountId = (obj: any): string | null => {
            if (typeof obj === 'string' && obj.match(/^0\.0\.\d+$/)) {
              return obj;
            }
            if (typeof obj === 'object' && obj !== null) {
              for (const [k, v] of Object.entries(obj)) {
                if (
                  k.toLowerCase().includes('account') &&
                  typeof v === 'string' &&
                  v.match(/^0\.0\.\d+$/)
                ) {
                  return v;
                }
                const result = findAccountId(v);
                if (result) return result;
              }
            }
            return null;
          };

          const foundAccountId = findAccountId(data);
          if (foundAccountId) {
            return {
              success: true,
              accountId: foundAccountId,
            };
          }
        } catch (e) {
          console.debug(`Failed to parse data for key ${key}:`, e);
        }
      }
    }

    // Method 5: Check for ChainTrace HashConnect session data
    const sessionData = localStorage.getItem('chaintrace_hashconnect_session');
    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        if (parsed.accountId && parsed.accountId.match(/^0\.0\.\d+$/)) {
          return {
            success: true,
            accountId: parsed.accountId,
          };
        }
      } catch (e) {
        console.debug('Failed to parse ChainTrace session data:', e);
      }
    }

    // Method 6: Check for any storage containing Hedera account patterns
    for (const key of allKeys) {
      try {
        const value = localStorage.getItem(key);
        if (value && value.includes('0.0.') && value.match(/0\.0\.\d+/)) {
          // Try to extract account ID from any storage
          const matches = value.match(/0\.0\.\d+/g);
          if (matches && matches.length > 0) {
            return {
              success: true,
              accountId: matches[0],
            };
          }
        }
      } catch (e) {
        console.debug(`Failed to check key ${key}:`, e);
      }
    }

    return { success: false, error: 'HashPack not connected' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Attempt to connect to HashPack using proper HashConnect pairing
 */
export async function connectHashPack(): Promise<HashPackConnectionResult> {
  try {
    // First check if already connected
    const existing = await checkHashPackConnection();
    if (existing.success) {
      return existing;
    }

    console.log('Initializing HashConnect for HashPack pairing...');

    // Use proper HashConnect initialization and pairing
    const hashConnect = await initializeHashConnect();

    // Get pairing string
    const pairingString = hashConnect.pairingString;
    if (!pairingString) {
      throw new Error('Failed to generate pairing string');
    }

    console.log('Generated HashConnect pairing string, opening HashPack...');

    // Open HashPack for pairing with proper URL
    const hashPackUrl = `https://wallet.hashpack.app/pairing?data=${encodeURIComponent(pairingString)}`;
    const hashPackWindow = window.open(hashPackUrl, '_blank');

    // Return a promise that resolves when connected
    return new Promise(resolve => {
      const timeout = setTimeout(() => {
        console.warn('HashConnect pairing timeout');
        resolve({
          success: false,
          error:
            'Connection timeout. Please ensure you approve the connection in HashPack.',
        });
      }, 90000); // 90 second timeout

      // Listen for successful pairing
      const handlePairing = (sessionData: any) => {
        console.log('HashConnect pairing successful:', sessionData);
        clearTimeout(timeout);

        if (sessionData.accountIds && sessionData.accountIds.length > 0) {
          const accountId = sessionData.accountIds[0];

          // Store session data for future use
          try {
            localStorage.setItem(
              'chaintrace_hashconnect_session',
              JSON.stringify({
                accountId,
                topic: sessionData.topic,
                pairingData: sessionData,
                connectedAt: Date.now(),
              })
            );
          } catch (e) {
            console.warn('Failed to store session data:', e);
          }

          resolve({
            success: true,
            accountId: accountId,
          });
        } else {
          resolve({
            success: false,
            error: 'No accounts found in HashPack wallet',
          });
        }
      };

      // Listen for connection events
      const handleConnectionChange = (status: string) => {
        console.log('HashConnect connection status:', status);
        if (status === 'Disconnected') {
          clearTimeout(timeout);
          resolve({
            success: false,
            error: 'Connection was cancelled or failed',
          });
        }
      };

      // Set up event listeners
      hashConnect.pairingEvent.once(handlePairing);
      hashConnect.connectionStatusChangeEvent.on(handleConnectionChange);

      // Clean up if window is closed
      if (hashPackWindow) {
        const checkClosed = setInterval(() => {
          if (hashPackWindow.closed) {
            clearInterval(checkClosed);
            clearTimeout(timeout);
            // Don't auto-resolve as user might still complete pairing
            console.log(
              'HashPack window closed, but pairing may still be in progress...'
            );
          }
        }, 1000);
      }
    });
  } catch (error) {
    console.error('HashConnect initialization failed:', error);

    // Fallback: Open HashPack directly for manual connection
    console.log('Opening HashPack for manual connection...');
    window.open('https://wallet.hashpack.app/', '_blank');

    return {
      success: false,
      error:
        'HashConnect failed to load. Please connect manually in HashPack and refresh this page.',
    };
  }
}

/**
 * Get HashPack account information
 */
export async function getHashPackAccountInfo(): Promise<{
  accountId: string;
} | null> {
  const connection = await checkHashPackConnection();

  if (connection.success && connection.accountId) {
    return { accountId: connection.accountId };
  }

  return null;
}
