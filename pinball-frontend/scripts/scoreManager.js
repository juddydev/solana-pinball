"use strict";

(function initScoreManager() {
    const BACKEND_URL = 'http://localhost:5000';
    const TOKEN_MINT_ADDRESS = '6ALrw1kJZZqN8witRNFYxNYJtReCrf9dCiu35xW474AT';
    // Hàm helper để lấy token balance
    async function getTokenBalance(walletAddress) {
        try {
            const connection = new solanaWeb3.Connection(
                'https://api.devnet.solana.com',
                'confirmed'
            );

            console.log("CONNECTION", connection);

            // Lấy token accounts của ví
            const walletTokenAccounts = await connection.getParsedTokenAccountsByOwner(
                new solanaWeb3.PublicKey(walletAddress),
                {
                    mint: new solanaWeb3.PublicKey(TOKEN_MINT_ADDRESS)
                }
            );

            // Kiểm tra và lấy số dư token
            if (walletTokenAccounts && walletTokenAccounts.value && walletTokenAccounts.value.length > 0) {
                const walletTokenAccount = walletTokenAccounts.value[0];
                const amount = walletTokenAccount.account.data.parsed.info.tokenAmount.uiAmount;
                console.log(`Token amount: ${amount}`);
                return amount;
            }

            console.log("No token account found, balance is 0");
            return 0;
        } catch (error) {
            console.error('Error fetching token balance:', error);
            return 0;
        }
    }

    // Gắn vào window object để có thể truy cập từ mọi nơi
    window.gameScoreManager = {
        async storeScore(walletAddress, score) {
            try {
                console.log("🔍 Fetching token balance...");
                const tokenBalance = await getTokenBalance(walletAddress);
                console.log("💰 Token balance:", tokenBalance);

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

        // Hàm lấy bảng xếp hạng
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

        // Tiện ích: Rút gọn địa chỉ ví
        shortenAddress(address) {
            return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
        },

        // Tiện ích: Tạo icon huy chương theo rank
        getMedalIcon(rank) {
            switch (rank) {
                case 0: return '<i class="fas fa-medal" style="color: gold;"></i>';
                case 1: return '<i class="fas fa-medal" style="color: silver;"></i>';
                case 2: return '<i class="fas fa-medal" style="color: #CD7F32;"></i>';
                default: return `${rank + 1}`;
            }
        },

        // Tiện ích: Tạo stars dựa vào điểm số
        getStars(score) {
            const maxScore = 3000;
            const starCount = Math.min(5, Math.ceil((score / maxScore) * 5));
            let stars = '';
            for (let i = 0; i < 5; i++) {
                if (i < starCount) {
                    stars += '<i class="fas fa-star" style="color: gold;"></i>';
                } else {
                    stars += '<i class="far fa-star" style="color: #666;"></i>';
                }
            }
            return stars;
        },
    };

    // Log để xác nhận đã khởi tạo
    console.log("🎮 Score Manager initialized:", window.gameScoreManager);
})(); 