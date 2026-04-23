const API_URL = 'https://phishguard-1gb2.onrender.com/api/scan';

// Store scan results per tab
const tabResults = {};

async function scanUrl(url, tabId) {
  try {
    // Don't scan our own localhost dashboard or chrome internal pages
    if (url.includes('localhost:') || url.startsWith('chrome://') || url.startsWith('about:')) return;

    console.log(`Scanning URL: ${url}`);
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: url })
    });

    if (response.ok) {
      const result = await response.json();
      tabResults[tabId] = result;
      console.log(`Scan result for ${url}:`, result);

      // Update badge
      if (result.status === 'Phishing') {
        chrome.action.setBadgeText({ text: '!', tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#ef4444', tabId });
        chrome.tabs.sendMessage(tabId, { type: 'PHISHING_ALERT', result }).catch(() => {});
      } else if (result.status === 'Suspicious') {
        chrome.action.setBadgeText({ text: '?', tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#f59e0b', tabId });
      } else {
        chrome.action.setBadgeText({ text: '✓', tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId });
      }
    } else {
      console.error(`API Error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('Fetch Error (Check if Render is awake):', error);
  }
}

// Watch for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    scanUrl(tab.url, tabId);
  }
});

// Also scan on activation (switching tabs)
chrome.tabs.onActivated.addListener(activeInfo => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab && tab.url && tab.url.startsWith('http')) {
      if (!tabResults[activeInfo.tabId]) {
        scanUrl(tab.url, activeInfo.tabId);
      }
    }
  });
});

// Provide data to popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_RESULT') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const result = tabResults[tabs[0].id];
        sendResponse(result || null);
      } else {
        sendResponse(null);
      }
    });
    return true; 
  }
});
