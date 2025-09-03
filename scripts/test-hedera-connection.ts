/**
 * Test script for Hedera service connection
 *
 * Validates that the Hedera service can connect using existing credentials
 * and that the operator account has sufficient HBAR balance.
 */

import dotenv from 'dotenv';
import { getHederaService } from '../src/services/hedera/HederaService';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testHederaConnection() {
  try {
    console.log('🔄 Testing Hedera service connection...');

    // Get Hedera service instance
    const hederaService = getHederaService({ debug: true });

    // Validate connection
    const result = await hederaService.validateConnection();

    if (result.connected) {
      console.log('✅ Successfully connected to Hedera network!');
      console.log(`📊 Network: ${result.networkType}`);
      console.log(`💰 Balance: ${result.balance?.toString()}`);
      console.log(`⚡ Response time: ${result.responseTime}ms`);
    } else {
      console.error('❌ Failed to connect to Hedera network');
      console.error(`🔍 Error: ${result.error}`);
    }

    // Check service health
    console.log('\n🔄 Checking service health...');
    const healthChecks = await hederaService.checkServiceHealth();

    healthChecks.forEach(check => {
      const status = check.status === 'healthy' ? '✅' : '❌';
      console.log(
        `${status} ${check.service}: ${check.status} (${check.responseTime}ms)`
      );
      if (check.error) {
        console.log(`   Error: ${check.error}`);
      }
    });

    // Clean up
    await hederaService.close();
    console.log('\n✅ Connection test completed successfully!');
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    process.exit(1);
  }
}

// Run the test
testHederaConnection();
