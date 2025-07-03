// Service Worker for HideThis
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Ping message to test content script connection
  if (request.action === 'ping') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        sendResponse({ success: false, error: 'No active tab' });
        return;
      }
      
      try {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'ping' }, (response) => {
          if (chrome.runtime.lastError) {
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse(response || { success: true, message: 'Ping successful' });
          }
        });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    });
    return true;
  }

  // Test message
  if (request.action === 'test') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        sendResponse({ success: false, error: 'No active tab' });
        return;
      }
      
      try {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'test' }, (response) => {
          if (chrome.runtime.lastError) {
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse(response || { success: true, message: 'No response but no error' });
          }
        });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    });
    return true;
  }

  // Messages from popup to content script
  if (request.action === 'toggleSelector') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        sendResponse({ success: false, error: 'No active tab' });
        return;
      }
      
      chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleSelector' }, (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse(response);
        }
      });
    });
    return true;
  }
  
  if (request.action === 'toggleVisibility') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleVisibility' }, (response) => {
        sendResponse(response);
      });
    });
    return true;
  }
  
  if (request.action === 'clearAll') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'clearAll' }, (response) => {
        sendResponse(response);
      });
    });
    return true;
  }
  
  if (request.action === 'getHiddenCount') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getHiddenCount' }, (response) => {
        sendResponse(response);
      });
    });
    return true;
  }
  
  // Messages from content script to popup
  if (request.action === 'elementHidden' || request.action === 'elementsCleared') {
    // Notify popup about count change
    chrome.runtime.sendMessage({
      action: 'updateCount',
      count: request.count
    });
  }
  
  // Content script loaded notification
  if (request.action === 'contentScriptLoaded') {
    console.log('✅ Content script loaded on:', request.url);
  }
  
  // Content script ready heartbeat
  if (request.action === 'contentScriptReady') {
    console.log('💓 Content script ready on:', request.url);
  }
}); 