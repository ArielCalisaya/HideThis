/**
 * DomAttrsRemover - Clean element removal functionality
 * Handles classes, IDs, and complex selectors removal from DOM elements
 */
class DomAttrsRemover {
  constructor() {
    this.storageManager = null;
    this.domain = null;
    this.initialized = false;
    this.mutationObserver = null;
    this.intersectionObserver = null;
    
    // Initialize and cache references
    this.init();
  }

  /**
   * Initialize the remover with storage and domain context
   */
  async init() {
    try {
      if (typeof StorageManager !== 'undefined') {
        this.storageManager = new StorageManager();
        await this.storageManager.init();
        this.domain = window.location.hostname;
        this.initialized = true;
        
        console.log('[DomAttrsRemover] ✅ Initialized successfully for domain:', this.domain);
        
        // Setup dynamic element detection
        this.setupDynamicDetection();
        
        // Auto-restore removed elements on page load
        await this.restoreRemovedElements();
      }
    } catch (error) {
      console.error('[DomAttrsRemover] ❌ Initialization failed:', error);
      ErrorHandler.handle(error, 'DomAttrsRemover initialization');
    }
  }

  /**
   * Enhanced element removal that detects selector type automatically
   * @param {string} selector - The selector to remove (.class, #id, or complex)
   * @returns {Object} Result with count and success status
   */
  async removeElements(selector) {
    if (!this.initialized) {
      throw new Error('DomAttrsRemover not initialized');
    }
    
    if (!selector || typeof selector !== 'string') {
      throw new Error('Selector must be a non-empty string');
    }
    
    const cleanSelector = selector.trim();
    console.log(`[DomAttrsRemover] 🎯 Removing elements: "${cleanSelector}"`);
    
    try {
      let elements = [];
      let removalType = 'unknown';
      
      // Auto-detect selector type and find elements
      if (cleanSelector.startsWith('.')) {
        // Class selector
        removalType = 'class';
        const className = cleanSelector.substring(1);
        elements = this.getElementsByClass(className);
        
        // Remove class from elements instead of hiding them
        elements.forEach(element => {
          element.classList.remove(className);
        });
        
      } else if (cleanSelector.startsWith('#')) {
        // ID selector
        removalType = 'id';
        const element = document.getElementById(cleanSelector.substring(1));
        if (element) {
          elements = [element];
          element.remove(); // Remove ID elements completely
        }
        
      } else {
        // Complex selector or attribute
        removalType = 'complex';
        try {
          elements = Array.from(document.querySelectorAll(cleanSelector));
          elements.forEach(element => element.remove());
        } catch (selectorError) {
          console.warn('[DomAttrsRemover] Invalid selector:', cleanSelector);
          throw new Error(`Invalid CSS selector: ${cleanSelector}`);
        }
      }
      
      const count = elements.length;
      console.log(`[DomAttrsRemover] ✅ Removed ${count} elements (${removalType})`);
      
      // Store removal data for persistence (even if count is 0, for future elements)
      await this.storeRemovedElement(cleanSelector, removalType, count);
      
      return {
        success: true,
        count: count,
        selector: cleanSelector,
        type: removalType,
        elements: elements.length
      };
      
    } catch (error) {
      console.error('[DomAttrsRemover] ❌ Error removing elements:', error);
      ErrorHandler.handle(error, `Remove elements: ${cleanSelector}`);
      throw error;
    }
  }

  /**
   * Quick blur filter removal - targets common blur class
   * @returns {Object} Result with removed elements count
   */
  async removeBlurFilter() {
    console.log('[DomAttrsRemover] 🌀 Removing blur filters');
    
    // Just target the most common blur class
    const result = await this.removeElements('.over-limit');
    
    console.log(`[DomAttrsRemover] ✅ Blur filters removed: ${result.count}`);
    
    return {
      success: true,
      count: result.count,
      type: 'blur-removal'
    };
  }
  
  /**
   * Get elements by class name with dynamic detection
   * @param {string} className - Class name without dot
   * @returns {Array} Array of elements
   */
  getElementsByClass(className) {
    // Find existing elements
    const existing = Array.from(document.getElementsByClassName(className));
    
    // Also process newly added elements
    this.processNewElements(className);
    
    return existing;
  }
  
  /**
   * Process newly added elements for a specific class
   * @param {string} className - Class to remove from new elements
   */
  processNewElements(className) {
    // This will be called by MutationObserver when new elements are added
    const newElements = Array.from(document.getElementsByClassName(className));
    newElements.forEach(element => {
      if (!element.hasAttribute('data-hidethis-processed')) {
        element.classList.remove(className);
        element.setAttribute('data-hidethis-processed', 'true');
      }
    });
  }
  
  /**
   * Setup dynamic element detection with MutationObserver and IntersectionObserver
   */
  setupDynamicDetection() {
    try {
      // MutationObserver for new DOM elements
      this.mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // Process newly added nodes
            this.handleNewNodes(mutation.addedNodes);
          }
        });
      });
      
      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // IntersectionObserver for elements becoming visible
      this.intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.processVisibleElement(entry.target);
          }
        });
      }, {
        rootMargin: '250px' // Detect elements 250px before they become visible
      });
      
      // Observe all existing elements
      document.querySelectorAll('*').forEach(element => {
        this.intersectionObserver.observe(element);
      });
      
      console.log('[DomAttrsRemover] 🔍 Dynamic detection setup complete');
      
    } catch (error) {
      console.error('[DomAttrsRemover] ❌ Dynamic detection setup failed:', error);
    }
  }

  /**
   * Handle newly added nodes from MutationObserver
   * @param {NodeList} addedNodes - New nodes
   */
  async handleNewNodes(addedNodes) {
    addedNodes.forEach(async (node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // Observe new element for intersection
        if (this.intersectionObserver) {
          this.intersectionObserver.observe(node);
        }
        
        // Process the new element immediately with stored rules
        await this.processVisibleElement(node);
        
        // Process any child elements too
        const childElements = node.querySelectorAll ? node.querySelectorAll('*') : [];
        childElements.forEach(async (child) => {
          if (this.intersectionObserver) {
            this.intersectionObserver.observe(child);
          }
          // Process child elements immediately too
          await this.processVisibleElement(child);
        });
      }
    });
  }
  
  /**
   * Process element when it becomes visible
   * @param {Element} element - Element that became visible
   */
  async processVisibleElement(element) {
    try {
      // Apply any stored removals to this element
      const removedElements = await this.getRemovedElements();
      
      removedElements.forEach(removal => {
        if (removal.type === 'class') {
          const className = removal.selector.substring(1); // Remove the dot
          if (element.classList.contains(className)) {
            console.log(`[DomAttrsRemover] 🎯 Removing class "${className}" from visible element`);
            element.classList.remove(className);
          }
        }
      });
      
    } catch (error) {
      console.warn('[DomAttrsRemover] ⚠️ Error processing visible element:', error);
    }
  }

  /**
   * Store removed element data for persistence
   * @param {string} selector - The selector that was removed
   * @param {string} type - Type of removal (class, id, complex)
   * @param {number} count - Number of elements affected
   */
  async storeRemovedElement(selector, type, count) {
    if (!this.storageManager) return;
    
    try {
      const currentData = await this.storageManager.getDomainData(this.domain);
      const removedElements = currentData.removedElements || [];
      
      // Check if this selector already exists
      const existingIndex = removedElements.findIndex(item => item.selector === selector);
      
      const removalData = {
        selector: selector,
        type: type,
        count: count,
        timestamp: Date.now()
      };
      
      if (existingIndex !== -1) {
        // Update existing entry
        removedElements[existingIndex] = removalData;
      } else {
        // Add new entry
        removedElements.push(removalData);
      }
      
      currentData.removedElements = removedElements;
      await this.storageManager.saveDomainData(this.domain, currentData);
      
      console.log('[DomAttrsRemover] 💾 Stored removal data:', removalData);
      
    } catch (error) {
      console.error('[DomAttrsRemover] ❌ Error storing removal data:', error);
    }
  }

  /**
   * Get all removed elements for current domain
   * @returns {Array} Array of removal data
   */
  async getRemovedElements() {
    if (!this.storageManager) return [];
    
    try {
      const domainData = await this.storageManager.getDomainData(this.domain);
      return domainData.removedElements || [];
    } catch (error) {
      console.error('[DomAttrsRemover] ❌ Error getting removed elements:', error);
      return [];
    }
  }
  
  /**
   * Get count of stored removal rules for current domain
   * @returns {number} Count of removal rules
   */
  async getRemovedElementsCount() {
    try {
      const removedElements = await this.getRemovedElements();
      const rulesCount = removedElements.length; // Count rules, not elements
      
      console.log(`[DomAttrsRemover] 📊 Total removal rules: ${rulesCount}`);
      return rulesCount;
      
    } catch (error) {
      console.error('[DomAttrsRemover] ❌ Error getting count:', error);
      return 0;
    }
  }

  /**
   * Clear all removal rules and restore page
   * @returns {Object} Result with success status
   */
  async clearRemovedElements() {
    if (!this.storageManager) {
      throw new Error('Storage manager not available');
    }
    
    try {
      const currentData = await this.storageManager.getDomainData(this.domain);
      const rulesCount = (currentData.removedElements || []).length;
      
      // Clear the removal rules data
      currentData.removedElements = [];
      await this.storageManager.saveDomainData(this.domain, currentData);
      
      console.log(`[DomAttrsRemover] 🧹 Cleared ${rulesCount} removal rules`);
      
      // Reload page to restore everything
      window.location.reload();
      
      return {
        success: true,
        clearedCount: rulesCount
      };
      
    } catch (error) {
      console.error('[DomAttrsRemover] ❌ Error clearing removal rules:', error);
      ErrorHandler.handle(error, 'Clear removal rules');
      throw error;
    }
  }

  /**
   * Restore removed elements from storage (called on page load)
   */
  async restoreRemovedElements() {
    try {
      const removedElements = await this.getRemovedElements();
      
      if (removedElements.length === 0) {
        console.log('[DomAttrsRemover] 📄 No stored removals to restore');
        return;
      }
      
      console.log(`[DomAttrsRemover] 🔄 Restoring ${removedElements.length} removal patterns`);
      
      let totalRestored = 0;
      
      for (const removal of removedElements) {
        try {
          const result = await this.removeElements(removal.selector);
          if (result.success) {
            totalRestored += result.count;
          }
        } catch (error) {
          console.warn(`[DomAttrsRemover] ⚠️ Could not restore removal: ${removal.selector}`, error.message);
        }
      }
      
      console.log(`[DomAttrsRemover] ✅ Restored ${totalRestored} elements from storage`);
      
    } catch (error) {
      console.error('[DomAttrsRemover] ❌ Error restoring removals:', error);
    }
  }
  
  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
    
    console.log('[DomAttrsRemover] 🧹 Cleanup completed');
  }
}

// Global instance
if (typeof window !== 'undefined') {
  window.domAttrsRemover = new DomAttrsRemover();
  console.log('[DomAttrsRemover] 🚀 Global instance created');
}