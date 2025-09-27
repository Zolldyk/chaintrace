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

    // Check if HashPack extension is installed
    const hashpack = (window as any).hashpack;

    if (
      hashpack &&
      hashpack.pairingData &&
      hashpack.pairingData.accountIds?.length > 0
    ) {
      // HashPack is connected
      return {
        success: true,
        accountId: hashpack.pairingData.accountIds[0],
      };
    }

    // Check localStorage for existing HashConnect session
    const existingSession = localStorage.getItem('hashconnect-data');
    if (existingSession) {
      try {
        const sessionData = JSON.parse(existingSession);
        if (sessionData.accountIds && sessionData.accountIds.length > 0) {
          return {
            success: true,
            accountId: sessionData.accountIds[0],
          };
        }
      } catch (e) {
        console.debug('Failed to parse HashConnect session data:', e);
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
      console.warn('HashConnect import failed:', hashConnectError);

      // Fallback: Open HashPack directly
      window.open('https://wallet.hashpack.app/', '_blank');

      return {
        success: false,
        error:
          'Please connect your HashPack wallet in the opened tab, then refresh this page and try again.',
      };
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
