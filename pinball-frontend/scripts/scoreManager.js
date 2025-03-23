"use strict";

(function initScoreManager() {
    const BACKEND_URL = 'http://localhost:5000';
    const TOKEN_MINT_ADDRESS = '6ALrw1kJZZqN8witRNFYxNYJtReCrf9dCiu35xW474AT';
    
    // Helper function to get token balance
    async function getTokenBalance(walletAddress) {
        try {
            const connection = new solanaWeb3.Connection(
                'https://api.devnet.solana.com',
                'confirmed'
            );

            // Get token accounts for the wallet
            const walletTokenAccounts = await connection.getParsedTokenAccountsByOwner(
                new solanaWeb3.PublicKey(walletAddress),
                {
                    mint: new solanaWeb3.PublicKey(TOKEN_MINT_ADDRESS)
                }
            );

            // Check and retrieve token balance
            if (walletTokenAccounts && walletTokenAccounts.value && walletTokenAccounts.value.length > 0) {
                const walletTokenAccount = walletTokenAccounts.value[0];
                const amount = walletTokenAccount.account.data.parsed.info.tokenAmount.uiAmount;
                console.log(`💰 Token amount: ${amount}`);
                return amount;
            }

            console.log("⚠️ No token account found, balance is 0");
            return 0;
        } catch (error) {
            console.error('❌ Error fetching token balance:', error);
            return 0;
        }
    }

    // Attach to window object to access from anywhere
    window.gameScoreManager = {
        // Expose getTokenBalance as a public method
        getTokenBalance: getTokenBalance,
        
        async storeScore(walletAddress, score) {
            try {
                const tokenBalance = await getTokenBalance(walletAddress);

                console.log("📤 Sending score and token balance to backend...");
                const response = await fetch(`${BACKEND_URL}/update-score`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        address: walletAddress,
                        score: score,
                        tokenBalance: tokenBalance
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log('✅ Score and token balance stored successfully:', data);
                return data;
            } catch (error) {
                console.error('❌ Error storing score and token balance:', error);
                throw error;
            }
        },

        // Function to get leaderboard
        async getLeaderboard() {
            try {
                const response = await fetch(`${BACKEND_URL}/leaderboard`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return await response.json();
            } catch (error) {
                console.error('❌ Error fetching leaderboard:', error);
                throw error;
            }
        },

        // Utility: Shorten wallet address
        shortenAddress(address) {
            return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
        },

        // Utility: Create medal icon based on rank
        getMedalIcon(rank) {
            switch (rank) {
                case 0: return '<i class="fas fa-medal" style="color: gold;"></i>';
                case 1: return '<i class="fas fa-medal" style="color: silver;"></i>';
                case 2: return '<i class="fas fa-medal" style="color: #CD7F32;"></i>';
                default: return `${rank + 1}`;
            }
        },
    };

    // Log to confirm initialization
    console.log("🎮 Score Manager initialized:", window.gameScoreManager);
})(); 