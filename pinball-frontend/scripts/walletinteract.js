"use strict";

const connectButton = document.getElementById("connectButton");

if (window.solana && window.solana.isPhantom) {
  console.log("Phantom wallet detected");
} else {
  console.log("Phantom wallet not detected");
}

connectButton.addEventListener("click", async () => {
  try {
    const resp = await window.solana.connect();
    const publicKey = resp.publicKey.toString();

    // Format the address (first 4 and last 4 characters)
    const shortAddress = `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`;

    // Update the button text with the short address
    connectButton.textContent = shortAddress;

    console.log("Connected to Phantom Wallet:", publicKey);
  } catch (err) {
    console.error("Failed to connect to Phantom Wallet:", err);
  }
});
