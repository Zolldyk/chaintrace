/**
 * Wallet Services
 *
 * Exports all wallet integration services including main service,
 * wallet connectors, and related types and interfaces.
 *
 * @since 1.0.0
 */

export {
  WalletService,
  getWalletService,
  resetWalletService,
  type WalletType,
  type WalletStatus,
  type WalletConnectionResult,
  type AuthChallenge,
  type SignatureResult,
  type WalletConfig,
  type WalletConnector,
} from './WalletService';

export { SnapConnector } from './SnapConnector';
export { HashPackConnector } from './HashPackConnector';
