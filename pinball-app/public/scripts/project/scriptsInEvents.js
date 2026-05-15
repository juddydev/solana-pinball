const scriptsInEvents = {

	async Esgame_Event124_Act13(runtime, localVars) {
		try {
			const score = runtime.globalVars.score;
			console.log("🔍 Score:", score);

			// Save to localStorage first
			localStorage.setItem("score", score);

			// Debug: check gameScoreManager
			console.log("🔍 gameScoreManager status:", {
				exists: !!window.gameScoreManager,
				value: window.gameScoreManager
			});

			// Check if wallet is connected
			if (window.solana && window.solana.publicKey) {
				const walletAddress = window.solana.publicKey.toString();
				console.log("📍 Wallet address:", walletAddress);

				// Check if gameScoreManager exists
				if (!window.gameScoreManager) {
					throw new Error("Score manager not initialized");
				}

				await window.gameScoreManager.storeScore(walletAddress, score);
				console.log("✅ Score saved to database");

				// Can add success message for user
				// Example: runtime.globalVars.showMessage("Score saved!")
			} else {
				console.log("⚠️ Wallet not connected. Score only saved locally.");
				// Can add notification for user to connect wallet
				// Example: runtime.globalVars.showMessage("Connect wallet to save score!")
			}
		} catch (error) {
			console.error("❌ Error saving score:", error);
			// Handle errors and notify user if needed
		}
	}

};

self.C3.ScriptsInEvents = scriptsInEvents;
