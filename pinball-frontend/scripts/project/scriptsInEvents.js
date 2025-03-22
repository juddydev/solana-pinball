const scriptsInEvents = {

	async Esgame_Event124_Act13(runtime, localVars) {
		try {
			const score = runtime.globalVars.score;
			console.log("🔍 Score:", score);

			// Lưu vào localStorage trước
			localStorage.setItem("score", score);

			// Debug: kiểm tra gameScoreManager
			console.log("🔍 gameScoreManager status:", {
				exists: !!window.gameScoreManager,
				value: window.gameScoreManager
			});

			// Kiểm tra xem có wallet được kết nối không
			if (window.solana && window.solana.publicKey) {
				const walletAddress = window.solana.publicKey.toString();
				console.log("📍 Wallet address:", walletAddress);

				// Kiểm tra gameScoreManager tồn tại
				if (!window.gameScoreManager) {
					throw new Error("Score manager not initialized");
				}

				await window.gameScoreManager.storeScore(walletAddress, score);
				console.log("✅ Score saved to database");

				// Có thể thêm thông báo thành công cho user
				// Ví dụ: runtime.globalVars.showMessage("Score saved!")
			} else {
				console.log("⚠️ Wallet not connected. Score only saved locally.");
				// Có thể thêm thông báo cho user để connect wallet
				// Ví dụ: runtime.globalVars.showMessage("Connect wallet to save score!")
			}
		} catch (error) {
			console.error("❌ Error saving score:", error);
			// Xử lý lỗi và thông báo cho user nếu cần
		}
	}

};

self.C3.ScriptsInEvents = scriptsInEvents;

