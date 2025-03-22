"use strict";

// Wait for the DOM to load
document.addEventListener("DOMContentLoaded", async () => {
    const connectButton = document.getElementById("connectButton");

    // Check if Phantom Wallet is available
    if (window.solana && window.solana.isPhantom) {
        console.log("✅ Phantom wallet detected");
    } else {
        console.warn("⚠️ Phantom wallet not detected. Please install it.");
        connectButton.textContent = "Install Phantom";
        connectButton.addEventListener("click", () => {
            window.open("https://phantom.app/", "_blank");
        });
        return;
    }

    // Import Solana Web3.js
    const { Connection, PublicKey } = window.solanaWeb3 || window["@solana/web3.js"] || window.solanaWeb3?.default || {};

    if (!Connection || !PublicKey) {
        console.error("❌ Solana Web3.js is not loaded. Please check the script import.");
        return;
    }

    // ✅ Use a dedicated Solana RPC provider
    const RPC_URL = "https://solana-mainnet.g.alchemy.com/v2/LTZ3ivz7ekePzZFhbN_M60_10XzQGpWE"; // Replace with your actual RPC URL
    const connection = new Connection(RPC_URL, "confirmed");

    let isWalletConnected = false;
    let tokenBalance = 0;

    const walletDropdown = document.getElementById('walletDropdown');
    const disconnectButton = document.getElementById('disconnectButton');

    // Helper function to show purchase modal
    function showPurchaseModal(walletAddress) {
        if (document.getElementById('tokenPurchaseModal')) {
            document.getElementById('tokenPurchaseModal').style.display = 'flex';
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'tokenPurchaseModal';
        modal.className = 'token-purchase-modal';
        modal.innerHTML = `
            <div class="token-purchase-content">
                <h2>You need tokens to earn rewards!</h2>
                <p>You currently have 0 tokens. Purchase tokens to be eligible for game rewards.</p>
                <div class="wallet-address">Wallet: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}</div>
                <div class="token-purchase-buttons">
                    <button id="buyTokensBtn" class="primary-btn">Buy Tokens</button>
                    <button id="closeModalBtn" class="secondary-btn">Play Without Rewards</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('buyTokensBtn').addEventListener('click', () => {
            // Redirect to token purchase page
            window.open('https://solscan.io/blocks', '_blank');
            modal.style.display = 'none';
        });
        
        document.getElementById('closeModalBtn').addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    // Check token balance and show purchase modal if needed
    async function checkTokenAndShowPrompt() {
        if (!isWalletConnected || !window.solana.publicKey) {
            return;
        }

        const walletAddress = window.solana.publicKey.toString();
        
        try {
            if (window.gameScoreManager && window.gameScoreManager.getTokenBalance) {
                tokenBalance = await window.gameScoreManager.getTokenBalance(walletAddress);
                console.log(`Token balance: ${tokenBalance}`);
                
                if (tokenBalance <= 0) {
                    console.log("No tokens found, showing purchase prompt");
                    showPurchaseModal(walletAddress);
                } else {
                    console.log(`User has ${tokenBalance} tokens, eligible for rewards`);
                }
            } else {
                console.error("gameScoreManager.getTokenBalance is not available");
            }
        } catch (error) {
            console.error("Error checking token balance:", error);
        }
    }

    connectButton.addEventListener('click', async () => {
        if (!isWalletConnected) {
            try {
                await window.solana.connect();
                isWalletConnected = true;
                // Get wallet public key and display shortened address
                const publicKey = window.solana.publicKey.toString();
                const shortenedAddress = publicKey.slice(0, 4) + '...' + publicKey.slice(-4);
                connectButton.textContent = shortenedAddress;
                
                // Check token balance after successful connection
                await checkTokenAndShowPrompt();
            } catch (error) {
                console.error('Error connecting wallet:', error);
            }
        } else {
            walletDropdown.classList.toggle('show');
        }
    });

    window.addEventListener('load', async () => {
        try {
            if (window.solana && window.solana.isConnected) {
                isWalletConnected = true;
                const publicKey = window.solana.publicKey.toString();
                const shortenedAddress = publicKey.slice(0, 4) + '...' + publicKey.slice(-4);
                connectButton.textContent = shortenedAddress;
                
                // Check token balance on page load if wallet is already connected
                await checkTokenAndShowPrompt();
            }
        } catch (error) {
            console.error('Error checking wallet connection:', error);
        }
    });

    disconnectButton.addEventListener('click', async () => {
        try {
            await window.solana.disconnect();
            isWalletConnected = false;
            tokenBalance = 0;
            connectButton.textContent = 'Connect Wallet';
            walletDropdown.classList.remove('show');
            console.log("✅ Disconnected from wallet");
        } catch (error) {
            console.error('Error disconnecting wallet:', error);
        }
    });

    window.addEventListener('click', (event) => {
        if (!event.target.matches('#connectButton')) {
            if (walletDropdown && walletDropdown.classList.contains('show')) {
                walletDropdown.classList.remove('show');
            }
        }
    });
});
