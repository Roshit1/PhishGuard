const API_URL = 'http://localhost:8000/api/scan';

// Store scan results per tab
const tabResults = {};

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    try {
      // Don't scan our own localhost dashboard
      if (tab.url.includes('localhost:5173') || tab.url.includes('localhost:8000')) return;

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: tab.url })
      });

      if (response.ok) {
        const result = await response.json();
        tabResults[tabId] = result;

        // Update badge
        if (result.status === 'Phishing') {
          chrome.action.setBadgeText({ text: '!', tabId });
          chrome.action.setBadgeBackgroundColor({ color: '#ef4444', tabId });
          
          // Send message to content script to show alert
          chrome.tabs.sendMessage(tabId, { type: 'PHISHING_ALERT', result });
        } else if (result.status === 'Suspicious') {
          chrome.action.setBadgeText({ text: '?', tabId });
          chrome.action.setBadgeBackgroundColor({ color: '#f59e0b', tabId });
        } else {
          chrome.action.setBadgeText({ text: '✓', tabId });
          chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId });
        }
      }
    } catch (error) {
      console.error('Error scanning URL:', error);
    }
  }
});

// Provide data to popup if requested
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_RESULT') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabResults[tabs[0].id]) {
        sendResponse(tabResults[tabs[0].id]);
      } else {
        sendResponse(null);
      }
    });
    return true; // Keep message channel open for async response
  }
});
