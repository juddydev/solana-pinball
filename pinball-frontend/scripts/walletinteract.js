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

    // Connect to Phantom Wallet
    connectButton.addEventListener("click", async () => {
        try {
            const resp = await window.solana.connect();
            const publicKey = resp.publicKey.toString();

            // Shorten the address for display
            const shortAddress = `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`;
            connectButton.textContent = shortAddress;

            console.log("✅ Connected to Phantom Wallet:", publicKey);

            // Fetch and display SOL balance
            await fetchSolBalance(publicKey);
        } catch (err) {
            console.error("❌ Failed to connect to Phantom Wallet:", err);
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
