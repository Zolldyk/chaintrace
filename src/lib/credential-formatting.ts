/**
 * Human-readable credential formatting utilities
 *
 * @since 1.0.0
 */

import type {
  ComplianceCredential,
  CredentialType,
  CredentialStatus,
  VerificationLevel,
} from '@/types/compliance';
import {
  getDaysUntilExpiration,
  getCredentialWarningLevel,
} from './credential-validations';

/**
 * Formatted credential for human-readable display
 */
export interface FormattedCredential {
  /** Original credential data */
  credential: ComplianceCredential;

  /** Formatted display information */
  display: {
    /** Human-readable title */
    title: string;

    /** Credential description */
    description: string;

    /** Status display information */
    status: {
      label: string;
      color: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
      icon: string;
    };

    /** Type display information */
    type: {
      label: string;
      description: string;
      icon: string;
    };

    /** Verification level display */
    verificationLevel: {
      label: string;
      description: string;
      badge: string;
    };

    /** Issuer information */
    issuer: {
      name: string;
      displayName: string;
      trusted: boolean;
    };

    /** Timing information */
    timing: {
      issuedDate: string;
      issuedRelative: string;
      expirationDate: string | null;
      expirationRelative: string | null;
      daysUntilExpiration: number | null;
      warningLevel: 'none' | 'info' | 'warning' | 'critical';
    };

    /** Compliance rules display */
    complianceRules: Array<{
      rule: string;
      displayName: string;
      description: string;
    }>;
  };
}

/**
 * Credential summary for dashboard display
 */
export interface CredentialSummary {
  /** Total credentials */
  total: number;

  /** Credentials by status */
  byStatus: Record<CredentialStatus, number>;

  /** Credentials by type */
  byType: Record<CredentialType, number>;

  /** Expiration warnings */
  expirationWarnings: {
    expiring: number;
    expired: number;
    critical: number;
  };

  /** Latest credential */
  latest?: ComplianceCredential;
}

/**
 * Format a credential for human-readable display
 *
 * @param credential - Credential to format
 * @returns Formatted credential with display information
 *
 * @example
 * ```typescript
 * const formatted = formatCredential(credential);
 * console.log(formatted.display.title); // "Supply Chain Compliance Certificate"
 * console.log(formatted.display.status.label); // "Active"
 * ```
 */
export function formatCredential(
  credential: ComplianceCredential
): FormattedCredential {
  const daysUntilExpiration = getDaysUntilExpiration(credential);
  const warningLevel = getCredentialWarningLevel(credential);

  return {
    credential,
    display: {
      title: formatCredentialTitle(credential.credentialType),
      description: formatCredentialDescription(credential),
      status: formatCredentialStatus(credential.status),
      type: formatCredentialType(credential.credentialType),
      verificationLevel: formatVerificationLevel(
        credential.metadata.verificationLevel
      ),
      issuer: formatIssuer(credential.issuer),
      timing: {
        issuedDate: credential.issuedAt.toLocaleDateString(),
        issuedRelative: formatRelativeTime(credential.issuedAt),
        expirationDate: credential.expiresAt?.toLocaleDateString() || null,
        expirationRelative: credential.expiresAt
          ? formatRelativeTime(credential.expiresAt)
          : null,
        daysUntilExpiration,
        warningLevel,
      },
      complianceRules: credential.metadata.complianceRules.map(rule => ({
        rule,
        displayName: formatComplianceRuleName(rule),
        description: formatComplianceRuleDescription(rule),
      })),
    },
  };
}

/**
 * Format multiple credentials for summary display
 *
 * @param credentials - List of credentials to summarize
 * @returns Credential summary with aggregated information
 */
export function formatCredentialSummary(
  credentials: ComplianceCredential[]
): CredentialSummary {
  const summary: CredentialSummary = {
    total: credentials.length,
    byStatus: {
      issued: 0,
      active: 0,
      expired: 0,
      revoked: 0,
    },
    byType: {
      supply_chain: 0,
      carbon_credit: 0,
      regulatory_compliance: 0,
    },
    expirationWarnings: {
      expiring: 0,
      expired: 0,
      critical: 0,
    },
  };

  let latestCredential: ComplianceCredential | undefined;

  for (const credential of credentials) {
    // Count by status
    summary.byStatus[credential.status]++;

    // Count by type
    summary.byType[credential.credentialType]++;

    // Check expiration warnings
    const warningLevel = getCredentialWarningLevel(credential);
    if (warningLevel === 'critical') {
      if (credential.expiresAt && new Date() > credential.expiresAt) {
        summary.expirationWarnings.expired++;
      } else {
        summary.expirationWarnings.critical++;
      }
    } else if (warningLevel === 'warning' || warningLevel === 'info') {
      summary.expirationWarnings.expiring++;
    }

    // Track latest credential
    if (!latestCredential || credential.issuedAt > latestCredential.issuedAt) {
      latestCredential = credential;
    }
  }

  summary.latest = latestCredential;
  return summary;
}

/**
 * Format credential title based on type
 */
function formatCredentialTitle(type: CredentialType): string {
  switch (type) {
    case 'supply_chain':
      return 'Supply Chain Compliance Certificate';
    case 'carbon_credit':
      return 'Carbon Credit Verification Certificate';
    case 'regulatory_compliance':
      return 'Regulatory Compliance Certificate';
    default:
      return 'Compliance Certificate';
  }
}

/**
 * Format credential description
 */
function formatCredentialDescription(credential: ComplianceCredential): string {
  const ruleCount = credential.metadata.complianceRules.length;
  const ruleText = ruleCount === 1 ? 'compliance rule' : 'compliance rules';

  return `This certificate validates compliance with ${ruleCount} ${ruleText} for product ${credential.productId}. Verification level: ${credential.metadata.verificationLevel}.`;
}

/**
 * Format credential status for display
 */
function formatCredentialStatus(status: CredentialStatus): {
  label: string;
  color: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
  icon: string;
} {
  switch (status) {
    case 'active':
      return { label: 'Active', color: 'green', icon: '✓' };
    case 'issued':
      return { label: 'Issued', color: 'blue', icon: '📄' };
    case 'expired':
      return { label: 'Expired', color: 'red', icon: '⏰' };
    case 'revoked':
      return { label: 'Revoked', color: 'red', icon: '❌' };
    default:
      return { label: 'Unknown', color: 'gray', icon: '?' };
  }
}

/**
 * Format credential type for display
 */
function formatCredentialType(type: CredentialType): {
  label: string;
  description: string;
  icon: string;
} {
  switch (type) {
    case 'supply_chain':
      return {
        label: 'Supply Chain',
        description: 'Validates supply chain traceability and compliance',
        icon: '🔗',
      };
    case 'carbon_credit':
      return {
        label: 'Carbon Credit',
        description:
          'Validates carbon offset and environmental impact compliance',
        icon: '🌱',
      };
    case 'regulatory_compliance':
      return {
        label: 'Regulatory',
        description:
          'Validates compliance with regulatory standards and requirements',
        icon: '📋',
      };
    default:
      return {
        label: 'Unknown',
        description: 'Unknown credential type',
        icon: '❓',
      };
  }
}

/**
 * Format verification level for display
 */
function formatVerificationLevel(level: VerificationLevel): {
  label: string;
  description: string;
  badge: string;
} {
  switch (level) {
    case 'basic':
      return {
        label: 'Basic',
        description: 'Basic verification with essential compliance checks',
        badge: 'B',
      };
    case 'enhanced':
      return {
        label: 'Enhanced',
        description:
          'Enhanced verification with comprehensive compliance analysis',
        badge: 'E',
      };
    case 'premium':
      return {
        label: 'Premium',
        description:
          'Premium verification with exhaustive compliance validation',
        badge: 'P',
      };
    default:
      return {
        label: 'Unknown',
        description: 'Unknown verification level',
        badge: '?',
      };
  }
}

/**
 * Format issuer information
 */
function formatIssuer(issuer: string): {
  name: string;
  displayName: string;
  trusted: boolean;
} {
  const trustedIssuers = [
    'ChainTrace Compliance Engine',
    'Custom Compliance Engine',
    'Guardian Platform',
  ];

  const displayNames: Record<string, string> = {
    'ChainTrace Compliance Engine': 'ChainTrace',
    'Custom Compliance Engine': 'Guardian',
    'Guardian Platform': 'Guardian',
  };

  return {
    name: issuer,
    displayName: displayNames[issuer] || issuer,
    trusted: trustedIssuers.includes(issuer),
  };
}

/**
 * Format compliance rule name for display
 */
function formatComplianceRuleName(rule: string): string {
  const ruleNames: Record<string, string> = {
    organic_certification: 'Organic Certification',
    fair_trade: 'Fair Trade Compliance',
    food_safety: 'Food Safety Standards',
    environmental_impact: 'Environmental Impact Assessment',
    labor_standards: 'Labor Standards Compliance',
    quality_assurance: 'Quality Assurance',
    traceability: 'Supply Chain Traceability',
    carbon_neutral: 'Carbon Neutral Certification',
    sustainable_farming: 'Sustainable Farming Practices',
    nafdac_compliance: 'NAFDAC Regulatory Compliance',
    son_compliance: 'SON Standards Compliance',
    fmenv_compliance: 'Federal Ministry of Environment Compliance',
  };

  return (
    ruleNames[rule] ||
    rule.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  );
}

/**
 * Format compliance rule description
 */
function formatComplianceRuleDescription(rule: string): string {
  const descriptions: Record<string, string> = {
    organic_certification:
      'Validates organic production methods and certification requirements',
    fair_trade: 'Ensures fair trade practices and ethical sourcing standards',
    food_safety: 'Validates food safety protocols and hygiene standards',
    environmental_impact:
      'Assesses environmental impact and sustainability measures',
    labor_standards:
      'Ensures compliance with labor rights and working conditions',
    quality_assurance: 'Validates product quality and testing requirements',
    traceability:
      'Ensures complete supply chain traceability and documentation',
    carbon_neutral: 'Validates carbon offset and neutrality claims',
    sustainable_farming:
      'Ensures sustainable agricultural practices and methods',
    nafdac_compliance:
      'Compliance with National Agency for Food and Drug Administration',
    son_compliance: 'Compliance with Standards Organisation of Nigeria',
    fmenv_compliance:
      'Compliance with Federal Ministry of Environment regulations',
  };

  return (
    descriptions[rule] || `Compliance validation for ${rule.replace(/_/g, ' ')}`
  );
}

/**
 * Format relative time for display
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    }
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else if (diffDays < 30) {
    const diffWeeks = Math.floor(diffDays / 7);
    return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;
  } else if (diffDays < 365) {
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
  } else {
    const diffYears = Math.floor(diffDays / 365);
    return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`;
  }
}

/**
 * Generate credential QR code data for verification
 *
 * @param credential - Credential to generate QR code for
 * @returns QR code data string
 */
export function generateCredentialQRData(
  credential: ComplianceCredential
): string {
  const qrData = {
    type: 'credential_verification',
    version: '1.0',
    credentialId: credential.id,
    productId: credential.productId,
    issuedAt: credential.issuedAt.toISOString(),
    verificationUrl: `/verify/credential/${credential.id}`,
    apiUrl: `/api/compliance/credentials/verify`,
  };

  return JSON.stringify(qrData);
}

/**
 * Parse credential QR code data
 *
 * @param qrData - QR code data string
 * @returns Parsed QR data or null if invalid
 */
export function parseCredentialQRData(qrData: string): {
  type: string;
  credentialId: string;
  productId: string;
  verificationUrl: string;
} | null {
  try {
    const data = JSON.parse(qrData);

    if (
      data.type === 'credential_verification' &&
      data.credentialId &&
      data.productId
    ) {
      return {
        type: data.type,
        credentialId: data.credentialId,
        productId: data.productId,
        verificationUrl: data.verificationUrl,
      };
    }

    return null;
  } catch {
    return null;
  }
}
