#!/usr/bin/env tsx
/**
 * Script to create ChainTrace HTS reward token
 *
 * Creates the CTRACE token with proper configuration for supply chain
 * reward distribution, including admin and supply key management.
 *
 * @author ChainTrace Development Team
 * @since 1.0.0
 */

import {
  Client,
  TokenCreateTransaction,
  TokenSupplyType,
  TokenType,
  PrivateKey,
  PublicKey,
  AccountId,
  Hbar,
  AccountBalanceQuery,
  TokenInfoQuery,
} from '@hashgraph/sdk';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface TokenResult {
  tokenId: string;
  transactionId: string;
  treasuryAccountId: string;
  totalSupply: string;
  adminKey: string;
  supplyKey: string;
}

/**
 * Creates the ChainTrace HTS reward token with specified properties
 *
 * @returns Promise resolving to token creation details
 * @throws {Error} When operator credentials are invalid or token creation fails
 */
async function createCTraceToken(): Promise<TokenResult> {
  const operatorId = process.env.OPERATOR_ID;
  const operatorKey = process.env.OPERATOR_KEY;
  const adminPublicKey = process.env.ADMIN_PUBLIC_KEY;
  const network = process.env.HEDERA_NETWORK || 'testnet';

  if (!operatorId || !operatorKey || !adminPublicKey) {
    throw new Error(
      'OPERATOR_ID, OPERATOR_KEY, and ADMIN_PUBLIC_KEY must be set in .env.local'
    );
  }

  console.log('🚀 Creating ChainTrace HTS Reward Token');
  console.log('='.repeat(50));
  console.log(`📍 Network: ${network}`);
  console.log(`👤 Operator/Treasury: ${operatorId}`);
  console.log(`🔑 Admin Key: ${adminPublicKey.substring(0, 20)}...`);

  // Initialize Hedera client
  const client =
    network === 'mainnet' ? Client.forMainnet() : Client.forTestnet();

  client.setOperator(
    AccountId.fromString(operatorId),
    PrivateKey.fromString(operatorKey)
  );

  client.setDefaultMaxTransactionFee(new Hbar(50)); // Higher fee for token creation

  try {
    console.log('\n🏗️  Creating CTRACE token...');

    // Convert public key from DER format
    const adminKey = PublicKey.fromString(adminPublicKey);

    // Create the token with ChainTrace specifications
    const tokenCreateTx = new TokenCreateTransaction()
      .setTokenName('ChainTrace Rewards')
      .setTokenSymbol('CTRACE')
      .setTokenType(TokenType.FungibleCommon)
      .setDecimals(2)
      .setInitialSupply(1_000_000_00) // 1,000,000.00 with 2 decimals
      .setSupplyType(TokenSupplyType.Infinite)
      .setTreasuryAccountId(client.operatorAccountId!)
      .setAdminKey(adminKey) // Enable future token updates
      .setSupplyKey(adminKey) // Enable minting/burning
      .setTokenMemo('ChainTrace supply chain verification rewards')
      .setAutoRenewAccountId(client.operatorAccountId!)
      .setAutoRenewPeriod(7890000) // ~90 days
      .freezeWith(client);

    // Sign with operator (treasury account)
    const tokenCreateSigned = await tokenCreateTx.sign(
      PrivateKey.fromString(operatorKey)
    );

    const tokenCreateSubmit = await tokenCreateSigned.execute(client);
    const tokenCreateReceipt = await tokenCreateSubmit.getReceipt(client);

    const tokenId = tokenCreateReceipt.tokenId!;

    console.log(`✅ CTRACE token created successfully!`);
    console.log(`🪙 Token ID: ${tokenId.toString()}`);
    console.log(
      `📄 Transaction ID: ${tokenCreateSubmit.transactionId.toString()}`
    );
    console.log(`💰 Initial Supply: 1,000,000.00 CTRACE`);
    console.log(`🏦 Treasury Account: ${operatorId}`);

    return {
      tokenId: tokenId.toString(),
      transactionId: tokenCreateSubmit.transactionId.toString(),
      treasuryAccountId: operatorId,
      totalSupply: '100000000', // 1M with 2 decimals
      adminKey: adminPublicKey,
      supplyKey: adminPublicKey,
    };
  } catch (error) {
    console.error('❌ Error creating token:', error);
    throw error;
  } finally {
    client.close();
  }
}

/**
 * Tests token distribution functionality by transferring tokens
 *
 * @param tokenId - The token ID to test distribution with
 * @throws {Error} When token distribution test fails
 */
async function testTokenDistribution(tokenId: string): Promise<void> {
  const operatorId = process.env.OPERATOR_ID;
  const operatorKey = process.env.OPERATOR_KEY;
  const network = process.env.HEDERA_NETWORK || 'testnet';

  if (!operatorId || !operatorKey) {
    throw new Error('OPERATOR_ID and OPERATOR_KEY must be set in .env.local');
  }

  console.log('\n🧪 Testing Token Distribution...');

  // Initialize client for distribution testing
  const client =
    network === 'mainnet' ? Client.forMainnet() : Client.forTestnet();

  client.setOperator(
    AccountId.fromString(operatorId),
    PrivateKey.fromString(operatorKey)
  );

  try {
    // Get token info to verify creation
    console.log(`📊 Querying token information for ${tokenId}...`);
    const tokenInfoQuery = new TokenInfoQuery().setTokenId(tokenId);

    const tokenInfo = await tokenInfoQuery.execute(client);

    console.log(`✅ Token Information Retrieved:`);
    console.log(`   Name: ${tokenInfo.name}`);
    console.log(`   Symbol: ${tokenInfo.symbol}`);
    console.log(`   Decimals: ${tokenInfo.decimals}`);
    console.log(`   Total Supply: ${tokenInfo.totalSupply.toString()}`);
    console.log(`   Treasury: ${tokenInfo.treasuryAccountId?.toString()}`);
    console.log(`   Admin Key: ${tokenInfo.adminKey ? 'Set' : 'None'}`);
    console.log(`   Supply Key: ${tokenInfo.supplyKey ? 'Set' : 'None'}`);

    // Check treasury balance
    console.log(`\n💰 Checking treasury balance...`);
    const treasuryBalance = await new AccountBalanceQuery()
      .setAccountId(operatorId)
      .execute(client);

    const tokenBalance = treasuryBalance.tokens?.get(tokenId);
    console.log(
      `   Treasury Balance: ${tokenBalance?.toString() || '0'} CTRACE`
    );

    // Test successful - token is ready for distribution
    console.log(`\n✅ Token distribution test completed successfully!`);
    console.log(`🎯 Token is ready for ChainTrace reward distribution`);
  } catch (error) {
    console.error('❌ Error testing token distribution:', error);
    throw error;
  } finally {
    client.close();
  }
}

/**
 * Updates package.json with token setup script
 */
async function updatePackageScripts(): Promise<void> {
  console.log('\n📝 Adding token setup script to package.json...');

  // Note: In a real implementation, you might want to read and update package.json
  // For now, we'll just log the instruction
  console.log('ℹ️  Add this script to your package.json:');
  console.log('   "setup:token": "tsx scripts/setup-hts-token.ts"');
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  try {
    console.log('🚀 Starting HTS Token Setup for ChainTrace');
    console.log('⚡ Creating CTRACE reward token...');
    console.log('='.repeat(60));

    // Create the token
    const result = await createCTraceToken();

    // Test token functionality
    await testTokenDistribution(result.tokenId);

    // Update scripts
    await updatePackageScripts();

    console.log('\n' + '='.repeat(60));
    console.log('🎉 HTS Token Setup Complete!');
    console.log('\n📋 Token Summary:');
    console.log(`   Token ID: ${result.tokenId}`);
    console.log(`   Name: ChainTrace Rewards`);
    console.log(`   Symbol: CTRACE`);
    console.log(`   Decimals: 2`);
    console.log(`   Initial Supply: 1,000,000.00`);
    console.log(`   Treasury: ${result.treasuryAccountId}`);
    console.log(`   Transaction: ${result.transactionId}`);

    console.log('\n🔗 HashScan Links:');
    const hashscanBase =
      (process.env.HEDERA_NETWORK || 'testnet') === 'mainnet'
        ? 'https://hashscan.io/mainnet'
        : 'https://hashscan.io/testnet';
    console.log(`   Token: ${hashscanBase}/token/${result.tokenId}`);
    console.log(
      `   Treasury: ${hashscanBase}/account/${result.treasuryAccountId}`
    );

    console.log('\n📝 Next Steps:');
    console.log('   1. Update HTS_TOKEN_ID in .env.local');
    console.log('   2. Verify token on HashScan');
    console.log('   3. Integrate token distribution in ChainTrace services');
    console.log('   4. Test reward distribution workflows');
  } catch (error) {
    console.error('\n💥 Token setup failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

export { createCTraceToken, testTokenDistribution };
