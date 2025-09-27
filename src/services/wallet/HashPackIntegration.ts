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

    // Method 5: Check for any storage containing Hedera account patterns
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
 * Attempt to connect to HashPack using HashConnect
 */
export async function connectHashPack(): Promise<HashPackConnectionResult> {
  try {
    // First check if already connected
    const existing = await checkHashPackConnection();
    if (existing.success) {
      return existing;
    }

    // Try to use HashConnect for new connection
    try {
      // Use dynamic import with better error handling
      const [{ HashConnect }, { LedgerId }] = await Promise.all([
        import('hashconnect').catch(() => ({ HashConnect: null })),
        import('@hashgraph/sdk').catch(() => ({ LedgerId: null })),
      ]);

      if (!HashConnect || !LedgerId) {
        throw new Error('Failed to load HashConnect dependencies');
      }

      const appMetadata = {
        name: 'ChainTrace',
        description: 'Supply Chain Verification Platform',
        icons: ['https://chaintrace.netlify.app/icon-192.png'],
        url: 'https://chaintrace.netlify.app',
      };

      const ledgerId = LedgerId.TESTNET; // Use testnet for development
      const projectId =
        process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
        'f1d96f692d709d35c43f9b1d63987ac8';

      const hashConnect = new HashConnect(
        ledgerId,
        projectId,
        appMetadata,
        true
      );

      // Initialize HashConnect
      await hashConnect.init();

      // Get pairing string
      const pairingString = hashConnect.pairingString;

      if (pairingString) {
        // Open HashPack for pairing
        const hashPackUrl = `https://wallet.hashpack.app/pairing?data=${encodeURIComponent(pairingString)}`;
        window.open(hashPackUrl, '_blank');

        // Return a promise that resolves when connected
        return new Promise(resolve => {
          const timeout = setTimeout(() => {
            resolve({
              success: false,
              error:
                'Connection timeout. Please try again and ensure you approve the connection in HashPack.',
            });
          }, 60000); // 60 second timeout

          // Listen for successful pairing
          hashConnect.pairingEvent.once((sessionData: any) => {
            clearTimeout(timeout);

            if (sessionData.accountIds && sessionData.accountIds.length > 0) {
              const accountId = sessionData.accountIds[0];

              // Store session data for future use
              localStorage.setItem(
                'hashconnect-data',
                JSON.stringify(sessionData)
              );

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
          });

          // Listen for connection status changes
          hashConnect.connectionStatusChangeEvent.on((status: string) => {
            if (status === 'Disconnected') {
              clearTimeout(timeout);
              resolve({
                success: false,
                error: 'Connection was cancelled or failed',
              });
            }
          });
        });
      } else {
        return {
          success: false,
          error: 'Failed to generate HashConnect pairing string',
        };
      }
    } catch (hashConnectError) {
      console.warn(
        'HashConnect import failed, using polling method:',
        hashConnectError
      );

      // Fallback: Open HashPack directly and poll for connection
      window.open('https://wallet.hashpack.app/', '_blank');

      // Use polling to detect when user completes connection
      return new Promise(resolve => {
        let pollCount = 0;
        const maxPolls = 180; // 3 minutes of polling (1 second intervals)

        const pollForConnection = async () => {
          pollCount++;

          // Check for connection with more verbose logging
          const connection = await checkHashPackConnection();
          if (connection.success) {
            console.log(
              'HashPack connection detected via polling:',
              connection.accountId
            );
            resolve(connection);
            return;
          }

          // Log polling progress every 10 attempts
          if (pollCount % 10 === 0) {
            console.log(
              `Polling for HashPack connection... (${pollCount}/${maxPolls})`
            );
          }

          // Check if we've reached max polling attempts
          if (pollCount >= maxPolls) {
            console.warn('HashPack connection polling timeout');
            resolve({
              success: false,
              error:
                'Connection timeout. Please ensure you completed the connection in HashPack and try again.',
            });
            return;
          }

          // Continue polling with shorter intervals initially
          const interval = pollCount < 30 ? 500 : 1000; // 0.5s for first 30 attempts, then 1s
          setTimeout(pollForConnection, interval);
        };

        // Start polling immediately
        setTimeout(pollForConnection, 1000);
      });
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to connect to HashPack',
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
