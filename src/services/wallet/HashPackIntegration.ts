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
 * Check if HashPack is available and connected
 */
export async function checkHashPackConnection(): Promise<HashPackConnectionResult> {
  try {
    if (typeof window === 'undefined') {
      return { success: false, error: 'Not available in server environment' };
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

    // Method 4: Check for WalletConnect-style storage
    const walletConnectKeys = Object.keys(localStorage).filter(
      key =>
        key.includes('walletconnect') ||
        key.includes('wc@2') ||
        key.includes('hashpack')
    );

    for (const key of walletConnectKeys) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        if (data.accounts && data.accounts.length > 0) {
          // Extract Hedera account from accounts array
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
      } catch (e) {
        console.debug(`Failed to parse WalletConnect data for key ${key}:`, e);
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
      const { HashConnect } = await import('hashconnect');
      const { LedgerId } = await import('@hashgraph/sdk');

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
        const maxPolls = 120; // 2 minutes of polling (1 second intervals)

        const pollForConnection = async () => {
          pollCount++;

          // Check for connection
          const connection = await checkHashPackConnection();
          if (connection.success) {
            resolve(connection);
            return;
          }

          // Check if we've reached max polling attempts
          if (pollCount >= maxPolls) {
            resolve({
              success: false,
              error:
                'Connection timeout. Please ensure you completed the connection in HashPack and try again.',
            });
            return;
          }

          // Continue polling
          setTimeout(pollForConnection, 1000);
        };

        // Start polling after a brief delay
        setTimeout(pollForConnection, 2000);
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
