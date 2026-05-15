// leaderboard.js - Manages the display of the leaderboard

(function() {
    'use strict';
    
    const loadingSpinner = document.getElementById('loadingSpinner');
    const leaderboardList = document.getElementById('leaderboardList');

    async function loadLeaderboard() {
        try {
            loadingSpinner.style.display = 'flex';
            leaderboardList.style.display = 'none';

            const players = await window.gameScoreManager.getLeaderboard();
            
            const leaderboardHtml = players.map((player, index) => `
                <div class="leaderboard-item ${index < 3 ? 'top-' + (index + 1) : ''}">
                    <div class="rank">${window.gameScoreManager.getMedalIcon(index)}</div>
                    <div class="wallet-address">${window.gameScoreManager.shortenAddress(player.address)}</div>
                    <div class="score">${player.score.toLocaleString()}</div>
                    <div class="token-balance">${(player.tokenBalance || 0).toLocaleString()} TOKENS</div>
                </div>
            `).join('');

            leaderboardList.innerHTML = leaderboardHtml;
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            leaderboardList.innerHTML = '<div class="error-message">Failed to load leaderboard. Please try again later.</div>';
        } finally {
            loadingSpinner.style.display = 'none';
            leaderboardList.style.display = 'block';
        }
    }

    // Initialize the leaderboard page
    function init() {
        // Initialize the countdown timer
        if (window.rewardCountdown) {
            window.rewardCountdown.init('countdown');
        }
        
        // Load the leaderboard
        loadLeaderboard();
    }

    // Run initialization when DOM is ready
    document.addEventListener('DOMContentLoaded', init);
})();