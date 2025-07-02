// Popup script for Google Drive CORS Bypass extension
document.addEventListener('DOMContentLoaded', function() {
    initializePopup();
});

let extensionEnabled = true;
let sessionStats = {
    filesProcessed: 0,
    successfulFiles: 0
};

function initializePopup() {
    // Load saved settings
    chrome.storage.local.get(['extensionEnabled', 'sessionStats'], function(result) {
        extensionEnabled = result.extensionEnabled !== false; // Default to true
        sessionStats = result.sessionStats || { filesProcessed: 0, successfulFiles: 0 };
        
        updateUI();
        checkCurrentTab();
        loadSessionStats();
    });
    
    // Set up event listeners
    document.getElementById('toggleExtension').addEventListener('click', toggleExtension);
    document.getElementById('clearCache').addEventListener('click', clearCache);
    
    // Update stats periodically
    setInterval(loadSessionStats, 2000);
}

function updateUI() {
    const extensionStatus = document.getElementById('extensionStatus');
    const toggleButton = document.getElementById('toggleExtension');
    const toggleText = document.getElementById('toggleText');
    
    if (extensionEnabled) {
        extensionStatus.innerHTML = '<span class="status-indicator active"></span>Active';
        toggleText.textContent = 'Disable Extension';
        toggleButton.className = 'btn btn-primary';
        
        // Update badge
        chrome.action.setBadgeText({ text: 'ON' });
        chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    } else {
        extensionStatus.innerHTML = '<span class="status-indicator inactive"></span>Disabled';
        toggleText.textContent = 'Enable Extension';
        toggleButton.className = 'btn btn-secondary';
        
        // Update badge
        chrome.action.setBadgeText({ text: 'OFF' });
        chrome.action.setBadgeBackgroundColor({ color: '#f44336' });
    }
}

function checkCurrentTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const currentTab = tabs[0];
        const tabStatus = document.getElementById('tabStatus');
        const tabStatusText = document.getElementById('tabStatusText');
        
        if (currentTab) {
            const url = currentTab.url;
            
            if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
                tabStatusText.textContent = 'Chrome internal page';
                tabStatus.querySelector('.status-indicator').className = 'status-indicator warning';
            } else if (url.startsWith('https://') || url.startsWith('http://')) {
                tabStatusText.textContent = 'Compatible';
                tabStatus.querySelector('.status-indicator').className = 'status-indicator active';
                
                // Check if the page has Google Drive URLs
                chrome.tabs.sendMessage(currentTab.id, { action: 'checkForGoogleDriveUrls' }, function(response) {
                    if (chrome.runtime.lastError) {
                        // Content script not loaded or page not compatible
                        return;
                    }
                    
                    if (response && response.hasGoogleDriveUrls) {
                        tabStatusText.textContent = 'Google Drive URLs detected';
                        document.getElementById('statsSection').style.display = 'block';
                    }
                });
            } else {
                tabStatusText.textContent = 'Not compatible';
                tabStatus.querySelector('.status-indicator').className = 'status-indicator inactive';
            }
        }
    });
}

function toggleExtension() {
    extensionEnabled = !extensionEnabled;
    
    // Save setting
    chrome.storage.local.set({ extensionEnabled: extensionEnabled });
    
    updateUI();
    
    // Notify all tabs about the change
    chrome.tabs.query({}, function(tabs) {
        tabs.forEach(tab => {
            if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'extensionToggled',
                    enabled: extensionEnabled
                }, function(response) {
                    // Ignore errors for tabs that don't have the content script
                    if (chrome.runtime.lastError) {
                        return;
                    }
                });
            }
        });
    });
}

function clearCache() {
    const clearButton = document.getElementById('clearCache');
    const originalText = clearButton.textContent;
    
    clearButton.textContent = 'Clearing...';
    clearButton.disabled = true;
    
    // Clear session stats
    sessionStats = { filesProcessed: 0, successfulFiles: 0 };
    chrome.storage.local.set({ sessionStats: sessionStats });
    
    // Clear any cached data
    chrome.storage.local.remove(['cachedFiles'], function() {
        setTimeout(() => {
            clearButton.textContent = 'Cleared!';
            updateSessionStats();
            
            setTimeout(() => {
                clearButton.textContent = originalText;
                clearButton.disabled = false;
            }, 1000);
        }, 500);
    });
}

function loadSessionStats() {
    chrome.storage.local.get(['sessionStats'], function(result) {
        if (result.sessionStats) {
            sessionStats = result.sessionStats;
            updateSessionStats();
        }
    });
}

function updateSessionStats() {
    document.getElementById('filesProcessed').textContent = sessionStats.filesProcessed;
    
    const successRate = sessionStats.filesProcessed > 0 
        ? Math.round((sessionStats.successfulFiles / sessionStats.filesProcessed) * 100)
        : 0;
    
    document.getElementById('successRate').textContent = successRate + '%';
    
    // Show stats section if there's activity
    if (sessionStats.filesProcessed > 0) {
        document.getElementById('statsSection').style.display = 'block';
    }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'updateStats') {
        sessionStats = request.stats;
        updateSessionStats();
        
        // Save updated stats
        chrome.storage.local.set({ sessionStats: sessionStats });
    }
});

// Handle popup closing
window.addEventListener('beforeunload', function() {
    // Save any pending data
    chrome.storage.local.set({ sessionStats: sessionStats });
});
