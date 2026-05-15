"use strict";

(function initPinballWallet() {
  const METAMASK_SOLANA_SNAP_ID = "npm:@metamask/solana-wallet-snap";

  function getMetaMaskEthereum() {
    const eth = window.ethereum;
    if (!eth) return null;
    if (eth.isMetaMask) return eth;
    return eth.providers?.find((p) => p.isMetaMask) || null;
  }

  function isMetaMaskExtensionInstalled() {
    return Boolean(getMetaMaskEthereum());
  }

  function getMetaMaskSolanaSync() {
    const mm = getMetaMaskEthereum();
    if (!mm) return window.metamask?.solana || null;
    if (mm.solana) return mm.solana;
    return window.metamask?.solana || null;
  }

  async function resolveMetaMaskSolanaProvider() {
    const mm = getMetaMaskEthereum();
    if (!mm) return null;

    if (mm.solana) return mm.solana;

    try {
      await mm.request({
        method: "wallet_requestSnaps",
        params: { [METAMASK_SOLANA_SNAP_ID]: {} },
      });
    } catch (err) {
      console.warn("MetaMask Solana snap:", err?.message || err);
    }

    if (mm.solana) return mm.solana;

    await new Promise((r) => setTimeout(r, 400));
    return mm.solana || window.metamask?.solana || null;
  }

  const WALLET_REGISTRY = [
    {
      id: "metamask",
      name: "MetaMask",
      getProvider: getMetaMaskSolanaSync,
      resolveProvider: resolveMetaMaskSolanaProvider,
      isInstalled: isMetaMaskExtensionInstalled,
      downloadUrl: "https://metamask.io/download/",
    },
    {
      id: "phantom",
      name: "Phantom",
      getProvider: () => window.phantom?.solana ?? null,
      isInstalled: () => Boolean(window.phantom?.solana),
      downloadUrl: "https://phantom.app/download",
    },
    {
      id: "solflare",
      name: "Solflare",
      getProvider: () => window.solflare ?? null,
      isInstalled: () => Boolean(window.solflare),
      downloadUrl: "https://solflare.com/download",
    },
    {
      id: "trust",
      name: "Trust Wallet",
      getProvider: () => {
        if (window.trustwallet?.solana) return window.trustwallet.solana;
        if (window.trustWallet?.solana) return window.trustWallet.solana;
        const s = window.solana;
        if (s && (s.isTrust || s.isTrustWallet)) return s;
        return null;
      },
      isInstalled: () =>
        Boolean(
          window.trustwallet?.solana ||
            window.trustWallet?.solana ||
            window.solana?.isTrust ||
            window.solana?.isTrustWallet
        ),
      downloadUrl: "https://trustwallet.com/download",
    },
    {
      id: "backpack",
      name: "Backpack",
      getProvider: () => window.backpack ?? null,
      isInstalled: () => Boolean(window.backpack),
      downloadUrl: "https://backpack.app/download",
    },
    {
      id: "coinbase",
      name: "Coinbase Wallet",
      getProvider: () => window.coinbaseSolana || window.coinbaseWalletExtension || null,
      isInstalled: () => Boolean(window.coinbaseSolana || window.coinbaseWalletExtension),
      downloadUrl: "https://www.coinbase.com/wallet/downloads",
    },
    {
      id: "glow",
      name: "Glow",
      getProvider: () => window.glow ?? null,
      isInstalled: () => Boolean(window.glow),
      downloadUrl: "https://glow.app/",
    },
  ];

  let activeWalletId = null;
  let activeProvider = null;
  const listeners = { connect: [], disconnect: [], accountChanged: [] };

  function emit(event, payload) {
    (listeners[event] || []).forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        console.error(`pinballWallet listener error (${event}):`, err);
      }
    });
  }

  function syncLegacySolanaGlobal() {
    if (activeProvider) {
      window.solana = activeProvider;
    } else if (!window.phantom?.solana) {
      delete window.solana;
    } else {
      window.solana = window.phantom.solana;
    }
  }

  function getRegistryEntry(walletId) {
    return WALLET_REGISTRY.find((w) => w.id === walletId) || null;
  }

  function getPublicKey() {
    return activeProvider?.publicKey ?? null;
  }

  function getAddress() {
    const key = getPublicKey();
    return key ? key.toString() : null;
  }

  function attachProviderEvents(provider) {
    if (!provider?.on) return;

    provider.on("connect", () => {
      syncLegacySolanaGlobal();
      emit("connect", { walletId: activeWalletId, address: getAddress() });
    });

    provider.on("disconnect", () => {
      activeWalletId = null;
      activeProvider = null;
      syncLegacySolanaGlobal();
      emit("disconnect", {});
    });

    provider.on("accountChanged", (publicKey) => {
      syncLegacySolanaGlobal();
      emit("accountChanged", {
        walletId: activeWalletId,
        address: publicKey ? publicKey.toString() : null,
      });
    });
  }

  async function invokeConnect(provider, walletName) {
    if (!provider) {
      throw new Error(`${walletName} provider not found`);
    }

    if (typeof provider.connect !== "function") {
      throw new Error(`${walletName} does not support connect on this page`);
    }

    const connectOptions =
      provider.isPhantom || walletName === "Phantom" ? { onlyIfTrusted: false } : undefined;

    let response;
    try {
      response = connectOptions
        ? await provider.connect(connectOptions)
        : await provider.connect();
    } catch (err) {
      if (err?.code === 4001) {
        throw new Error("Connection cancelled in your wallet");
      }
      if (err?.code === -32002) {
        throw new Error("Connection already pending — open your wallet extension and approve");
      }
      throw err;
    }

    const publicKey = response?.publicKey ?? provider.publicKey;
    if (!publicKey) {
      throw new Error(`Connected to ${walletName} but no account was returned`);
    }

    return publicKey;
  }

  async function resolveProvider(entry) {
    let provider = entry.getProvider?.() ?? null;

    if (!provider && entry.resolveProvider) {
      provider = await entry.resolveProvider();
    }

    return provider;
  }

  async function disconnect() {
    if (activeProvider?.disconnect) {
      try {
        await activeProvider.disconnect();
      } catch (err) {
        console.warn("Wallet disconnect error:", err);
      }
    }
    activeWalletId = null;
    activeProvider = null;
    syncLegacySolanaGlobal();
    emit("disconnect", {});
  }

  window.pinballWallet = {
    WALLET_REGISTRY,

    getAllWallets() {
      return WALLET_REGISTRY.map((wallet) => {
        const installed = wallet.isInstalled();
        let statusHint = installed ? "Installed" : "Get wallet";

        if (wallet.id === "metamask" && installed && !wallet.getProvider()) {
          statusHint = "Enable Solana";
        }

        return {
          id: wallet.id,
          name: wallet.name,
          installed,
          statusHint,
          downloadUrl: wallet.downloadUrl,
        };
      });
    },

    getInstalledWallets() {
      return this.getAllWallets().filter((w) => w.installed);
    },

    isConnected() {
      return Boolean(activeProvider?.publicKey);
    },

    getWalletId() {
      return activeWalletId;
    },

    getWalletName() {
      const entry = getRegistryEntry(activeWalletId);
      return entry ? entry.name : null;
    },

    getProvider() {
      return activeProvider;
    },

    getPublicKey,
    getAddress,

    async connect(walletId) {
      const entry = getRegistryEntry(walletId);
      if (!entry) {
        throw new Error(`Unknown wallet: ${walletId}`);
      }

      if (!entry.isInstalled()) {
        window.open(entry.downloadUrl, "_blank", "noopener,noreferrer");
        throw new Error(`${entry.name} is not installed`);
      }

      const provider = await resolveProvider(entry);

      if (!provider) {
        if (entry.id === "metamask") {
          throw new Error(
            "MetaMask is installed. Open MetaMask → add or enable a Solana account, then try again."
          );
        }
        throw new Error(`${entry.name} could not be reached. Refresh the page and try again.`);
      }

      if (activeProvider && activeProvider !== provider) {
        await disconnect();
      }

      await invokeConnect(provider, entry.name);

      activeWalletId = walletId;
      activeProvider = provider;
      attachProviderEvents(provider);
      syncLegacySolanaGlobal();

      const address = getAddress();
      emit("connect", { walletId, address });
      return { walletId, address, provider };
    },

    disconnect,

    on(event, callback) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(callback);
      return () => {
        listeners[event] = listeners[event].filter((fn) => fn !== callback);
      };
    },

    async tryRestoreSession() {
      for (const wallet of WALLET_REGISTRY) {
        if (!wallet.isInstalled()) continue;

        const provider = await resolveProvider(wallet);
        if (!provider) continue;

        const connected =
          provider.isConnected === true ||
          (typeof provider.isConnected === "function" && provider.isConnected()) ||
          Boolean(provider.publicKey);

        if (!connected) continue;

        activeWalletId = wallet.id;
        activeProvider = provider;
        attachProviderEvents(provider);
        syncLegacySolanaGlobal();
        return { walletId: wallet.id, address: getAddress() };
      }
      return null;
    },
  };

  syncLegacySolanaGlobal();
})();
