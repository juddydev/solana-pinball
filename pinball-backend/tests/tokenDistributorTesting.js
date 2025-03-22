const TokenDistributor = require('../tokenDistributor');
require('dotenv').config();

async function testTokenDistributor() {
  console.log('Starting TokenDistributor test...');
  
  // Initialize TokenDistributor
  const tokenDistributor = new TokenDistributor();
  console.log('TokenDistributor initialized');
  
  // List of wallet addresses to check
  //   You can add your actual wallet (devnet) addresses here
  const walletAddresses = [
    'AW1cD4aBC8VKZdH2AiobwjYCgjFUt2f6xhvHhqZ8DGQW',
    '8fekyE3Y2cZMm2N3mngJqoDpaE5kK2VYEdhwaRmM3aTd',
    'ERgMxJaKnuekgBZbJvyKMBiPyNQzk3nppKrDQSYU7spx'
  ];
  
  try {
    // 1. Get actual token balance for each wallet
    console.log('\n=== CHECKING INITIAL TOKEN BALANCES ===');
    const mockPlayers = [];
    
    for (let i = 0; i < walletAddresses.length; i++) {
      const walletAddress = walletAddresses[i];
      try {
        console.log(`Checking balance for wallet: ${walletAddress}`);
        const balanceInfo = await tokenDistributor.getTokenBalance(walletAddress);
        
        if (balanceInfo.success) {
          console.log(`  Current balance: ${balanceInfo.balance} tokens`);
          
          // Create mock player with actual token balance
          mockPlayers.push({
            address: walletAddress,
            score: 1000 - (i * 100), // Simulate decreasing scores
            tokenBalance: balanceInfo.balance
          });
        } else {
          console.log(`  Failed to get balance: ${balanceInfo.error}`);
          // Add with tokenBalance = 0 if balance can't be retrieved
          mockPlayers.push({
            address: walletAddress,
            score: 1000 - (i * 100),
            tokenBalance: 0
          });
        }
      } catch (error) {
        console.log(`  Error checking balance: ${error.message}`);
        // Add with tokenBalance = 0 in case of error
        mockPlayers.push({
          address: walletAddress,
          score: 1000 - (i * 100),
          tokenBalance: 0
        });
      }
    }
    
    console.log('\nMock players created with real token balances:');
    console.table(mockPlayers.map(p => ({
      address: p.address,
      score: p.score,
      tokenBalance: p.tokenBalance
    })));
    
    // 2. Calculate rewards
    console.log('\n=== CALCULATING REWARDS ===');
    const calculatedRewards = await tokenDistributor.calculateRewards(mockPlayers);
    
    console.table(calculatedRewards.map((reward, index) => ({
      Player: index + 1,
      Wallet: reward.wallet_address,
      'Reward Amount': `${reward.amount_reward} tokens`
    })));
    
    // 3. Distribute rewards
    console.log('\n=== DISTRIBUTING REWARDS ===');
    console.log('Starting distribution process...');
    
    const distributionResult = await tokenDistributor.distributeRewards(mockPlayers);
    
    console.log('\nDistribution results:');
    console.log(`Total successful transfers: ${distributionResult.total_distributed}`);
    console.log(`Total failed transfers: ${distributionResult.total_failed}`);
    
    if (distributionResult.results.successful.length > 0) {
      console.log('\nSuccessful transfers:');
      distributionResult.results.successful.forEach((result, index) => {
        console.log(`${index + 1}. Wallet: ${result.wallet_address}`);
        console.log(`   Amount: ${result.amount_reward} tokens`);
        console.log(`   Transaction signature: ${result.transaction_signature}`);
      });
    }
    
    if (distributionResult.results.failed.length > 0) {
      console.log('\nFailed transfers:');
      distributionResult.results.failed.forEach((result, index) => {
        console.log(`${index + 1}. Wallet: ${result.wallet_address}`);
        console.log(`   Amount: ${result.amount_reward} tokens`);
        console.log(`   Error: ${result.error}`);
      });
    }
    
    // 4. Check token balances after transfers
    console.log('\n=== CHECKING UPDATED TOKEN BALANCES ===');
    for (const player of mockPlayers) {
      try {
        console.log(`Checking updated balance for wallet: ${player.address}`);
        const balanceInfo = await tokenDistributor.getTokenBalance(player.address);
        if (balanceInfo.success) {
          console.log(`  New balance: ${balanceInfo.balance} tokens`);
          console.log(`  Difference: ${balanceInfo.balance - player.tokenBalance} tokens`);
        } else {
          console.log(`  Failed to get balance: ${balanceInfo.error}`);
        }
      } catch (error) {
        console.log(`  Error checking balance: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testTokenDistributor()
  .then(() => console.log('Test completed'))
  .catch(err => console.error('Test failed:', err));
