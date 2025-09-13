/**
 * Credential validation service for compliance credential verification
 *
 * @since 1.0.0
 */

import type {
  ComplianceCredential,
  CredentialExpirationInfo,
} from '../../types/compliance';
import {
  isCredentialExpired,
  getDaysUntilExpiration,
  getCredentialWarningLevel,
} from '../../lib/credential-validations';
import { logger } from '@/lib/logger';

/**
 * Validation rule interface for custom validation logic
 */
export interface ValidationRule {
  /** Rule identifier */
  id: string;

  /** Rule name */
  name: string;

  /** Rule description */
  description: string;

  /** Validation function */
  validate: (credential: ComplianceCredential) => Promise<boolean>;

  /** Error message if validation fails */
  errorMessage: string;

  /** Whether this rule is required for credential validity */
  required: boolean;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;

  /** List of passed rules */
  passedRules: string[];

  /** List of failed rules */
  failedRules: string[];

  /** Validation errors */
  errors: string[];

  /** Validation warnings */
  warnings: string[];

  /** Overall validation score (0-100) */
  score: number;
}

/**
 * Credential validator service
 *
 * @class CredentialValidator
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * const validator = new CredentialValidator();
 *
 * // Add custom validation rule
 * validator.addValidationRule({
 *   id: 'organic_certification',
 *   name: 'Organic Certification Check',
 *   description: 'Validates organic certification requirements',
 *   validate: async (credential) => {
 *     return credential.metadata.complianceRules.includes('organic');
 *   },
 *   errorMessage: 'Missing organic certification',
 *   required: true
 * });
 *
 * // Validate credential
 * const result = await validator.validateCredential(credential);
 * ```
 */
export class CredentialValidator {
  private validationRules = new Map<string, ValidationRule>();

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Add a custom validation rule
   *
   * @param rule - Validation rule to add
   */
  addValidationRule(rule: ValidationRule): void {
    this.validationRules.set(rule.id, rule);
    logger.debug('Added validation rule', { ruleId: rule.id, name: rule.name });
  }

  /**
   * Remove a validation rule
   *
   * @param ruleId - ID of the rule to remove
   */
  removeValidationRule(ruleId: string): void {
    this.validationRules.delete(ruleId);
    logger.debug('Removed validation rule', { ruleId });
  }

  /**
   * Validate a credential against all rules
   *
   * @param credential - Credential to validate
   * @returns Promise resolving to validation result
   */
  async validateCredential(
    credential: ComplianceCredential
  ): Promise<ValidationResult> {
    const passedRules: string[] = [];
    const failedRules: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    logger.debug('Starting credential validation', {
      credentialId: credential.id,
    });

    // Run all validation rules
    for (const [ruleId, rule] of this.validationRules.entries()) {
      try {
        const passed = await rule.validate(credential);
        if (passed) {
          passedRules.push(ruleId);
        } else {
          failedRules.push(ruleId);
          if (rule.required) {
            errors.push(rule.errorMessage);
          } else {
            warnings.push(rule.errorMessage);
          }
        }
      } catch (error) {
        failedRules.push(ruleId);
        const errorMessage = `Rule ${ruleId} validation failed: ${error}`;
        if (rule.required) {
          errors.push(errorMessage);
        } else {
          warnings.push(errorMessage);
        }
        logger.error(
          'Validation rule execution failed',
          error instanceof Error ? error : new Error(String(error)),
          { ruleId }
        );
      }
    }

    // Calculate validation score
    const totalRules = this.validationRules.size;
    const passedRequiredRules = passedRules.filter(
      ruleId => this.validationRules.get(ruleId)?.required
    ).length;
    const totalRequiredRules = Array.from(this.validationRules.values()).filter(
      rule => rule.required
    ).length;

    // Score is based on required rules passing (80%) and optional rules (20%)
    const requiredScore =
      totalRequiredRules > 0
        ? (passedRequiredRules / totalRequiredRules) * 80
        : 80;
    const optionalScore =
      totalRules > totalRequiredRules
        ? ((passedRules.length - passedRequiredRules) /
            (totalRules - totalRequiredRules)) *
          20
        : 20;
    const score = Math.round(requiredScore + optionalScore);

    const isValid =
      errors.length === 0 && passedRequiredRules === totalRequiredRules;

    logger.debug('Credential validation completed', {
      credentialId: credential.id,
      isValid,
      score,
      passedRules: passedRules.length,
      failedRules: failedRules.length,
      errors: errors.length,
      warnings: warnings.length,
    });

    return {
      isValid,
      passedRules,
      failedRules,
      errors,
      warnings,
      score,
    };
  }

  /**
   * Get credential expiration information
   *
   * @param credential - Credential to check
   * @returns Expiration information
   */
  getExpirationInfo(
    credential: ComplianceCredential
  ): CredentialExpirationInfo {
    const daysUntilExpiration = getDaysUntilExpiration(credential);
    const isExpired = isCredentialExpired(credential);
    const warningLevel = getCredentialWarningLevel(credential);

    return {
      credentialId: credential.id,
      productId: credential.productId,
      expiresAt: credential.expiresAt!,
      daysUntilExpiration: daysUntilExpiration || 0,
      credentialType: credential.credentialType,
      isExpired,
      warningLevel,
    };
  }

  /**
   * Get all credentials that are expiring soon
   *
   * @param credentials - List of credentials to check
   * @param warningDays - Number of days before expiration to warn (default: 30)
   * @returns List of credentials expiring soon
   */
  getExpiringCredentials(
    credentials: ComplianceCredential[],
    warningDays: number = 30
  ): CredentialExpirationInfo[] {
    return credentials
      .filter(credential => credential.expiresAt !== null)
      .map(credential => this.getExpirationInfo(credential))
      .filter(
        info => info.daysUntilExpiration <= warningDays && !info.isExpired
      )
      .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);
  }

  /**
   * Get all expired credentials
   *
   * @param credentials - List of credentials to check
   * @returns List of expired credentials
   */
  getExpiredCredentials(
    credentials: ComplianceCredential[]
  ): CredentialExpirationInfo[] {
    return credentials
      .filter(credential => credential.expiresAt !== null)
      .map(credential => this.getExpirationInfo(credential))
      .filter(info => info.isExpired)
      .sort((a, b) => b.daysUntilExpiration - a.daysUntilExpiration); // Most recently expired first
  }

  /**
   * Batch validate multiple credentials
   *
   * @param credentials - List of credentials to validate
   * @returns Promise resolving to array of validation results
   */
  async batchValidateCredentials(
    credentials: ComplianceCredential[]
  ): Promise<
    Array<{ credential: ComplianceCredential; result: ValidationResult }>
  > {
    const results = [];

    for (const credential of credentials) {
      try {
        const result = await this.validateCredential(credential);
        results.push({ credential, result });
      } catch (error) {
        logger.error(
          'Batch validation failed for credential',
          error instanceof Error ? error : new Error(String(error)),
          { credentialId: credential.id }
        );
        results.push({
          credential,
          result: {
            isValid: false,
            passedRules: [],
            failedRules: Array.from(this.validationRules.keys()),
            errors: [`Validation failed: ${error}`],
            warnings: [],
            score: 0,
          },
        });
      }
    }

    return results;
  }

  /**
   * Initialize default validation rules
   */
  private initializeDefaultRules(): void {
    // Basic credential structure validation
    this.addValidationRule({
      id: 'basic_structure',
      name: 'Basic Structure Validation',
      description: 'Validates basic credential structure and required fields',
      validate: async credential => {
        return !!(
          credential.id &&
          credential.productId &&
          credential.issuer &&
          credential.issuedAt &&
          credential.credentialType &&
          credential.status &&
          credential.signature
        );
      },
      errorMessage: 'Credential is missing required fields',
      required: true,
    });

    // Signature validation
    this.addValidationRule({
      id: 'signature_present',
      name: 'Signature Presence',
      description: 'Validates that credential has a signature',
      validate: async credential => {
        return credential.signature.length > 0;
      },
      errorMessage: 'Credential signature is missing',
      required: true,
    });

    // Expiration validation
    this.addValidationRule({
      id: 'not_expired',
      name: 'Expiration Check',
      description: 'Validates that credential is not expired',
      validate: async credential => {
        return !isCredentialExpired(credential);
      },
      errorMessage: 'Credential has expired',
      required: true,
    });

    // Status validation
    this.addValidationRule({
      id: 'valid_status',
      name: 'Status Validation',
      description: 'Validates that credential status is valid',
      validate: async credential => {
        return ['issued', 'active'].includes(credential.status);
      },
      errorMessage: 'Credential has invalid status',
      required: true,
    });

    // HCS message validation
    this.addValidationRule({
      id: 'hcs_logged',
      name: 'HCS Logging Validation',
      description: 'Validates that credential is logged to HCS',
      validate: async credential => {
        return !!credential.hcsMessageId;
      },
      errorMessage: 'Credential is not logged to blockchain',
      required: true,
    });

    // Metadata validation
    this.addValidationRule({
      id: 'metadata_complete',
      name: 'Metadata Completeness',
      description: 'Validates that credential metadata is complete',
      validate: async credential => {
        const metadata = credential.metadata;
        return !!(
          metadata &&
          metadata.validationDetails &&
          metadata.complianceRules &&
          metadata.complianceRules.length > 0 &&
          metadata.verificationLevel &&
          metadata.validatedAt
        );
      },
      errorMessage: 'Credential metadata is incomplete',
      required: false,
    });

    // Compliance rules validation
    this.addValidationRule({
      id: 'compliance_rules_present',
      name: 'Compliance Rules Validation',
      description: 'Validates that at least one compliance rule is specified',
      validate: async credential => {
        return credential.metadata.complianceRules.length > 0;
      },
      errorMessage: 'No compliance rules specified',
      required: true,
    });

    // Issuer validation
    this.addValidationRule({
      id: 'trusted_issuer',
      name: 'Trusted Issuer Validation',
      description: 'Validates that credential is issued by a trusted authority',
      validate: async credential => {
        const trustedIssuers = [
          'ChainTrace Compliance Engine',
          'Custom Compliance Engine',
          'Guardian Platform',
        ];
        return trustedIssuers.includes(credential.issuer);
      },
      errorMessage: 'Credential issued by untrusted authority',
      required: true,
    });

    logger.debug('Initialized default validation rules', {
      ruleCount: this.validationRules.size,
    });
  }

  /**
   * Get summary of all validation rules
   *
   * @returns Array of validation rule summaries
   */
  getValidationRulesSummary(): Array<{
    id: string;
    name: string;
    description: string;
    required: boolean;
  }> {
    return Array.from(this.validationRules.values()).map(rule => ({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      required: rule.required,
    }));
  }
}
