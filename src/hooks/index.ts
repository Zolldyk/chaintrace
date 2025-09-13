/**
 * Custom React Hooks
 *
 * Exports all custom hooks used throughout the ChainTrace application
 * including error handling, state management, and service integrations.
 *
 * @since 1.0.0
 */

export {
  useErrorHandling,
  useNetworkErrorHandling,
  useWalletErrorHandling,
  useFormErrorHandling,
} from './useErrorHandling';

export {
  useWallet,
  type UseWalletResult,
  type UseWalletConfig,
} from './useWallet';
