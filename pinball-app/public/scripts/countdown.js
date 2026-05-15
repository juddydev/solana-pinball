// countdown.js - Manages the countdown timer for leaderboard based on UTC

(function() {
    'use strict';
    
    let countdownElement;
    
    // Initialize the countdown
    function initCountdown(elementId) {
        countdownElement = document.getElementById(elementId);
        if (!countdownElement) {
            console.error('Countdown element not found with ID:', elementId);
            return;
        }
        
        // Update countdown immediately
        updateCountdown();
        
        // Update countdown every second
        setInterval(updateCountdown, 1000);
    }
    
    // Calculate the next reward distribution time (00:00 UTC)
    function getNextRewardTimeUTC() {
        const nowUTC = new Date();
        
        // Create today's 00:00 time (UTC)
        const nextReward = new Date(Date.UTC(
            nowUTC.getUTCFullYear(),
            nowUTC.getUTCMonth(),
            nowUTC.getUTCDate(),
            0, 0, 0, 0
        ));
        
        // If already past 00:00 UTC, set for tomorrow
        if (nowUTC >= nextReward) {
            nextReward.setUTCDate(nextReward.getUTCDate() + 1);
        }
        
        return nextReward;
    }

    // Function to update the countdown timer
    function updateCountdown() {
        if (!countdownElement) return;
        
        // Get current time in UTC
        const nowUTC = new Date();
        
        // Get next distribution time
        const nextRewardTimeUTC = getNextRewardTimeUTC();
        
        // Calculate remaining time (milliseconds)
        const diff = nextRewardTimeUTC - nowUTC;
        
        // If currently in distribution process (diff very small, e.g. < 1 minute)
        if (diff < 60000 && diff >= 0) {
            countdownElement.innerHTML = "Rewards soon...";
            countdownElement.classList.add('countdown-urgent');
            return;
        }
        
        // Convert to hours, minutes, seconds
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        // Format with leading zeros if needed
        const formattedHours = String(hours).padStart(2, '0');
        const formattedMinutes = String(minutes).padStart(2, '0');
        const formattedSeconds = String(seconds).padStart(2, '0');
        
        // Display countdown
        countdownElement.innerHTML = `${formattedHours}H : ${formattedMinutes}M : ${formattedSeconds}S`;
        
        // Display exact UTC time for debugging (can be removed later)
        console.log(`Now UTC: ${nowUTC.toISOString()}`);
        console.log(`Next reward UTC: ${nextRewardTimeUTC.toISOString()}`);
        console.log(`Time left: ${formattedHours}:${formattedMinutes}:${formattedSeconds}`);
        
        // Add classes for animation when time is running out
        if (hours === 0 && minutes < 30) {
            countdownElement.classList.add('countdown-urgent');
        } else {
            countdownElement.classList.remove('countdown-urgent');
        }
    }
    
    // Export methods to the outside
    window.rewardCountdown = {
        init: initCountdown,
        update: updateCountdown,
        getNextRewardTime: getNextRewardTimeUTC
    };
})();