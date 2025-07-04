// Service Worker for HideThis - Refactored Version

/**
 * Message controller for background script
 * Acts as intermediary between popup and content scripts
 */
class BackgroundMessageController {
  constructor() {
    this.validActions = [
      'ping',
      'test', 
      'toggleSelector',
      'getSelectorState',
      'toggleVisibility',
      'clearAll',
      'getHiddenCount',
      'elementHidden',
      'elementsCleared',
      'contentScriptLoaded',
      'contentScriptReady',
      'getHiddenElementsList',
      'removeHiddenElement',
      'removeElements',
      'removeBlurFilter',
      'clearRemovedElements',
      'getRemovedElementsCount'
    ];
    
    this.setupMessageListener();
  }

  /**
   * Sets up main message listener
   */
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      try {
        // Validate action exists
        if (!request.action) {
          sendResponse({ success: false, error: 'Action not specified' });
          return false;
        }

        // Log action for debugging
        console.log(`🔄 Background received action: ${request.action}`);

        // Delegate to appropriate method
        const result = this.handleMessage(request, sender, sendResponse);
        
        // If result is true, indicates async response
        return result === true;
      } catch (error) {
        console.error('Error in background message handler:', error);
        sendResponse({ 
          success: false, 
          error: error.message 
        });
        return false;
      }
    });
  }

  /**
   * Handles incoming messages and delegates to specific methods
   * @param {Object} request - Received message
   * @param {Object} sender - Sender information
   * @param {Function} sendResponse - Function to send response
   * @returns {boolean} True if response will be async
   */
  handleMessage(request, sender, sendResponse) {
    const { action } = request;
    console.log(`🔍 Background handleMessage called with action: "${action}"`);

    // Connection verification messages
    if (action === 'ping' || action === 'test') {
      console.log(`🔍 Handling connection test: ${action}`);
      return this.handleConnectionTest(action, sendResponse);
    }

    // Selector control messages
    if (['toggleSelector', 'getSelectorState', 'toggleVisibility', 'clearAll', 'getHiddenCount'].includes(action)) {
      console.log(`🔍 Handling content script command: ${action}`);
      return this.handleContentScriptCommand(action, request, sendResponse);
    }

    // List management messages
    if (['getHiddenElementsList', 'removeHiddenElement', 'removeElements'].includes(action)) {
      console.log(`🔍 Handling list management command: ${action}`);
      return this.handleListManagementCommand(action, request, sendResponse);
    }

    // Class removal messages
    const classRemovalActions = ['removeBlurFilter', 'clearRemovedElements', 'getRemovedElementsCount'];
    console.log(`🔍 Checking if "${action}" is in class removal actions:`, classRemovalActions);
    if (classRemovalActions.includes(action)) {
      console.log(`🔍 YES - Handling class removal command: ${action}`);
      return this.handleClassRemovalCommand(action, request, sendResponse);
    }

    // Content script notification messages
    if (['elementHidden', 'elementsCleared'].includes(action)) {
      console.log(`🔍 Handling content script notification: ${action}`);
      return this.handleContentScriptNotification(action, request);
    }

    // Content script status messages
    if (['contentScriptLoaded', 'contentScriptReady'].includes(action)) {
      console.log(`🔍 Handling content script status: ${action}`);
      return this.handleContentScriptStatus(action, request);
    }

    // Unrecognized action
    console.log(`❌ Unrecognized action: ${action}`);
    sendResponse({ 
      success: false, 
      error: `Unrecognized action: ${action}` 
    });
    return false;
  }

  /**
   * Handles connection test messages
   * @param {string} action - Test action
   * @param {Function} sendResponse - Response function
   * @returns {boolean} True for async response
   */
  handleConnectionTest(action, sendResponse) {
    this.forwardToActiveTab(action, {}, (response, error) => {
      if (error) {
        sendResponse({ 
          success: false, 
          error: error.message,
          details: `Connection test failed: ${action}`
        });
      } else {
        sendResponse(response || { 
          success: true, 
          message: `${action} successful`,
          timestamp: new Date().toISOString()
        });
      }
    });
    return true;
  }

  /**
   * Handles commands directed to content script
   * @param {string} action - Action to execute
   * @param {Object} request - Complete message
   * @param {Function} sendResponse - Response function
   * @returns {boolean} True for async response
   */
  handleContentScriptCommand(action, request, sendResponse) {
    this.forwardToActiveTab(action, request, (response, error) => {
      if (error) {
        sendResponse({ 
          success: false, 
          error: error.message,
          action: action
        });
      } else {
        sendResponse(response || { success: true });
      }
    });
    return true;
  }

  /**
   * Handles list management commands
   * @param {string} action - List management action
   * @param {Object} request - Complete message
   * @param {Function} sendResponse - Response function
   * @returns {boolean} True for async response
   */
  handleListManagementCommand(action, request, sendResponse) {
    console.log(`🔄 Background forwarding list command: ${action}`);
    this.forwardToActiveTab(action, request, (response, error) => {
      if (error) {
        console.error(`❌ Background list command error for ${action}:`, error);
        sendResponse({ 
          success: false, 
          error: error.message,
          action: action
        });
      } else {
        console.log(`✅ Background list command success for ${action}:`, response);
        sendResponse(response || { success: true });
      }
    });
    return true;
  }

  /**
   * Handles class removal commands
   * @param {string} action - Class removal action
   * @param {Object} request - Complete message
   * @param {Function} sendResponse - Response function
   * @returns {boolean} True for async response
   */
  handleClassRemovalCommand(action, request, sendResponse) {
    console.log(`🔄 Background forwarding class removal command: ${action}`);
    console.log(`📦 Request data:`, { action, className: request.className });
    
    this.forwardToActiveTab(action, request, (response, error) => {
      if (error) {
        console.error(`❌ Background class removal command error for ${action}:`, error);
        console.error(`📋 Error details:`, {
          message: error.message,
          stack: error.stack,
          action: action,
          className: request.className
        });
        
        sendResponse({ 
          success: false, 
          error: error.message,
          action: action,
          details: 'Background script could not communicate with content script'
        });
      } else {
        console.log(`✅ Background class removal command success for ${action}:`, response);
        sendResponse(response || { success: true });
      }
    });
    return true;
  }

  /**
   * Handles content script notifications
   * @param {string} action - Notification type
   * @param {Object} request - Notification data
   * @returns {boolean} False for sync response
   */
  handleContentScriptNotification(action, request) {
    // Forward notification to popup if open
    try {
      chrome.runtime.sendMessage({
        action: 'updateCount',
        count: request.count || 0,
        source: action
      });
    } catch (error) {
      // Popup might not be open, this is normal
      console.log(`Info: Could not notify popup: ${error.message}`);
    }
    
    return false; // No response needed
  }

  /**
   * Handles content script status messages
   * @param {string} action - Status type
   * @param {Object} request - Status data
   * @returns {boolean} False for sync response
   */
  handleContentScriptStatus(action, request) {
    const statusMessages = {
      contentScriptLoaded: 'Content script loaded',
      contentScriptReady: '⭐️ Content script ready'
    };

    const message = statusMessages[action] || `📡 Status: ${action}`;
    console.log(`${message} on:`, request.url || 'Unknown URL');
    
    return false; // No response needed
  }

  /**
   * Forwards a message to active tab
   * @param {string} action - Action to forward
   * @param {Object} data - Additional data
   * @param {Function} callback - Callback with (response, error)
   */
  forwardToActiveTab(action, data, callback) {
    console.log(`📤 Forwarding to active tab:`, { action, data });
    
    this.getActiveTab((tab, error) => {
      if (error) {
        console.error(`❌ Failed to get active tab:`, error);
        callback(null, error);
        return;
      }

      console.log(`📋 Active tab found:`, { id: tab.id, url: tab.url });

      try {
        const message = { action, ...data };
        console.log(`📨 Sending message to tab ${tab.id}:`, message);
        
        chrome.tabs.sendMessage(tab.id, message, (response) => {
          if (chrome.runtime.lastError) {
            const error = new Error(chrome.runtime.lastError.message);
            console.error(`❌ Chrome runtime error:`, {
              message: chrome.runtime.lastError.message,
              tabId: tab.id,
              tabUrl: tab.url,
              action: action
            });
            callback(null, error);
          } else {
            console.log(`✅ Message sent successfully, response:`, response);
            callback(response, null);
          }
        });
      } catch (error) {
        console.error(`❌ Exception in forwardToActiveTab:`, error);
        callback(null, error);
      }
    });
  }

  /**
   * Gets active tab safely
   * @param {Function} callback - Callback with (tab, error)
   */
  getActiveTab(callback) {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          callback(null, new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!tabs || tabs.length === 0) {
          callback(null, new Error('No active tab available'));
          return;
        }

        callback(tabs[0], null);
      });
    } catch (error) {
      callback(null, error);
    }
  }
}

/**
 * Initialize message controller when service worker loads
 */
try {
  const messageController = new BackgroundMessageController();
  console.log('✅ Background script initialized');
} catch (error) {
  console.error('Error initializing background script:', error);
} 