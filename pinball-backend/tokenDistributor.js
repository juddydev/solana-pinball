const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { Program, AnchorProvider, Wallet, BN } = require('@project-serum/anchor');
const { TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount } = require('@solana/spl-token');

const idl = require('./pinball_rewards.json');
const keypairFile = require('./token.json');

require('dotenv').config();

class TokenDistributor {
    constructor() {
        // Connect to Solana and initialize program
        this.connection = new Connection(process.env.SOLANA_RPC_URL, 'confirmed');

        const keypair = Keypair.fromSecretKey(new Uint8Array(keypairFile));
        this.wallet = new Wallet(keypair);

        this.provider = new AnchorProvider(
            this.connection,
            this.wallet,
            { commitment: 'confirmed' }
        );

        this.programId = new PublicKey(process.env.PROGRAM_ID);
        this.program = new Program(idl, this.programId, this.provider);

        this.tokenMint = new PublicKey(process.env.TOKEN_MINT_ADDRESS);
        this.treasuryAccount = new PublicKey(process.env.TREASURY_ACCOUNT);

        // Constants for reward calculation
        this.LIQUIDITY_POOL = 5000;          // $5000 liquidity pool
        this.TOTAL_REWARD_POOL = 1500;       // 30% of total supply ($1500)
        this.DAILY_REWARD_POOL = 150;        // 10% of reward pool daily ($150)

        // Rank percentages
        this.RANK_REWARDS = {
            1: 0.40,    // Rank 1: 40% → $60
            2: 0.25,    // Rank 2: 25% → $37.5
            3: 0.15,    // Rank 3: 15% → $22.5
            4: 0.10,    // Rank 4-10: 10% → $15 
            11: 0.07,   // Rank 11-25: 7% → $10.5 
            26: 0.03    // Rank 26-50: 3% → $4.5 
        };
    }

    /**
     * Calculate rewards for players and return a simple array
     * @param {Array} players - Array of players from database
     * @returns {Array} Array of {wallet_address, amount_reward}
     */
    calculateRewards(players) {
        try {
            // Sort players by score to determine rank
            const totalTokens = players.reduce((sum, player) => sum + (player.tokenBalance || 0), 0);

            // Final result array
            const rewards = [];

            players.forEach((player, index) => {
                const rank = index + 1;
                if (rank > 50) return; // Only consider top 50

                // Calculate base reward based on rank
                let baseReward = 0;
                if (rank === 1) baseReward = this.DAILY_REWARD_POOL * this.RANK_REWARDS[1];
                else if (rank === 2) baseReward = this.DAILY_REWARD_POOL * this.RANK_REWARDS[2];
                else if (rank === 3) baseReward = this.DAILY_REWARD_POOL * this.RANK_REWARDS[3];
                else if (rank <= 10) baseReward = (this.DAILY_REWARD_POOL * this.RANK_REWARDS[4]) / 7;
                else if (rank <= 25) baseReward = (this.DAILY_REWARD_POOL * this.RANK_REWARDS[11]) / 15;
                else if (rank <= 50) baseReward = (this.DAILY_REWARD_POOL * this.RANK_REWARDS[26]) / 25;

                // Calculate token weight based on tokens held
                const tokenWeight = totalTokens > 0 ? player.tokenBalance / totalTokens : 0;

                // Calculate final reward based on base reward and token weight
                const finalReward = baseReward * tokenWeight;

                if (finalReward > 0) {
                    rewards.push({
                        wallet_address: player.address,
                        amount_reward: finalReward
                    });
                }
            });

            return rewards;

        } catch (error) {
            console.error('Error calculating rewards:', error);
            throw error;
        }
    }

    /**
     * Send reward to a player
     * @param {string} wallet_address - Player's wallet address
     * @param {number} amount_reward - Token reward amount
     */
    async sendReward(wallet_address, amount_reward) {
        try {
            const receiverPublicKey = new PublicKey(wallet_address);
            const amountInLamports = new BN(Math.floor(amount_reward * 1e9));

            const receiverTokenAccount = await getOrCreateAssociatedTokenAccount(
                this.connection,
                this.wallet.payer,
                this.tokenMint,
                receiverPublicKey
            );

            const tx = await this.program.methods
                .distributeRewards(amountInLamports)
                .accounts({
                    authority: this.wallet.publicKey,
                    treasury: this.treasuryAccount,
                    receiver: receiverTokenAccount.address,
                    token_program: TOKEN_PROGRAM_ID
                })
                .remainingAccounts([
                    {
                        pubkey: this.treasuryAccount,
                        isWritable: true,
                        isSigner: false
                    },
                    {
                        pubkey: receiverTokenAccount.address,
                        isWritable: true,
                        isSigner: false
                    }
                ])
                .signers([this.wallet.payer])
                .rpc();

            await this.connection.confirmTransaction(tx, {
                strategy: 'confirmed',
                commitment: 'confirmed'
            });
            return { success: true, tx };

        } catch (error) {
            console.error(`Failed to send reward to ${wallet_address}:`, error);
            throw error;
        }
    }

    /**
     * Distribute rewards to all players
     * @param {Array} players - Array of players from database
     */
    async distributeRewards(players) {
        const results = {
            successful: [],
            failed: []
        };

        try {
            // Calculate rewards for all players
            const rewards = this.calculateRewards(players);
            console.log(`Calculated rewards for ${rewards.length} players`);

            // Send rewards to each player sequentially
            for (const reward of rewards) {
                try {
                    const { tx } = await this.sendReward(reward.wallet_address, reward.amount_reward);
                    results.successful.push({
                        wallet_address: reward.wallet_address,
                        amount_reward: reward.amount_reward,
                        transaction_signature: tx
                    });
                    console.log(`Successfully sent ${reward.amount_reward} tokens to ${reward.wallet_address}`);
                } catch (error) {
                    results.failed.push({
                        wallet_address: reward.wallet_address,
                        amount_reward: reward.amount_reward,
                        error: error.message
                    });
                }
            }

            return {
                success: true,
                total_distributed: results.successful.length,
                total_failed: results.failed.length,
                results
            };

        } catch (error) {
            console.error('Distribution process failed:', error);
            throw error;
        }
    }

    /**
     * Get the token balance of a wallet
     * @param {string} walletAddress - The wallet address to check
     * @returns {Promise<number>} Token amount (converted from lamports)
     */
    async getTokenBalance(walletAddress) {
        try {
            const walletPublicKey = new PublicKey(walletAddress);

            const tokenAccount = await getOrCreateAssociatedTokenAccount(
                this.connection,
                this.wallet.payer,
                this.tokenMint,
                walletPublicKey
            );

            const balance = await this.connection.getTokenAccountBalance(tokenAccount.address);

            const actualBalance = balance.value.uiAmount;

            return {
                success: true,
                wallet_address: walletAddress,
                token_account: tokenAccount.address.toString(),
                balance: actualBalance,
                decimals: balance.value.decimals
            };

        } catch (error) {
            console.error(`Error getting token balance for ${walletAddress}:`, error);
            return {
                success: false,
                wallet_address: walletAddress,
                error: error.message
            };
        }
    }
}

module.exports = TokenDistributor;
