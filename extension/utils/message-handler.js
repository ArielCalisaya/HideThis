/**
 * Utility for handling messages between extension components
 * Provides consistent interface for communication
 */
class MessageHandler {
  /**
   * Sends message to content script in active tab
   * @param {string} action - Action to execute
   * @param {Object} data - Additional data (optional)
   * @returns {Promise<Object>} Response from content script
   */
  static async sendToContentScript(action, data = {}) {
    return new Promise((resolve, reject) => {
      try {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs.length === 0) {
            reject(new Error('No active tab available'));
            return;
          }

          const message = { action, ...data };
          
          chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(`Communication error: ${chrome.runtime.lastError.message}`));
            } else {
              resolve(response || { success: true });
            }
          });
        });
      } catch (error) {
        reject(new Error(`Error sending message: ${error.message}`));
      }
    });
  }

  /**
   * Sends message to background script
   * @param {string} action - Action to execute
   * @param {Object} data - Additional data (optional)
   * @returns {Promise<Object>} Response from background script
   */
  static async sendToBackground(action, data = {}) {
    return new Promise((resolve, reject) => {
      try {
        const message = { action, ...data };
        
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(`Communication error: ${chrome.runtime.lastError.message}`));
          } else {
            resolve(response || { success: true });
          }
        });
      } catch (error) {
        reject(new Error(`Error sending message: ${error.message}`));
      }
    });
  }

  /**
   * Sets up listener for incoming messages
   * @param {Function} handler - Function that handles messages
   * @returns {Function} Function to remove listener
   */
  static setupMessageListener(handler) {
    const wrappedHandler = (request, sender, sendResponse) => {
      try {
        const result = handler(request, sender, sendResponse);
        
        // If handler returns a Promise, handle it appropriately
        if (result instanceof Promise) {
          result
            .then(response => sendResponse(response))
            .catch(error => sendResponse({ 
              success: false, 
              error: error.message 
            }));
          return true; // Indicates response will be async
        }
        
        return result;
      } catch (error) {
        console.error('Error in message handler:', error);
        sendResponse({ 
          success: false, 
          error: error.message 
        });
        return false;
      }
    };

    chrome.runtime.onMessage.addListener(wrappedHandler);
    
    // Returns function to clean up listener
    return () => {
      chrome.runtime.onMessage.removeListener(wrappedHandler);
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MessageHandler;
} else {
  window.MessageHandler = MessageHandler;
} 