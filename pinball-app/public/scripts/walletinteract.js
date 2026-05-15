"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const connectButton = document.getElementById("connectButton");
  const walletDropdown = document.getElementById("walletDropdown");
  const disconnectButton = document.getElementById("disconnectButton");
  const walletPickerModal = document.getElementById("walletPickerModal");
  const walletPickerList = document.getElementById("walletPickerList");
  const walletPickerClose = document.getElementById("walletPickerClose");

  if (!window.pinballWallet) {
    console.error("walletManager.js must load before walletinteract.js");
    return;
  }

  let isWalletConnected = false;

  function shortenAddress(address) {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }

  function setConnectedUI(address, walletName) {
    isWalletConnected = true;
    connectButton.textContent = shortenAddress(address);
    connectButton.title = walletName ? `Connected via ${walletName}` : address;
  }

  function setDisconnectedUI() {
    isWalletConnected = false;
    connectButton.textContent = "Connect Wallet";
    connectButton.title = "";
    walletDropdown?.classList.remove("show");
  }

  function openWalletPicker() {
    if (!walletPickerModal || !walletPickerList) return;

    const wallets = window.pinballWallet.getAllWallets();
    walletPickerList.innerHTML = wallets
      .map((wallet) => {
        const status = wallet.statusHint || (wallet.installed ? "Installed" : "Get wallet");
        const action = wallet.installed
          ? `data-wallet-id="${wallet.id}"`
          : `data-download-url="${wallet.downloadUrl}"`;
        return `
          <button type="button" class="wallet-picker-item" ${action}>
            <span class="wallet-picker-name">${wallet.name}</span>
            <span class="wallet-picker-status">${status}</span>
          </button>
        `;
      })
      .join("");

    walletPickerModal.classList.add("show");
    walletPickerModal.setAttribute("aria-hidden", "false");
  }

  function closeWalletPicker() {
    if (!walletPickerModal) return;
    walletPickerModal.classList.remove("show");
    walletPickerModal.setAttribute("aria-hidden", "true");
  }

  function showPurchaseModal(walletAddress) {
    let modal = document.getElementById("tokenPurchaseModal");
    if (modal) {
      modal.style.display = "flex";
      return;
    }

    modal = document.createElement("div");
    modal.id = "tokenPurchaseModal";
    modal.className = "token-purchase-modal";
    modal.innerHTML =
      '<div class="token-purchase-content">' +
      "<h2>You need tokens to earn rewards!</h2>" +
      "<p>You currently have 0 tokens. Purchase tokens to be eligible for game rewards.</p>" +
      '<div class="wallet-address">Wallet: ' +
      walletAddress.slice(0, 6) +
      "..." +
      walletAddress.slice(-4) +
      "</div>" +
      '<div class="token-purchase-buttons">' +
      '<button id="buyTokensBtn" class="primary-btn">Buy Tokens</button>' +
      '<button id="closeModalBtn" class="secondary-btn">Play Without Rewards</button>' +
      "</div></div>";
    document.body.appendChild(modal);

    document.getElementById("buyTokensBtn").addEventListener("click", () => {
      window.open("https://solscan.io/blocks", "_blank", "noopener,noreferrer");
      modal.style.display = "none";
    });

    document.getElementById("closeModalBtn").addEventListener("click", () => {
      modal.style.display = "none";
    });
  }

  async function checkTokenAndShowPrompt() {
    const address = window.pinballWallet.getAddress();
    if (!isWalletConnected || !address) return;

    try {
      if (window.gameScoreManager?.getTokenBalance) {
        const tokenBalance = await window.gameScoreManager.getTokenBalance(address);
        if (tokenBalance <= 0) {
          showPurchaseModal(address);
        }
      }
    } catch (error) {
      console.error("Error checking token balance:", error);
    }
  }

  walletPickerList?.addEventListener("click", async (event) => {
    const item = event.target.closest(".wallet-picker-item");
    if (!item) return;

    const downloadUrl = item.getAttribute("data-download-url");
    if (downloadUrl) {
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
      return;
    }

    const walletId = item.getAttribute("data-wallet-id");
    if (!walletId) return;

    closeWalletPicker();

    const itemStatus = item.querySelector(".wallet-picker-status")?.textContent;
    item.disabled = true;

    try {
      const { address } = await window.pinballWallet.connect(walletId);
      if (!address) {
        throw new Error("No wallet address returned");
      }
      setConnectedUI(address, window.pinballWallet.getWalletName());
      await checkTokenAndShowPrompt();
    } catch (error) {
      if (error?.message?.includes("not installed")) return;
      console.error("Error connecting wallet:", error);
      const msg = error?.message || "Could not connect wallet. Please try again.";
      if (!msg.includes("cancelled")) {
        alert(msg);
      }
    } finally {
      item.disabled = false;
      if (itemStatus) {
        item.querySelector(".wallet-picker-status").textContent = itemStatus;
      }
    }
  });

  walletPickerClose?.addEventListener("click", closeWalletPicker);

  walletPickerModal?.addEventListener("click", (event) => {
    if (event.target === walletPickerModal) closeWalletPicker();
  });

  connectButton.addEventListener("click", () => {
    if (!isWalletConnected) {
      openWalletPicker();
      return;
    }
    walletDropdown?.classList.toggle("show");
  });

  disconnectButton?.addEventListener("click", async () => {
    try {
      await window.pinballWallet.disconnect();
      setDisconnectedUI();
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
    }
  });

  window.addEventListener("click", (event) => {
    if (!event.target.matches("#connectButton") && walletDropdown?.classList.contains("show")) {
      walletDropdown.classList.remove("show");
    }
  });

  window.pinballWallet.on("accountChanged", ({ address }) => {
    if (address) {
      setConnectedUI(address, window.pinballWallet.getWalletName());
    } else {
      setDisconnectedUI();
    }
  });

  window.pinballWallet.on("disconnect", setDisconnectedUI);

  try {
    const restored = await window.pinballWallet.tryRestoreSession();
    if (restored?.address) {
      setConnectedUI(restored.address, window.pinballWallet.getWalletName());
      await checkTokenAndShowPrompt();
    }
  } catch (error) {
    console.error("Error restoring wallet session:", error);
  }
});
