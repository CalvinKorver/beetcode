// Logout script to clear all user data from browser context
console.log('BeetCode: Logout page loaded, clearing localStorage...');

// Add event listener for close button
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            try {
                window.close();
            } catch (error) {
                console.log('BeetCode: Could not close tab programmatically');
            }
        });
    }
});

// Clear all localStorage data that might be related to authentication
try {
    // Clear all localStorage - this is important for OAuth state
    localStorage.clear();
    console.log('BeetCode: localStorage cleared successfully');

    // Clear sessionStorage as well for completeness
    sessionStorage.clear();
    console.log('BeetCode: sessionStorage cleared successfully');

    // Clear any cookies related to Google OAuth (if accessible)
    // Note: Cookies might not be accessible due to same-origin policy
    // but we try anyway for completeness
    try {
        document.cookie.split(";").forEach(function(c) {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        console.log('BeetCode: Attempted to clear cookies');
    } catch (cookieError) {
        console.log('BeetCode: Could not clear cookies (expected in extension context):', cookieError.message);
    }

    // Send message to extension that logout cleanup is complete
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
            type: 'LOGOUT_CLEANUP_COMPLETE'
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.log('BeetCode: Extension context not available (expected):', chrome.runtime.lastError.message);
            } else {
                console.log('BeetCode: Notified extension of logout completion');
            }
        });
    }

    // Auto-close the tab after a delay to give user time to read the message
    setTimeout(() => {
        try {
            window.close();
        } catch (error) {
            console.log('BeetCode: Could not auto-close tab, user will need to close manually');
        }
    }, 3000); // Close after 3 seconds

} catch (error) {
    console.error('BeetCode: Error during logout cleanup:', error);

    // Still try to close the tab even if cleanup failed
    setTimeout(() => {
        try {
            window.close();
        } catch (closeError) {
            console.log('BeetCode: Could not auto-close tab after error');
        }
    }, 3000);
}