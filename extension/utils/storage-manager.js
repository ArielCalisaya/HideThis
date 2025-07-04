/**
 * StorageManager - Manages persistent storage for HideThis extension
 * Stores data per domain with structure: { "domain.com": { hidden: [], invalidatedCSS: [] } }
 */
class StorageManager {
  constructor() {
    this.STORAGE_KEY = 'hidethis_data';
    this.cache = new Map(); // In-memory cache for performance
    this.initialized = false;
  }

  /**
   * Initialize the storage manager
   */
  async init() {
    if (this.initialized) return;
    
    try {
      await this.loadFromStorage();
      this.initialized = true;
      console.log('✅ StorageManager initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing StorageManager:', error);
      throw error;
    }
  }

  /**
   * Load all data from chrome.storage.local into cache
   */
  async loadFromStorage() {
    try {
      const result = await chrome.storage.local.get([this.STORAGE_KEY]);
      const data = result[this.STORAGE_KEY] || {};
      
      // Clear cache and populate with stored data
      this.cache.clear();
      Object.entries(data).forEach(([domain, domainData]) => {
        this.cache.set(domain, {
          hidden: domainData.hidden || [],
          invalidatedCSS: domainData.invalidatedCSS || []
        });
      });
      
      console.log('📦 Loaded storage data for', Object.keys(data).length, 'domains');
    } catch (error) {
      console.error('❌ Error loading from storage:', error);
      throw error;
    }
  }

  /**
   * Save all cache data to chrome.storage.local
   */
  async saveToStorage() {
    try {
      const data = {};
      this.cache.forEach((domainData, domain) => {
        data[domain] = {
          hidden: domainData.hidden,
          invalidatedCSS: domainData.invalidatedCSS
        };
      });
      
      await chrome.storage.local.set({ [this.STORAGE_KEY]: data });
      console.log('💾 Saved storage data for', Object.keys(data).length, 'domains');
    } catch (error) {
      console.error('❌ Error saving to storage:', error);
      throw error;
    }
  }

  /**
   * Get domain data, creating empty structure if not exists
   */
  getDomainData(domain) {
    if (!this.cache.has(domain)) {
      this.cache.set(domain, {
        hidden: [],
        invalidatedCSS: []
      });
    }
    return this.cache.get(domain);
  }

  /**
   * Get current domain from URL
   */
  getCurrentDomain(url = window.location.href) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      console.error('❌ Error parsing URL:', url, error);
      return 'unknown';
    }
  }

  // === HIDDEN ELEMENTS METHODS ===

  /**
   * Add hidden element selector for current domain
   */
  async addHiddenElement(selector, url = window.location.href) {
    await this.ensureInitialized();
    
    const domain = this.getCurrentDomain(url);
    const domainData = this.getDomainData(domain);
    
    if (!domainData.hidden.includes(selector)) {
      domainData.hidden.push(selector);
      await this.saveToStorage();
      console.log('✅ Added hidden element:', selector, 'for domain:', domain);
    }
  }

  /**
   * Remove hidden element selector for current domain
   */
  async removeHiddenElement(selector, url = window.location.href) {
    await this.ensureInitialized();
    
    const domain = this.getCurrentDomain(url);
    const domainData = this.getDomainData(domain);
    
    const index = domainData.hidden.indexOf(selector);
    if (index > -1) {
      domainData.hidden.splice(index, 1);
      await this.saveToStorage();
      console.log('✅ Removed hidden element:', selector, 'for domain:', domain);
      return true;
    }
    return false;
  }

  /**
   * Get all hidden element selectors for current domain
   */
  async getHiddenElements(url = window.location.href) {
    await this.ensureInitialized();
    
    const domain = this.getCurrentDomain(url);
    const domainData = this.getDomainData(domain);
    return [...domainData.hidden]; // Return copy
  }

  /**
   * Clear all hidden elements for current domain
   */
  async clearHiddenElements(url = window.location.href) {
    await this.ensureInitialized();
    
    const domain = this.getCurrentDomain(url);
    const domainData = this.getDomainData(domain);
    
    const count = domainData.hidden.length;
    domainData.hidden = [];
    await this.saveToStorage();
    console.log('✅ Cleared', count, 'hidden elements for domain:', domain);
    return count;
  }

  // === INVALIDATED CSS METHODS ===

  /**
   * Add invalidated CSS selector for current domain
   */
  async addInvalidatedCSS(selector, url = window.location.href) {
    await this.ensureInitialized();
    
    const domain = this.getCurrentDomain(url);
    const domainData = this.getDomainData(domain);
    
    if (!domainData.invalidatedCSS.includes(selector)) {
      domainData.invalidatedCSS.push(selector);
      await this.saveToStorage();
      console.log('✅ Added invalidated CSS:', selector, 'for domain:', domain);
    }
  }

  /**
   * Remove invalidated CSS selector for current domain
   */
  async removeInvalidatedCSS(selector, url = window.location.href) {
    await this.ensureInitialized();
    
    const domain = this.getCurrentDomain(url);
    const domainData = this.getDomainData(domain);
    
    const index = domainData.invalidatedCSS.indexOf(selector);
    if (index > -1) {
      domainData.invalidatedCSS.splice(index, 1);
      await this.saveToStorage();
      console.log('✅ Removed invalidated CSS:', selector, 'for domain:', domain);
      return true;
    }
    return false;
  }

  /**
   * Get all invalidated CSS selectors for current domain
   */
  async getInvalidatedCSS(url = window.location.href) {
    await this.ensureInitialized();
    
    const domain = this.getCurrentDomain(url);
    const domainData = this.getDomainData(domain);
    return [...domainData.invalidatedCSS]; // Return copy
  }

  /**
   * Clear all invalidated CSS for current domain
   */
  async clearInvalidatedCSS(url = window.location.href) {
    await this.ensureInitialized();
    
    const domain = this.getCurrentDomain(url);
    const domainData = this.getDomainData(domain);
    
    const count = domainData.invalidatedCSS.length;
    domainData.invalidatedCSS = [];
    await this.saveToStorage();
    console.log('✅ Cleared', count, 'invalidated CSS for domain:', domain);
    return count;
  }

  // === UTILITY METHODS ===

  /**
   * Get counts for current domain
   */
  async getCounts(url = window.location.href) {
    await this.ensureInitialized();
    
    const domain = this.getCurrentDomain(url);
    const domainData = this.getDomainData(domain);
    
    return {
      hidden: domainData.hidden.length,
      invalidatedCSS: domainData.invalidatedCSS.length
    };
  }

  /**
   * Get all domains with data
   */
  async getAllDomains() {
    await this.ensureInitialized();
    return Array.from(this.cache.keys());
  }

  /**
   * Remove all data for a specific domain
   */
  async removeDomain(domain) {
    await this.ensureInitialized();
    
    if (this.cache.has(domain)) {
      this.cache.delete(domain);
      await this.saveToStorage();
      console.log('✅ Removed all data for domain:', domain);
      return true;
    }
    return false;
  }

  /**
   * Clear all data (for debugging/reset)
   */
  async clearAllData() {
    await this.ensureInitialized();
    
    this.cache.clear();
    await chrome.storage.local.remove([this.STORAGE_KEY]);
    console.log('✅ Cleared all HideThis data');
  }

  /**
   * Ensure storage is initialized
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.init();
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    await this.ensureInitialized();
    
    const domains = Array.from(this.cache.keys());
    let totalHidden = 0;
    let totalInvalidated = 0;
    
    domains.forEach(domain => {
      const data = this.cache.get(domain);
      totalHidden += data.hidden.length;
      totalInvalidated += data.invalidatedCSS.length;
    });
    
    return {
      domains: domains.length,
      totalHidden,
      totalInvalidated,
      domainList: domains
    };
  }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
} 