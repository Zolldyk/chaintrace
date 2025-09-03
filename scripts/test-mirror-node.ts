/**
 * Test script for Mirror Node service connectivity
 *
 * Validates that the Mirror Node service can connect and retrieve data
 * with proper error handling and performance measurement.
 */

import dotenv from 'dotenv';
import { getMirrorNodeService } from '../src/services/hedera/MirrorNodeService';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testMirrorNodeService() {
  try {
    console.log('🔄 Testing Mirror Node service...');

    // Get Mirror Node service instance
    const mirrorNodeService = getMirrorNodeService({ debug: true });

    // Health check
    console.log('\n🔄 Performing health check...');
    const health = await mirrorNodeService.healthCheck();

    if (health.healthy) {
      console.log('✅ Mirror Node is healthy');
      console.log(`⚡ Response time: ${health.responseTime}ms`);
    } else {
      console.log('❌ Mirror Node is unhealthy');
      console.log(`🔍 Error: ${health.error}`);
    }

    // Test account lookup with the operator account
    console.log('\n🔄 Testing account lookup...');
    const operatorId = process.env.HEDERA_ACCOUNT_ID;
    if (operatorId) {
      const accountInfo = await mirrorNodeService.getAccountInfo(operatorId);
      console.log('✅ Account lookup successful');
      console.log(`💰 Balance: ${accountInfo.balance.balance} tinybars`);
      console.log(`🔑 Account: ${accountInfo.account}`);
    }

    // Test HCS topic lookup
    console.log('\n🔄 Testing HCS topic lookup...');
    const topicId = process.env.HCS_TOPIC_ID;
    if (topicId) {
      try {
        const topicInfo = await mirrorNodeService.getTopicInfo(topicId);
        console.log('✅ HCS topic lookup successful');
        console.log(`📋 Topic: ${topicInfo.topic_id}`);
        console.log(`🔢 Sequence: ${topicInfo.sequence_number}`);

        // Get recent messages
        const messages = await mirrorNodeService.getTopicMessages(topicId, 5);
        console.log(
          `📨 Found ${messages.data.messages.length} recent messages`
        );
      } catch (error) {
        console.log(
          '⚠️  HCS topic lookup failed (this is expected if no messages exist yet)'
        );
        console.log(
          `🔍 Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Test product verification (will likely fail since no product data exists yet)
    console.log('\n🔄 Testing product verification...');
    try {
      const productData = await mirrorNodeService.getProductVerification(
        'PROD-2024-001-TEST01'
      );
      console.log('✅ Product verification test successful');
      console.log(`📦 Product: ${productData.productId}`);
      console.log(`✓ Status: ${productData.status}`);
      console.log(`📅 Events: ${productData.events.length}`);
    } catch (error) {
      console.log(
        '⚠️  Product verification test failed (expected - no test products exist)'
      );
      console.log(
        `🔍 Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    console.log('\n✅ Mirror Node service test completed!');
  } catch (error) {
    console.error('❌ Mirror Node test failed:', error);
    process.exit(1);
  }
}

// Run the test
testMirrorNodeService();
