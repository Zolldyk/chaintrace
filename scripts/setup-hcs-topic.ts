#!/usr/bin/env tsx
/**
 * Script to create a Hedera Consensus Service topic for ChainTrace events
 *
 * This script creates an HCS topic using the Hedera SDK and tests message submission
 * to verify the topic is working correctly.
 *
 * @author ChainTrace Development Team
 * @since 1.0.0
 */

import {
  Client,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  PrivateKey,
  AccountId,
  Hbar,
} from '@hashgraph/sdk';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface TopicResult {
  topicId: string;
  transactionId: string;
  consensusTimestamp: string;
}

/**
 * Creates a new HCS topic for ChainTrace supply chain events
 *
 * @returns Promise resolving to topic creation details
 * @throws {Error} When operator credentials are invalid or network is unavailable
 */
async function createHCSTopic(): Promise<TopicResult> {
  const operatorId = process.env.OPERATOR_ID;
  const operatorKey = process.env.OPERATOR_KEY;
  const network = process.env.HEDERA_NETWORK || 'testnet';

  if (!operatorId || !operatorKey) {
    throw new Error('OPERATOR_ID and OPERATOR_KEY must be set in .env.local');
  }

  console.log('🔧 Initializing Hedera client...');
  console.log(`📍 Network: ${network}`);
  console.log(`👤 Operator: ${operatorId}`);

  // Initialize Hedera client
  const client =
    network === 'mainnet' ? Client.forMainnet() : Client.forTestnet();

  client.setOperator(
    AccountId.fromString(operatorId),
    PrivateKey.fromString(operatorKey)
  );

  // Set max transaction fee (optional, but recommended)
  client.setDefaultMaxTransactionFee(new Hbar(10));

  try {
    console.log('\n🏗️  Creating HCS topic...');

    // Create the topic
    const topicCreateTx = new TopicCreateTransaction()
      .setTopicMemo('ChainTrace Supply Chain Events Topic')
      .setAdminKey(client.operatorPublicKey!)
      .setSubmitKey(client.operatorPublicKey!)
      .setAutoRenewAccountId(client.operatorAccountId!)
      .setAutoRenewPeriod(7890000); // ~90 days in seconds

    const topicCreateSubmit = await topicCreateTx.execute(client);
    const topicCreateReceipt = await topicCreateSubmit.getReceipt(client);

    const topicId = topicCreateReceipt.topicId!;

    console.log(`✅ Topic created successfully!`);
    console.log(`🆔 Topic ID: ${topicId.toString()}`);
    console.log(
      `📄 Transaction ID: ${topicCreateSubmit.transactionId.toString()}`
    );

    return {
      topicId: topicId.toString(),
      transactionId: topicCreateSubmit.transactionId.toString(),
      consensusTimestamp:
        topicCreateReceipt.consensusTimestamp?.toString() || 'N/A',
    };
  } catch (error) {
    console.error('❌ Error creating topic:', error);
    throw error;
  } finally {
    client.close();
  }
}

/**
 * Tests message submission to the created HCS topic
 *
 * @param topicId - The topic ID to submit test messages to
 * @throws {Error} When message submission fails
 */
async function testTopicMessages(topicId: string): Promise<void> {
  const operatorId = process.env.OPERATOR_ID;
  const operatorKey = process.env.OPERATOR_KEY;
  const network = process.env.HEDERA_NETWORK || 'testnet';

  if (!operatorId || !operatorKey) {
    throw new Error('OPERATOR_ID and OPERATOR_KEY must be set in .env.local');
  }

  console.log('\n🧪 Testing message submission...');

  // Initialize client for message testing
  const client =
    network === 'mainnet' ? Client.forMainnet() : Client.forTestnet();

  client.setOperator(
    AccountId.fromString(operatorId),
    PrivateKey.fromString(operatorKey)
  );

  try {
    // Create test message
    const testMessage = JSON.stringify({
      eventType: 'TOPIC_CREATED',
      productId: 'TEST-SETUP-001',
      timestamp: new Date().toISOString(),
      actor: {
        accountId: operatorId,
        role: 'system',
      },
      metadata: {
        source: 'setup-script',
        description: 'HCS topic creation verification',
      },
    });

    console.log(`📝 Submitting test message to topic ${topicId}...`);

    const messageSubmitTx = new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(testMessage);

    const messageSubmitSubmit = await messageSubmitTx.execute(client);
    const messageSubmitReceipt = await messageSubmitSubmit.getReceipt(client);

    console.log(`✅ Test message submitted successfully!`);
    console.log(
      `📄 Message Transaction ID: ${messageSubmitSubmit.transactionId.toString()}`
    );
    console.log(
      `⏰ Consensus Timestamp: ${messageSubmitReceipt.consensusTimestamp?.toString()}`
    );

    // Wait a moment for Mirror Node propagation
    console.log('\n⏳ Waiting 5 seconds for Mirror Node propagation...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log(`🔍 You can verify the message on HashScan:`);
    const hashscanUrl =
      network === 'mainnet'
        ? `https://hashscan.io/mainnet/topic/${topicId}`
        : `https://hashscan.io/testnet/topic/${topicId}`;
    console.log(`   ${hashscanUrl}`);
  } catch (error) {
    console.error('❌ Error testing messages:', error);
    throw error;
  } finally {
    client.close();
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  try {
    console.log('🚀 Starting HCS Topic Setup for ChainTrace');
    console.log('='.repeat(50));

    // Create the topic
    const result = await createHCSTopic();

    // Test message submission
    await testTopicMessages(result.topicId);

    console.log('\n' + '='.repeat(50));
    console.log('🎉 HCS Topic Setup Complete!');
    console.log('\n📋 Summary:');
    console.log(`   Topic ID: ${result.topicId}`);
    console.log(`   Transaction: ${result.transactionId}`);
    console.log(`   Timestamp: ${result.consensusTimestamp}`);
    console.log('\n📝 Next Steps:');
    console.log('   1. Update HCS_TOPIC_ID in .env.local');
    console.log('   2. Verify messages on HashScan');
    console.log('   3. Test integration in ChainTrace services');
  } catch (error) {
    console.error('\n💥 Setup failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

export { createHCSTopic, testTopicMessages };
