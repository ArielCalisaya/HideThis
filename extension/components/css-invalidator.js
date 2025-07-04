/**
 * CSS Invalidator for HideThis extension
 * Handles invalidation of CSS classes and IDs by injecting override styles
 */
class CSSInvalidator {
  constructor(storageManager = null) {
    this.invalidatedSelectors = new Set();
    this.styleElement = null;
    this.storageManager = storageManager;
    this.init();
  }

  /**
   * Initializes the CSS invalidator
   */
  init() {
    this.createStyleElement();
    console.log('✅ CSSInvalidator initialized');
  }

  /**
   * Creates the style element for CSS overrides
   */
  createStyleElement() {
    // Remove existing style element if it exists
    const styleId = typeof Constants !== 'undefined' && Constants.CONFIG 
      ? Constants.CONFIG.CSS_INVALIDATION_STYLE_ID 
      : 'hidethis-css-invalidation';
    
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    // Create new style element
    this.styleElement = document.createElement('style');
    this.styleElement.id = styleId;
    this.styleElement.type = 'text/css';
    
    // Add to document head
    document.head.appendChild(this.styleElement);
  }

  /**
   * Invalidates a CSS selector by adding override rules
   * @param {string} selector - CSS selector to invalidate (.class or #id)
   * @returns {boolean} True if successfully invalidated
   */
  async invalidateSelector(selector) {
    try {
      // Validate selector
      if (!this.isValidSelector(selector)) {
        throw new Error(`Invalid CSS selector: ${selector}`);
      }

      // Check if already invalidated
      if (this.invalidatedSelectors.has(selector)) {
        console.log(`Selector ${selector} is already invalidated`);
        return true;
      }

      // Add to invalidated set
      this.invalidatedSelectors.add(selector);

      // Update style element
      this.updateStyleElement();

      // Persist to storage
      if (this.storageManager) {
        try {
          await this.storageManager.addInvalidatedCSS(selector);
        } catch (error) {
          console.error('Error persisting invalidated CSS:', error);
        }
      }

      console.log(`✅ CSS selector invalidated: ${selector}`);
      return true;
    } catch (error) {
      console.error('Error invalidating CSS selector:', error);
      return false;
    }
  }

  /**
   * Removes invalidation for a specific selector
   * @param {string} selector - CSS selector to restore
   * @returns {boolean} True if successfully restored
   */
  async restoreSelector(selector) {
    try {
      if (this.invalidatedSelectors.has(selector)) {
        this.invalidatedSelectors.delete(selector);
        this.updateStyleElement();
        
        // Remove from storage
        if (this.storageManager) {
          try {
            await this.storageManager.removeInvalidatedCSS(selector);
          } catch (error) {
            console.error('Error removing invalidated CSS from storage:', error);
          }
        }
        
        console.log(`✅ CSS selector restored: ${selector}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error restoring CSS selector:', error);
      return false;
    }
  }

  /**
   * Clears all invalidated CSS rules
   * @returns {number} Number of selectors that were cleared
   */
  async clearAllInvalidated() {
    try {
      const count = this.invalidatedSelectors.size;
      this.invalidatedSelectors.clear();
      this.updateStyleElement();
      
      // Clear from storage
      if (this.storageManager) {
        try {
          await this.storageManager.clearInvalidatedCSS();
        } catch (error) {
          console.error('Error clearing invalidated CSS from storage:', error);
        }
      }
      
      console.log(`✅ All CSS invalidations cleared (${count} selectors)`);
      return count;
    } catch (error) {
      console.error('Error clearing CSS invalidations:', error);
      return 0;
    }
  }

  /**
   * Gets the number of invalidated selectors
   * @returns {number} Count of invalidated selectors
   */
  getInvalidatedCount() {
    return this.invalidatedSelectors.size;
  }

  /**
   * Gets all invalidated selectors
   * @returns {Array<string>} Array of invalidated selectors
   */
  getInvalidatedSelectors() {
    return Array.from(this.invalidatedSelectors);
  }

  /**
   * Updates the style element with current invalidation rules
   */
  updateStyleElement() {
    if (!this.styleElement) {
      this.createStyleElement();
    }

    // Generate CSS rules for all invalidated selectors
    const cssRules = Array.from(this.invalidatedSelectors).map(selector => {
      return this.generateInvalidationRule(selector);
    });

    // Update style element content
    this.styleElement.textContent = cssRules.join('\n');
  }

  /**
   * Generates CSS invalidation rule for a selector
   * @param {string} selector - CSS selector
   * @returns {string} CSS rule that invalidates the selector
   */
  generateInvalidationRule(selector) {
    // Get CSS invalidation template
    const template = typeof Constants !== 'undefined' && Constants.STYLES 
      ? Constants.STYLES.CSS_INVALIDATION_TEMPLATE 
      : `
        all: unset !important;
        display: revert !important;
        position: static !important;
        top: auto !important;
        left: auto !important;
        right: auto !important;
        bottom: auto !important;
        width: auto !important;
        height: auto !important;
        max-width: none !important;
        max-height: none !important;
        min-width: 0 !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        background: transparent !important;
        opacity: 1 !important;
        visibility: visible !important;
        z-index: auto !important;
        transform: none !important;
        filter: none !important;
        backdrop-filter: none !important;
        pointer-events: auto !important;
        overflow: visible !important;
        clip: auto !important;
        clip-path: none !important;
        mask: none !important;
      `;

    // Create comprehensive invalidation rule
    return `
      ${selector} {
        ${template}
      }
      
      /* Additional specificity boost */
      html ${selector} {
        ${template}
      }
      
      /* Maximum specificity for stubborn rules */
      html body ${selector} {
        ${template}
      }
    `;
  }

  /**
   * Validates if a selector is valid for invalidation
   * @param {string} selector - CSS selector to validate
   * @returns {boolean} True if valid
   */
  isValidSelector(selector) {
    if (!selector || typeof selector !== 'string') {
      return false;
    }

    const trimmedSelector = selector.trim();

    // Must start with . or # or [
    if (!trimmedSelector.startsWith('.') && 
        !trimmedSelector.startsWith('#') && 
        !trimmedSelector.startsWith('[')) {
      return false;
    }

    // Must have content after . or # or [
    if (trimmedSelector.length <= 1) {
      return false;
    }

    // For attribute selectors, check if they are properly closed
    if (trimmedSelector.startsWith('[') && !trimmedSelector.endsWith(']')) {
      return false;
    }

    // Test if it's a valid CSS selector
    try {
      document.querySelector(trimmedSelector);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Checks if a selector is currently invalidated
   * @param {string} selector - CSS selector to check
   * @returns {boolean} True if invalidated
   */
  isInvalidated(selector) {
    return this.invalidatedSelectors.has(selector);
  }

  /**
   * Cleans up resources
   */
  cleanup() {
    if (this.styleElement && this.styleElement.parentNode) {
      this.styleElement.parentNode.removeChild(this.styleElement);
    }
    this.invalidatedSelectors.clear();
    this.styleElement = null;
  }

  /**
   * Gets status information about the invalidator
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      initialized: !!this.styleElement,
      invalidatedCount: this.invalidatedSelectors.size,
      invalidatedSelectors: this.getInvalidatedSelectors(),
      styleElementExists: !!document.getElementById(Constants.CONFIG.CSS_INVALIDATION_STYLE_ID)
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CSSInvalidator;
} else {
  window.CSSInvalidator = CSSInvalidator;
} 