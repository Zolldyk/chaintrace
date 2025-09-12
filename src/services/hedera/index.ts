/**
 * Hedera Services
 *
 * Exports all Hedera blockchain integration services including main service,
 * HCS, HTS, Mirror Node, and Compliance Engine integrations.
 *
 * @since 1.0.0
 */

export {
  HederaService,
  getHederaService,
  resetHederaService,
  type ConnectionResult,
  type ServiceHealth,
  type HederaServiceOptions,
} from './HederaService';

// Export types and interfaces
export type { HederaConfig } from '@/config/hedera';

// Additional service exports
export { HCSService } from './HCSService';
export { HTSService } from './HTSService';
export { MirrorNodeService } from './MirrorNodeService';

// Story 2.3: Enhanced HCS Event Logging
export {
  HCSEventLogger,
  HCSRetryManager,
  getHCSEventLogger,
  type EventLoggingRequest,
} from './HCSEventLogger';
export {
  HCSFailureHandler,
  hcsFailureHandler,
  type FailedHCSOperation,
  type FailureStatistics,
} from './HCSFailureHandler';
export {
  HCSMirrorNodeService,
  hcsMirrorNodeService,
  type EventRetrievalResult,
  type IntegrityValidationResult,
  type MirrorNodeMessage,
} from './HCSMirrorNodeService';
export {
  ComplianceService,
  type ComplianceServiceConfig,
  type ComplianceValidationRequest,
  type ComplianceValidationResult,
  type ComplianceCredentialRequest,
  type ComplianceCredential,
  type SupplyChainValidationRequest,
  type SupplyChainValidationResult,
  type BusinessRuleTemplate,
  type ComplianceHealthResult,
} from './ComplianceService';
