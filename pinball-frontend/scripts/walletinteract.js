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

    const walletDropdown = document.getElementById('walletDropdown');
    const disconnectButton = document.getElementById('disconnectButton');

    connectButton.addEventListener('click', async () => {
        if (!isWalletConnected) {
            try {
                // Logic connect wallet hiện tại của bạn
                await window.solana.connect();
                isWalletConnected = true;
                // Get wallet public key and display shortened address
                const publicKey = window.solana.publicKey.toString();
                const shortenedAddress = publicKey.slice(0, 4) + '...' + publicKey.slice(-4);
                connectButton.textContent = shortenedAddress;
            } catch (error) {
                console.error('Error connecting wallet:', error);
            }
        } else {
            // Toggle dropdown menu ngay lập tức khi đã connected
            walletDropdown.classList.toggle('show');
        }
    });

    window.addEventListener('load', async () => {
        try {
            if (window.solana && window.solana.isConnected) {
                isWalletConnected = true;
                connectButton.textContent = 'Connected';
            }
        } catch (error) {
            console.error('Error checking wallet connection:', error);
        }
    });

    disconnectButton.addEventListener('click', async () => {
        try {
            await window.solana.disconnect();
            isWalletConnected = false;
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

    // Fetch SOL Balance
    async function fetchSolBalance(publicKey) {
        try {
            const balance = await connection.getBalance(new PublicKey(publicKey));
            const solAmount = (balance / 1e9).toFixed(3); // Convert lamports to SOL

            console.log(`💰 SOL Balance: ${solAmount} SOL`);
        } catch (err) {
            console.error("❌ Failed to fetch SOL balance:", err);
        }
    }
});
