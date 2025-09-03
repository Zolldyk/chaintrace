/**
 * Test script for HTS service functionality
 *
 * Validates HTS token access, balance checking, and reward distribution
 * with proper error handling and performance measurement.
 */

import dotenv from 'dotenv';
import {
  getHTSService,
  type RewardDistribution,
} from '../src/services/hedera/HTSService';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testHTSService() {
  try {
    console.log('🔄 Testing HTS service...');

    // Get HTS service instance
    const htsService = getHTSService({ debug: true });

    // Initialize service
    console.log('\n🔄 Initializing HTS service...');
    await htsService.initialize();
    console.log('✅ HTS service initialized');

    // Get token information
    console.log('\n🔄 Getting token information...');
    const tokenInfo = await htsService.getTokenInfo();
    console.log('✅ Token information retrieved');
    console.log(`📋 Token: ${tokenInfo.name} (${tokenInfo.symbol})`);
    console.log(`🔢 Decimals: ${tokenInfo.decimals}`);
    console.log(`💰 Total Supply: ${tokenInfo.totalSupply}`);
    console.log(`🏦 Treasury: ${tokenInfo.treasuryAccountId}`);

    // Validate token access
    console.log('\n🔄 Validating token access...');
    const accessResult = await htsService.validateTokenAccess();

    if (accessResult.accessible) {
      console.log('✅ Token is accessible');
      console.log(
        `💰 Treasury Balance: ${accessResult.treasuryBalance?.balance} ${tokenInfo.symbol}`
      );
      console.log(`⚡ Response time: ${accessResult.responseTime}ms`);
    } else {
      console.log('❌ Token access failed');
      console.log(`🔍 Error: ${accessResult.error}`);
      return;
    }

    // Test balance checking for treasury account
    console.log('\n🔄 Testing token balance checking...');
    const treasuryBalance = await htsService.getTokenBalance(
      tokenInfo.treasuryAccountId
    );
    console.log('✅ Balance check successful');
    console.log(
      `💰 Treasury Balance: ${treasuryBalance.balance} ${tokenInfo.symbol}`
    );
    console.log(`🔢 Tiny Tokens: ${treasuryBalance.balanceInTinyTokens}`);

    // Test reward distribution (small amount to test account)
    console.log('\n🔄 Testing reward distribution...');

    const testDistributions: RewardDistribution[] = [
      {
        accountId: tokenInfo.treasuryAccountId, // Distribute to treasury account for testing
        amount: 0.00000001, // Very small amount for testing
        reason: 'HTS service functionality test',
        metadata: {
          source: 'test-script',
          testRun: true,
        },
      },
    ];

    // Note: This test distributes tokens from treasury to treasury (net zero)
    // In a real scenario, you would distribute to different accounts
    console.log(
      '⚠️  Note: Distributing test amount to treasury account (net zero operation)'
    );

    const distributionResult =
      await htsService.distributeRewards(testDistributions);

    if (distributionResult.success) {
      console.log('✅ Token distribution successful');
      console.log(`📋 Transaction ID: ${distributionResult.transactionId}`);
      console.log(
        `⏰ Consensus Timestamp: ${distributionResult.consensusTimestamp}`
      );
      console.log(
        `🎯 Successful Distributions: ${distributionResult.successfulDistributions}`
      );
      console.log(
        `💰 Total Distributed: ${distributionResult.totalAmountDistributed} ${tokenInfo.symbol}`
      );
      console.log(`⚡ Response time: ${distributionResult.responseTime}ms`);
    } else {
      console.log('❌ Token distribution failed');
      console.log(`🔍 Error: ${distributionResult.error}`);
      if (distributionResult.failedDistributions.length > 0) {
        console.log('❌ Failed distributions:');
        distributionResult.failedDistributions.forEach(failed => {
          console.log(
            `   - ${failed.accountId}: ${failed.amount} (${failed.error})`
          );
        });
      }
    }

    // Test multiple balance checking
    console.log('\n🔄 Testing multiple balance checking...');
    const accountIds = [tokenInfo.treasuryAccountId]; // Add more test accounts if available
    const multipleBalances = await htsService.getMultipleBalances(accountIds);

    console.log('✅ Multiple balance check successful');
    multipleBalances.forEach(balance => {
      console.log(
        `💰 ${balance.accountId}: ${balance.balance} ${tokenInfo.symbol}`
      );
    });

    // Test service configuration
    console.log('\n🔄 Testing service configuration...');
    const config = htsService.getConfig();
    console.log('✅ Service configuration retrieved');
    console.log(`📋 Token ID: ${config.tokenId}`);
    console.log(`🌐 Network: ${config.networkType}`);
    console.log(`🏦 Treasury: ${config.treasuryAccountId}`);
    console.log(`📏 Max Distribution: ${config.maxDistributionAmount}`);
    console.log(`🔢 Decimals: ${config.decimals}`);

    // Clean up
    await htsService.dispose();
    console.log('\n✅ HTS service test completed successfully!');
  } catch (error) {
    console.error('❌ HTS service test failed:', error);
    process.exit(1);
  }
}

// Run the test
testHTSService();
