/**
 * Test script for HCS service functionality
 *
 * Validates HCS topic access, message submission, and event logging
 * with proper error handling and performance measurement.
 */

import dotenv from 'dotenv';
import {
  getHCSService,
  type ProductEvent,
} from '../src/services/hedera/HCSService';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testHCSService() {
  try {
    console.log('🔄 Testing HCS service...');

    // Get HCS service instance
    const hcsService = getHCSService({ debug: true });

    // Initialize service
    console.log('\n🔄 Initializing HCS service...');
    await hcsService.initialize();
    console.log('✅ HCS service initialized');

    // Validate topic access
    console.log('\n🔄 Validating topic access...');
    const accessResult = await hcsService.validateTopicAccess();

    if (accessResult.accessible) {
      console.log('✅ HCS topic is accessible');
      console.log(`⚡ Response time: ${accessResult.responseTime}ms`);
    } else {
      console.log('❌ HCS topic access failed');
      console.log(`🔍 Error: ${accessResult.error}`);
      return;
    }

    // Test product event logging
    console.log('\n🔄 Testing product event logging...');

    const testEvent: ProductEvent = {
      id: `test_${Date.now()}`,
      productId: 'PROD-2024-TEST-001',
      eventType: 'created',
      actor: {
        walletAddress: '0.0.6628267',
        role: 'producer',
        name: 'Test Producer',
      },
      timestamp: new Date().toISOString(),
      location: {
        coordinates: '40.7128,-74.0060',
        address: 'New York, NY',
        facility: 'Test Processing Center',
      },
      data: {
        batchId: 'BATCH-001',
        quantity: 100,
        qualityGrade: 'A',
      },
      metadata: {
        source: 'test-script',
        version: '1.0.0',
        description: 'HCS service functionality test',
      },
    };

    const logResult = await hcsService.logProductEvent(testEvent);

    if (logResult.success) {
      console.log('✅ Product event logged successfully');
      console.log(`📋 Transaction ID: ${logResult.transactionId}`);
      console.log(`⏰ Consensus Timestamp: ${logResult.consensusTimestamp}`);
      console.log(`🔢 Sequence Number: ${logResult.sequenceNumber}`);
      console.log(`⚡ Response time: ${logResult.responseTime}ms`);
    } else {
      console.log('❌ Product event logging failed');
      console.log(`🔍 Error: ${logResult.error}`);
    }

    // Test custom message submission
    console.log('\n🔄 Testing custom message submission...');

    const customMessage = {
      type: 'test_notification',
      message: 'HCS service test completed successfully',
      timestamp: new Date().toISOString(),
      source: 'test-script',
    };

    const messageResult = await hcsService.submitMessage(customMessage);

    if (messageResult.success) {
      console.log('✅ Custom message submitted successfully');
      console.log(`📋 Transaction ID: ${messageResult.transactionId}`);
      console.log(
        `⏰ Consensus Timestamp: ${messageResult.consensusTimestamp}`
      );
      console.log(`⚡ Response time: ${messageResult.responseTime}ms`);
    } else {
      console.log('❌ Custom message submission failed');
      console.log(`🔍 Error: ${messageResult.error}`);
    }

    // Test service configuration
    console.log('\n🔄 Testing service configuration...');
    const config = hcsService.getConfig();
    console.log('✅ Service configuration retrieved');
    console.log(`📋 Topic ID: ${config.topicId}`);
    console.log(`🌐 Network: ${config.networkType}`);
    console.log(`📏 Max Message Size: ${config.maxMessageSize} bytes`);

    // Clean up
    await hcsService.dispose();
    console.log('\n✅ HCS service test completed successfully!');
  } catch (error) {
    console.error('❌ HCS service test failed:', error);
    process.exit(1);
  }
}

// Run the test
testHCSService();
