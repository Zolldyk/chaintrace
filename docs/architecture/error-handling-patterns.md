# Error Handling Patterns and Specifications

## Hedera Service-Specific Error Handling

### Custom Compliance Engine Errors

**Common Error Scenarios:**

- Business rules not found or inaccessible
- Custom Compliance Engine service unavailable
- Credential issuance failures
- Business rule compliance validation errors

**Error Handling Pattern:**

```typescript
interface ComplianceError {
  type:
    | 'RULES_NOT_FOUND'
    | 'SERVICE_UNAVAILABLE'
    | 'CREDENTIAL_FAILED'
    | 'VALIDATION_ERROR';
  message: string;
  retryable: boolean;
  userAction?: string;
}

async function handleComplianceOperation<T>(
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const complianceError = mapToComplianceError(error);

    if (complianceError.retryable) {
      // Exponential backoff retry logic
      return await retryWithBackoff(operation, 3);
    }

    // Log error for monitoring
    logger.error('Compliance operation failed', { error: complianceError });

    // Show user-friendly message
    showUserError(complianceError.message, complianceError.userAction);
    throw complianceError;
  }
}
```

### HCS (Hedera Consensus Service) Errors

**Common Error Scenarios:**

- Topic not found or access denied
- Message size exceeds limits
- Transaction submission failures
- Network connectivity issues

**Error Handling Pattern:**

```typescript
interface HCSError {
  type:
    | 'TOPIC_ACCESS_DENIED'
    | 'MESSAGE_TOO_LARGE'
    | 'TRANSACTION_FAILED'
    | 'NETWORK_ERROR';
  transactionId?: string;
  retryable: boolean;
}

async function submitHCSMessage(
  topicId: string,
  message: object
): Promise<string> {
  const messageStr = JSON.stringify(message);

  // Validate message size before submission
  if (messageStr.length > HCS_MESSAGE_LIMIT) {
    throw new HCSError({
      type: 'MESSAGE_TOO_LARGE',
      message: `Message size ${messageStr.length} exceeds limit ${HCS_MESSAGE_LIMIT}`,
      retryable: false,
    });
  }

  try {
    const result = await hcsClient.submitMessage(topicId, messageStr);

    // Store locally until confirmed
    await storeLocalBackup(message, result.transactionId);

    return result.transactionId;
  } catch (error) {
    return handleHCSError(error, message);
  }
}
```

### HTS (Hedera Token Service) Errors

**Common Error Scenarios:**

- Insufficient token balance
- Token not associated with account
- Transfer limits exceeded
- Account frozen or deleted

**Error Handling Pattern:**

```typescript
interface HTSError {
  type:
    | 'INSUFFICIENT_BALANCE'
    | 'NOT_ASSOCIATED'
    | 'TRANSFER_LIMIT'
    | 'ACCOUNT_FROZEN';
  tokenId: string;
  accountId: string;
  suggestedAction: string;
}

async function distributeTokenReward(
  accountId: string,
  amount: number
): Promise<string> {
  try {
    // Pre-validate account association
    const isAssociated = await checkTokenAssociation(
      accountId,
      REWARD_TOKEN_ID
    );
    if (!isAssociated) {
      throw new HTSError({
        type: 'NOT_ASSOCIATED',
        tokenId: REWARD_TOKEN_ID,
        accountId,
        suggestedAction: 'Associate the reward token with your account first',
      });
    }

    const result = await tokenService.transfer(
      REWARD_TOKEN_ID,
      accountId,
      amount
    );

    // Notify user of successful distribution
    notifyTokenRewardDistribution(accountId, amount, result.transactionId);

    return result.transactionId;
  } catch (error) {
    return handleHTSError(error);
  }
}
```

### Mirror Node Errors

**Common Error Scenarios:**

- API rate limiting
- Data not found
- Network timeouts
- Stale data issues

**Error Handling Pattern:**

```typescript
interface MirrorNodeError {
  type: 'RATE_LIMITED' | 'NOT_FOUND' | 'TIMEOUT' | 'STALE_DATA';
  retryAfter?: number;
  cacheAvailable: boolean;
}

async function fetchProductData(productId: string): Promise<ProductData> {
  try {
    // Try cache first for performance
    const cachedData = await getCachedProduct(productId);
    if (cachedData && !isStale(cachedData)) {
      return cachedData;
    }

    const result = await mirrorNodeClient.getProduct(productId);

    // Update cache with fresh data
    await updateProductCache(productId, result);

    return result;
  } catch (error) {
    if (error.type === 'RATE_LIMITED') {
      // Return cached data if available during rate limiting
      const cachedData = await getCachedProduct(productId);
      if (cachedData) {
        showUserMessage('Using cached data due to high demand', 'info');
        return cachedData;
      }
    }

    throw new MirrorNodeError(error);
  }
}
```

## Retry Mechanisms and User Feedback

### Exponential Backoff Implementation

```typescript
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !isRetryableError(error)) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      await sleep(delay);

      // Show progress to user
      showRetryProgress(attempt, maxRetries);
    }
  }

  throw lastError;
}
```

### User Feedback Strategies

```typescript
interface UserFeedback {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  action?: string;
  dismissible: boolean;
  duration?: number;
}

function showUserError(message: string, suggestedAction?: string): void {
  const feedback: UserFeedback = {
    type: 'error',
    message,
    action: suggestedAction,
    dismissible: true,
    duration: 10000, // 10 seconds
  };

  userFeedbackService.show(feedback);
}

// Specific error messages for common scenarios
const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: {
    message: 'Please connect your Hedera wallet to continue',
    action: 'Connect Wallet',
  },
  INSUFFICIENT_HBAR: {
    message: 'Insufficient HBAR balance for this operation',
    action: 'Visit Hedera Portal to add HBAR to your account',
  },
  NETWORK_TIMEOUT: {
    message: 'Network request timed out. Please check your connection.',
    action: 'Retry',
  },
  VERIFICATION_FAILED: {
    message: 'Product verification could not be completed at this time',
    action: 'Try again or contact support',
  },
};
```

## Offline Capability Implementation

### Local Backup Strategy

```typescript
interface LocalBackup {
  id: string;
  type: 'product_creation' | 'verification_request' | 'token_reward';
  data: any;
  timestamp: number;
  synced: boolean;
  retryCount: number;
}

class OfflineManager {
  private backupQueue: LocalBackup[] = [];

  async storeLocalBackup(type: string, data: any): Promise<void> {
    const backup: LocalBackup = {
      id: generateId(),
      type: type as any,
      data,
      timestamp: Date.now(),
      synced: false,
      retryCount: 0,
    };

    this.backupQueue.push(backup);
    await this.saveToLocalStorage();
  }

  async syncWhenOnline(): Promise<void> {
    if (!navigator.onLine) return;

    for (const backup of this.backupQueue.filter(b => !b.synced)) {
      try {
        await this.syncBackup(backup);
        backup.synced = true;
      } catch (error) {
        backup.retryCount++;
        if (backup.retryCount > MAX_RETRY_COUNT) {
          // Move to failed queue for manual intervention
          await this.moveToFailedQueue(backup);
        }
      }
    }

    // Clean up synced items
    this.backupQueue = this.backupQueue.filter(b => !b.synced);
    await this.saveToLocalStorage();
  }
}
```

### Network Status Monitoring

```typescript
class NetworkStatusManager {
  private isOnline: boolean = navigator.onLine;
  private listeners: Array<(online: boolean) => void> = [];

  constructor() {
    window.addEventListener('online', () => this.setOnlineStatus(true));
    window.addEventListener('offline', () => this.setOnlineStatus(false));
  }

  private setOnlineStatus(online: boolean): void {
    this.isOnline = online;
    this.notifyListeners(online);

    if (online) {
      // Trigger sync when coming back online
      offlineManager.syncWhenOnline();
      showUserMessage('Connection restored. Syncing data...', 'success');
    } else {
      showUserMessage('Connection lost. Operating in offline mode.', 'warning');
    }
  }

  onStatusChange(callback: (online: boolean) => void): void {
    this.listeners.push(callback);
  }
}
```

## Error Monitoring and Analytics

### Error Tracking Configuration

```typescript
interface ErrorEvent {
  type: string;
  service: 'guardian' | 'hcs' | 'hts' | 'mirror_node';
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: Record<string, any>;
  timestamp: number;
  userId?: string;
}

class ErrorTracker {
  static track(error: Error, context: ErrorContext): void {
    const errorEvent: ErrorEvent = {
      type: error.constructor.name,
      service: context.service,
      severity: context.severity || 'medium',
      context: {
        message: error.message,
        stack: error.stack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        ...context.additional,
      },
      timestamp: Date.now(),
      userId: getCurrentUserId(),
    };

    // Send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      sendToMonitoring(errorEvent);
    } else {
      console.error('Error tracked:', errorEvent);
    }
  }
}
```

## Error Recovery Procedures

### Automatic Recovery Strategies

```typescript
class ErrorRecoveryManager {
  async handleServiceFailure(service: string, error: Error): Promise<void> {
    switch (service) {
      case 'guardian':
        // Fallback to cached policy data
        await this.useCachedPolicyData();
        break;

      case 'hcs':
        // Store message locally for later submission
        await this.storeHCSMessageLocally(error.context?.message);
        break;

      case 'hts':
        // Queue token distribution for later
        await this.queueTokenDistribution(error.context);
        break;

      case 'mirror_node':
        // Use cached data with staleness warning
        await this.serveCachedData(true);
        break;

      default:
        throw error;
    }
  }
}
```

This comprehensive error handling specification ensures robust operation across all Hedera services while maintaining excellent user experience during failures.
