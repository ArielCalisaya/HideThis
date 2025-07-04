// HideThis Element Selector
class ElementSelector {
  constructor() {
    this.isActive = false;
    this.hiddenElements = new Set();
    this.overlay = null;
    this.selectedElement = null;
    this.pendingElements = new Set(); // Elements selected but not yet hidden
    this.boundHandlers = null; // Store bound event handlers for proper removal
    this.cssInvalidator = null; // CSS invalidation manager
    this.storageManager = null; // Persistent storage manager
    this.init();
  }

  init() {
    console.log('🎯 HideThis ElementSelector initialized on:', window.location.href);
    
    try {
      // Create overlay for highlighting elements
      this.createOverlay();
      
      // Initialize storage manager first
      this.initializeStorageManager();
      
      // Listen for messages from popup
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        try {
          if (request.action === 'toggleSelector') {
            this.toggleSelector();
            sendResponse({ success: true, isActive: this.isActive });
          } else if (request.action === 'getSelectorState') {
            sendResponse({ success: true, isActive: this.isActive });
          } else if (request.action === 'toggleVisibility') {
            this.toggleHiddenElements();
            sendResponse({ success: true });
          } else if (request.action === 'clearAll') {
            this.clearAllHidden().then(() => {
              sendResponse({ success: true });
            }).catch(error => {
              sendResponse({ success: false, error: error.message });
            });
            return true; // Indicates async response
          } else if (request.action === 'getHiddenCount') {
            this.getHiddenCount().then(counts => {
              sendResponse({ 
                success: true, 
                count: counts.hidden,
                invalidatedCount: counts.invalidatedCSS
              });
            }).catch(error => {
              sendResponse({ 
                success: false, 
                error: error.message 
              });
            });
            return true; // Indicates async response
          } else if (request.action === 'invalidateCSS') {
            this.handleInvalidateCSS(request.selector, sendResponse);
            return true; // Indicates async response
          } else if (request.action === 'clearInvalidatedCSS') {
            this.handleClearInvalidatedCSS(sendResponse);
            return true; // Indicates async response
          } else if (request.action === 'getInvalidatedCount') {
            sendResponse({ count: this.cssInvalidator ? this.cssInvalidator.getInvalidatedCount() : 0 });
          } else if (request.action === 'getHiddenElementsList') {
            console.log('🔍 Content script: Getting hidden elements list');
            this.handleGetHiddenElementsList(sendResponse);
          } else if (request.action === 'getInvalidatedCSSList') {
            console.log('🔍 Content script: Getting invalidated CSS list');
            this.handleGetInvalidatedCSSList(sendResponse);
          } else if (request.action === 'removeHiddenElement') {
            this.handleRemoveHiddenElement(request.index, sendResponse);
          } else if (request.action === 'removeInvalidatedSelector') {
            this.handleRemoveInvalidatedSelector(request.index, sendResponse);
          } else if (request.action === 'ping') {
            sendResponse({ success: true, message: 'pong', url: window.location.href });
          } else {
            sendResponse({ success: false, error: 'Unknown action' });
          }
        } catch (error) {
          console.error('Error handling message:', error);
          sendResponse({ success: false, error: error.message });
        }
      });
      
      // Send a heartbeat to confirm we're loaded
      setTimeout(() => {
        try {
          chrome.runtime.sendMessage({ 
            action: 'contentScriptReady', 
            url: window.location.href,
            hostname: window.location.hostname,
            timestamp: new Date().toISOString()
          });
          
          // Special handling for YouTube and other SPAs
          if (window.location.hostname.includes('youtube.com')) {
            this.setupSPANavigationListener();
          }
        } catch (error) {
          console.error('Error sending heartbeat:', error);
        }
      }, 500);
      
    } catch (error) {
      console.error('Error in init():', error);
    }
  }

  /**
   * Initializes the CSS invalidator
   */
  initializeCSSInvalidator() {
    try {
      // Initialize the CSS invalidator component
      if (typeof CSSInvalidator !== 'undefined') {
        // Pass storageManager if available (will be set after storage initialization)
        this.cssInvalidator = new CSSInvalidator(this.storageManager);
        console.log('✅ CSS Invalidator initialized successfully');
      } else {
        console.warn('CSSInvalidator not available, CSS invalidation features disabled');
      }
    } catch (error) {
      console.error('Error initializing CSS invalidator:', error);
    }
  }

  /**
   * Initializes the storage manager and restores persistent data
   */
  async initializeStorageManager() {
    try {
      // Initialize the storage manager
      if (typeof StorageManager !== 'undefined') {
        this.storageManager = new StorageManager();
        await this.storageManager.init();
        console.log('✅ Storage Manager initialized successfully');
        
        // Now initialize CSS invalidator with storage manager
        this.initializeCSSInvalidator();
        
        // Restore hidden elements and CSS for current domain
        await this.restorePersistedData();
      } else {
        console.warn('StorageManager not available, persistence features disabled');
        // Initialize CSS invalidator without storage manager
        this.initializeCSSInvalidator();
      }
    } catch (error) {
      console.error('Error initializing Storage Manager:', error);
      // Initialize CSS invalidator without storage manager as fallback
      this.initializeCSSInvalidator();
    }
  }

  /**
   * Restores hidden elements and invalidated CSS for current domain
   */
  async restorePersistedData() {
    try {
      if (!this.storageManager) return;
      
      // Restore hidden elements
      const hiddenSelectors = await this.storageManager.getHiddenElements();
      let restoredHidden = 0;
      
      hiddenSelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
            if (!this.hiddenElements.has(element)) {
              this.hideElementDirectly(element);
              restoredHidden++;
            }
          });
        } catch (error) {
          console.warn('Error restoring hidden element with selector:', selector, error);
        }
      });
      
      // Restore invalidated CSS
      const invalidatedSelectors = await this.storageManager.getInvalidatedCSS();
      let restoredCSS = 0;
      
      if (this.cssInvalidator && invalidatedSelectors.length > 0) {
        for (const selector of invalidatedSelectors) {
          try {
            await this.cssInvalidator.invalidateSelector(selector);
            restoredCSS++;
          } catch (error) {
            console.warn('Error restoring invalidated CSS selector:', selector, error);
          }
        }
      }
      
      if (restoredHidden > 0 || restoredCSS > 0) {
        console.log(`🔄 Restored ${restoredHidden} hidden elements and ${restoredCSS} CSS rules for ${window.location.hostname}`);
      }
    } catch (error) {
      console.error('Error restoring persisted data:', error);
    }
  }

  /**
   * Gets current counts from storage (persistent data)
   */
  async getHiddenCount() {
    try {
      if (this.storageManager) {
        return await this.storageManager.getCounts();
      } else {
        // Fallback to in-memory counts
        return {
          hidden: this.hiddenElements.size,
          invalidatedCSS: this.cssInvalidator ? this.cssInvalidator.getInvalidatedCount() : 0
        };
      }
    } catch (error) {
      console.error('Error getting hidden count:', error);
      // Fallback to in-memory counts
      return {
        hidden: this.hiddenElements.size,
        invalidatedCSS: this.cssInvalidator ? this.cssInvalidator.getInvalidatedCount() : 0
      };
    }
  }

  /**
   * Handles CSS invalidation request
   * @param {string} selector - CSS selector to invalidate
   * @param {Function} sendResponse - Response callback
   */
  async handleInvalidateCSS(selector, sendResponse) {
    try {
      if (!this.cssInvalidator) {
        sendResponse({ 
          success: false, 
          error: 'CSS invalidation not available' 
        });
        return;
      }

      const success = await this.cssInvalidator.invalidateSelector(selector);
      
      if (success) {
        const count = this.cssInvalidator.getInvalidatedCount();
        
        // Notify popup of count update
        chrome.runtime.sendMessage({
          action: 'updateInvalidatedCount',
          count: count
        });
        
        sendResponse({ 
          success: true, 
          count: count,
          totalCount: count,
          selector: selector 
        });
      } else {
        sendResponse({ 
          success: false, 
          error: 'Failed to invalidate CSS selector' 
        });
      }
    } catch (error) {
      console.error('Error invalidating CSS:', error);
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    }
  }

  /**
   * Handles clearing all invalidated CSS
   * @param {Function} sendResponse - Response callback
   */
  async handleClearInvalidatedCSS(sendResponse) {
    try {
      if (!this.cssInvalidator) {
        sendResponse({ 
          success: false, 
          error: 'CSS invalidation not available' 
        });
        return;
      }

      const clearedCount = await this.cssInvalidator.clearAllInvalidated();
      
      // Notify popup of count update
      chrome.runtime.sendMessage({
        action: 'updateInvalidatedCount',
        count: 0
      });
      
      sendResponse({ 
        success: true, 
        count: 0,
        clearedCount: clearedCount 
      });
    } catch (error) {
      console.error('Error clearing invalidated CSS:', error);
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    }
  }

  createOverlay() {
    // Remove existing overlay if it exists
    const existingOverlay = document.getElementById('hidethis-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    this.overlay = document.createElement('div');
    this.overlay.id = 'hidethis-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(59, 130, 246, 0.15);
      pointer-events: none;
      z-index: 999999;
      display: none;
      backdrop-filter: blur(0.5px);
    `;
    document.body.appendChild(this.overlay);
  }

  toggleSelector() {
    this.isActive = !this.isActive;
    
    if (this.isActive) {
      this.activateSelector();
    } else {
      this.deactivateSelector();
    }
  }

  activateSelector() {
    this.overlay.style.display = 'block';
    document.body.style.cursor = 'crosshair';
    
    // Create bound handlers for proper removal later
    this.boundHandlers = {
      mouseOver: this.handleMouseOver.bind(this),
      mouseOut: this.handleMouseOut.bind(this),
      keyDown: this.handleKeyDown.bind(this),
      blockPageClicks: this.blockPageClicks.bind(this)
    };
    
    // Add event listeners with bound references
    document.addEventListener('mouseover', this.boundHandlers.mouseOver);
    document.addEventListener('mouseout', this.boundHandlers.mouseOut);
    document.addEventListener('keydown', this.boundHandlers.keyDown);
    
    // Block all page clicks in capture phase before they reach their targets
    document.addEventListener('click', this.boundHandlers.blockPageClicks, { capture: true });
    
    // Show instructions
    this.showInstructions();
  }

  deactivateSelector() {
    this.overlay.style.display = 'none';
    document.body.style.cursor = 'default';
    
    // Store references to bound functions for proper removal
    if (this.boundHandlers) {
      document.removeEventListener('mouseover', this.boundHandlers.mouseOver);
      document.removeEventListener('mouseout', this.boundHandlers.mouseOut);
      document.removeEventListener('keydown', this.boundHandlers.keyDown);
      document.removeEventListener('click', this.boundHandlers.blockPageClicks, { capture: true });
      this.boundHandlers = null;
    }
    
    // Clear all selection styling
    if (this.selectedElement) {
      this.selectedElement.style.outline = '';
      this.selectedElement.style.outlineOffset = '';
      this.selectedElement = null;
    }
    
    // Clear any remaining outlines from rapid mouse movement
    this.clearAllOutlines();
    
    // Clear any pending selection styling
    this.pendingElements.forEach(element => {
      element.style.backgroundColor = '';
      element.style.border = '';
      element.style.outline = '';
      element.style.outlineOffset = '';
    });
    
    // Hide instructions and element info
    this.hideInstructions();
    this.hideElementInfo();
    this.hideSelectionControls();
  }

  handleMouseOver(event) {
    if (!this.isActive) return;
    
    // Prevent any default behavior while in selection mode
    event.preventDefault();
    event.stopPropagation();
    
    const element = event.target;
    if (element === this.overlay || element === document.body) return;
    
    // Clear previous selection
    if (this.selectedElement) {
      this.selectedElement.style.outline = '';
      this.selectedElement.style.outlineOffset = '';
    }
    
    // Find the best element to select (could be a parent container)
    const targetElement = this.findBestElementToSelect(element);
    
    // Highlight element
    targetElement.style.outline = '2px solid #3b82f6';
    targetElement.style.outlineOffset = '2px';
    this.selectedElement = targetElement;
    
    // Show element info
    this.showElementInfo(targetElement);
  }

  handleMouseOut(event) {
    if (!this.isActive) return;
    
    // Prevent any default behavior while in selection mode
    event.preventDefault();
    event.stopPropagation();
    
    const element = event.target;
    if (element === this.overlay || element === document.body) return;
    
    // Remove highlight from the selected element
    if (this.selectedElement) {
      this.selectedElement.style.outline = '';
      this.selectedElement.style.outlineOffset = '';
      this.selectedElement = null;
    }
  }

  blockPageClicks(event) {
    if (!this.isActive) return;
    
    // Don't block clicks on our extension UI elements
    if (event.target.closest('#hidethis-instructions') ||
        event.target.closest('#hidethis-element-info') ||
        event.target.closest('#hidethis-selection-controls') ||
        (event.target.id && event.target.id.startsWith('hidethis-'))) {
      return;
    }
    
    // Block ALL clicks completely before any other handlers can process them
    event.preventDefault();
    event.stopImmediatePropagation();
    
    // Now handle our own selection logic
    this.handleSelectionClick(event);
  }

  handleSelectionClick(event) {
    const element = event.target;
    if (element === this.overlay || element === document.body) return;
    
    // If we already have a selected element (from arrow navigation), use that
    // Otherwise, find the best element to select
    let targetElement;
    if (this.selectedElement) {
      // Check if the click was on the selected element or one of its children
      const clickedOnSelected = this.selectedElement === element || this.selectedElement.contains(element);
      if (clickedOnSelected) {
        targetElement = this.selectedElement;
      } else {
        // Click was outside the selected element, find new target
        targetElement = this.findBestElementToSelect(element);
      }
    } else {
      // No element pre-selected, use normal logic
      targetElement = this.findBestElementToSelect(element);
    }
    
    // Toggle selection of this element
    this.toggleElementSelection(targetElement);
    
    // Update the current selected element for arrow navigation
    this.selectedElement = targetElement;
    this.showElementInfo(targetElement);
  }

  handleKeyDown(event) {
    if (!this.isActive) return;
    
    if (event.key === 'Escape') {
      this.cancelSelection();
    }
    
    // Confirm selection with Enter
    if (event.key === 'Enter') {
      this.confirmSelection();
    }
    
    // Allow users to select parent elements with arrow keys
    if (event.key === 'ArrowUp' && this.selectedElement) {
      event.preventDefault();
      this.selectParentElement();
    }
    
    if (event.key === 'ArrowDown' && this.selectedElement) {
      event.preventDefault();
      this.selectChildElement();
    }
  }

  findBestElementToSelect(element) {
    // Strategy: Find a meaningful container, not just text nodes or tiny elements
    
    // Skip text nodes, comments, etc.
    if (element.nodeType !== Node.ELEMENT_NODE) {
      return element.parentElement || element;
    }
    
    // If it's a very small element (like a span with just text), try to find a better parent
    const rect = element.getBoundingClientRect();
    const isSmallElement = rect.width < 50 || rect.height < 20;
    
    // Common elements that are usually too small/specific
    const isInlineElement = ['SPAN', 'A', 'STRONG', 'EM', 'B', 'I', 'CODE'].includes(element.tagName);
    
    if (isSmallElement || isInlineElement) {
      // Try to find a better parent container
      let parent = element.parentElement;
      let depth = 0;
      
      while (parent && depth < 3) { // Don't go too far up
        const parentRect = parent.getBoundingClientRect();
        
        // Stop if we hit these major containers
        if (['BODY', 'HTML', 'MAIN', 'HEADER', 'FOOTER', 'NAV'].includes(parent.tagName)) {
          break;
        }
        
        // If parent is significantly larger and is a block-level element, use it
        if (parentRect.width > rect.width * 1.5 || parentRect.height > rect.height * 1.5) {
          const isBlockElement = ['DIV', 'SECTION', 'ARTICLE', 'ASIDE', 'P', 'LI', 'UL', 'OL'].includes(parent.tagName);
          if (isBlockElement) {
            return parent;
          }
        }
        
        parent = parent.parentElement;
        depth++;
      }
    }
    
    return element; // Return original if no better parent found
  }

  selectParentElement() {
    if (!this.selectedElement) return;
    
    const parent = this.selectedElement.parentElement;
    if (parent && parent !== document.body && parent !== document.documentElement) {
      // Clear current selection
      this.selectedElement.style.outline = '';
      this.selectedElement.style.outlineOffset = '';
      
      // Select parent
      this.selectedElement = parent;
      parent.style.outline = '2px solid #3b82f6';
      parent.style.outlineOffset = '2px';
      
      this.showElementInfo(parent);
    }
  }

  selectChildElement() {
    if (!this.selectedElement) return;
    
    // Find the first meaningful child element
    const children = Array.from(this.selectedElement.children);
    const meaningfulChild = children.find(child => {
      const rect = child.getBoundingClientRect();
      return rect.width > 20 && rect.height > 20; // Has some size
    });
    
    if (meaningfulChild) {
      // Clear current selection
      this.selectedElement.style.outline = '';
      this.selectedElement.style.outlineOffset = '';
      
      // Select child
      this.selectedElement = meaningfulChild;
      meaningfulChild.style.outline = '2px solid #3b82f6';
      meaningfulChild.style.outlineOffset = '2px';
      
      this.showElementInfo(meaningfulChild);
    }
  }

  showElementInfo(element) {
    // Remove previous info
    const prevInfo = document.getElementById('hidethis-element-info');
    if (prevInfo) prevInfo.remove();
    
    // Create info display
    const info = document.createElement('div');
    info.id = 'hidethis-element-info';
    info.style.cssText = `
      position: fixed;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      background: #374151;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      z-index: 1000001;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      max-width: 400px;
      text-align: center;
    `;
    
    const rect = element.getBoundingClientRect();
    const tagName = element.tagName.toLowerCase();
    const className = element.className ? `.${element.className.split(' ').join('.')}` : '';
    const id = element.id ? `#${element.id}` : '';
    
    // Get CSS selectors that would be invalidated
    const selectors = this.generateCSSSelectorsForElement(element);
    const selectorsText = selectors.length > 0 
      ? `<div style="font-size: 10px; opacity: 0.7; margin-top: 4px;">
           CSS a invalidar: ${selectors.join(', ')}
         </div>`
      : `<div style="font-size: 10px; opacity: 0.7; margin-top: 4px; color: #fbbf24;">
           Sin clases/ID para invalidar
         </div>`;
    
    info.innerHTML = `
      <div><strong>${tagName}${id}${className}</strong></div>
      <div style="font-size: 10px; opacity: 0.8;">
        ${Math.round(rect.width)}×${Math.round(rect.height)}px
        • Use ↑↓ arrows to select parent/child
      </div>
      ${selectorsText}
    `;
    
    document.body.appendChild(info);
  }

  toggleElementSelection(element) {
    if (this.pendingElements.has(element)) {
      // Deselect element
      this.pendingElements.delete(element);
      element.style.backgroundColor = '';
      element.style.border = '';
    } else {
      // Select element
      this.pendingElements.add(element);
      element.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
      element.style.border = '2px solid #3b82f6';
    }
    
    this.updateSelectionControls();
  }

  updateSelectionControls() {
    // Remove existing controls
    const existingControls = document.getElementById('hidethis-selection-controls');
    if (existingControls) existingControls.remove();
    
    if (this.pendingElements.size === 0) return;
    
    // Create selection controls
    const controls = document.createElement('div');
    controls.id = 'hidethis-selection-controls';
    controls.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #1f2937;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 1000002;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
      justify-content: center;
    `;
    
    controls.innerHTML = `
      <span style="flex-basis: 100%; text-align: center; margin-bottom: 8px;">
        ${this.pendingElements.size} elemento${this.pendingElements.size !== 1 ? 's' : ''} seleccionado${this.pendingElements.size !== 1 ? 's' : ''}
      </span>
      <button id="hidethis-confirm" style="
        background: #10b981;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
      ">✓ Ocultar</button>
      <button id="hidethis-invalidate" style="
        background: #f59e0b;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
      ">⚡ Invalidar CSS</button>
      <button id="hidethis-cancel" style="
        background: #ef4444;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
      ">✕ Cancelar</button>
    `;
    
    document.body.appendChild(controls);
    
    // Add event listeners to buttons
    document.getElementById('hidethis-confirm').addEventListener('click', () => this.confirmSelection());
            document.getElementById('hidethis-invalidate').addEventListener('click', async () => await this.invalidateSelectedElements());
    document.getElementById('hidethis-cancel').addEventListener('click', () => this.cancelSelection());
  }

  confirmSelection() {
    // Hide all selected elements
    this.pendingElements.forEach(element => {
      // Clear selection styling before hiding
      element.style.backgroundColor = '';
      element.style.border = '';
      
      // Hide the element
      this.hideElement(element);
    });
    
    // Clear pending elements
    this.pendingElements.clear();
    
    // Deactivate selector
    this.deactivateSelector();
    this.isActive = false;
  }

  /**
   * Invalidates CSS for selected elements
   */
  async invalidateSelectedElements() {
    if (!this.cssInvalidator) {
      alert('CSS Invalidator no está disponible');
      return;
    }

    let invalidatedCount = 0;
    const processedSelectors = new Set();

    // Process each selected element
    for (const element of this.pendingElements) {
      // Clear selection styling
      element.style.backgroundColor = '';
      element.style.border = '';
      
      // Generate CSS selectors for this element
      const selectors = this.generateCSSSelectorsForElement(element);
      
      // Invalidate each unique selector
      for (const selector of selectors) {
        if (!processedSelectors.has(selector)) {
          processedSelectors.add(selector);
          if (await this.cssInvalidator.invalidateSelector(selector)) {
            invalidatedCount++;
          }
        }
      }
    }

    // Show feedback
    if (invalidatedCount > 0) {
      this.showInvalidationFeedback(invalidatedCount, processedSelectors.size);
      
      // Notify popup of count update
      chrome.runtime.sendMessage({
        action: 'updateInvalidatedCount',
        count: this.cssInvalidator.getInvalidatedCount()
      });
    } else {
      alert('No se pudo invalidar CSS para los elementos seleccionados');
    }

    // Clear pending elements
    this.pendingElements.clear();
    
    // Deactivate selector
    this.deactivateSelector();
    this.isActive = false;
  }

  cancelSelection() {
    // Clear selection styling from all pending elements
    this.pendingElements.forEach(element => {
      element.style.backgroundColor = '';
      element.style.border = '';
      element.style.outline = '';
      element.style.outlineOffset = '';
    });
    
    // Clear pending elements
    this.pendingElements.clear();
    
    // Clear any remaining outlines
    this.clearAllOutlines();
    
    // Deactivate selector
    this.deactivateSelector();
    this.isActive = false;
  }

  /**
   * Generates CSS selectors for an element (classes and ID)
   * @param {Element} element - Element to generate selectors for
   * @returns {Array<string>} Array of CSS selectors
   */
  generateCSSSelectorsForElement(element) {
    const selectors = [];

    // Add ID selector if element has an ID
    if (element.id) {
      selectors.push(`#${element.id}`);
    }

    // Add class selectors if element has classes
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ')
        .filter(cls => cls.trim().length > 0)
        .filter(cls => !cls.startsWith('hidethis-')); // Exclude our own classes

      classes.forEach(cls => {
        selectors.push(`.${cls}`);
      });
    }

    // If no ID or classes, try to find useful attribute selectors
    if (selectors.length === 0) {
      // Check for common attributes that might be useful
      const usefulAttributes = ['data-testid', 'data-id', 'data-component', 'role', 'aria-label'];
      
      for (const attr of usefulAttributes) {
        if (element.hasAttribute(attr)) {
          const value = element.getAttribute(attr);
          if (value) {
            selectors.push(`[${attr}="${value}"]`);
          }
        }
      }
    }

    return selectors;
  }

  /**
   * Shows feedback about CSS invalidation
   * @param {number} invalidatedCount - Number of selectors invalidated
   * @param {number} totalSelectors - Total number of selectors processed
   */
  showInvalidationFeedback(invalidatedCount, totalSelectors) {
    // Create feedback element
    const feedback = document.createElement('div');
    feedback.id = 'hidethis-invalidation-feedback';
    feedback.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #059669;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 1000003;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      text-align: center;
      min-width: 200px;
    `;

    feedback.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px;">
        ✅ CSS Invalidado
      </div>
      <div style="font-size: 12px; opacity: 0.9;">
        ${invalidatedCount} selector${invalidatedCount !== 1 ? 'es' : ''} invalidado${invalidatedCount !== 1 ? 's' : ''}
      </div>
    `;

    document.body.appendChild(feedback);

    // Remove feedback after 3 seconds
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.parentNode.removeChild(feedback);
      }
    }, 3000);
  }

  /**
   * Handles getting the list of hidden elements
   * @param {Function} sendResponse - Response callback
   */
  handleGetHiddenElementsList(sendResponse) {
    try {
      console.log('📋 Hidden elements count:', this.hiddenElements.size);
      const elements = Array.from(this.hiddenElements).map((element, index) => {
        const rect = element.getBoundingClientRect();
        const classes = element.className 
          ? element.className.split(' ').filter(cls => cls.trim() && !cls.startsWith('hidethis-'))
          : [];
        
        return {
          index: index,
          tagName: element.tagName.toLowerCase(),
          id: element.id || null,
          classes: classes,
          size: {
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          },
          selector: this.generateElementSelector(element)
        };
      });

      console.log('✅ Sending hidden elements response:', elements.length, 'elements');
      sendResponse({
        success: true,
        elements: elements,
        count: elements.length
      });
    } catch (error) {
      console.error('Error getting hidden elements list:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handles getting the list of invalidated CSS selectors
   * @param {Function} sendResponse - Response callback
   */
  handleGetInvalidatedCSSList(sendResponse) {
    try {
      if (!this.cssInvalidator) {
        console.log('⚠️ CSS Invalidator not available');
        sendResponse({
          success: true,
          selectors: [],
          count: 0
        });
        return;
      }

      const invalidatedSelectors = this.cssInvalidator.getInvalidatedSelectors();
      console.log('📋 Invalidated selectors count:', invalidatedSelectors.length);
      const selectors = invalidatedSelectors.map((selector, index) => {
        let type = 'other';
        if (selector.startsWith('.')) type = 'class';
        else if (selector.startsWith('#')) type = 'id';
        else if (selector.startsWith('[')) type = 'attribute';

        return {
          index: index,
          selector: selector,
          type: type
        };
      });

      console.log('✅ Sending CSS selectors response:', selectors.length, 'selectors');
      sendResponse({
        success: true,
        selectors: selectors,
        count: selectors.length
      });
    } catch (error) {
      console.error('Error getting invalidated CSS list:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handles removing a specific hidden element
   * @param {number} index - Index of element to remove
   * @param {Function} sendResponse - Response callback
   */
  handleRemoveHiddenElement(index, sendResponse) {
    try {
      const elementsArray = Array.from(this.hiddenElements);
      
      if (index >= 0 && index < elementsArray.length) {
        const element = elementsArray[index];
        this.showElement(element);
        
        sendResponse({
          success: true,
          count: this.hiddenElements.size
        });

        // Notify popup of count update
        chrome.runtime.sendMessage({
          action: 'elementHidden',
          count: this.hiddenElements.size
        });
      } else {
        sendResponse({
          success: false,
          error: 'Invalid element index'
        });
      }
    } catch (error) {
      console.error('Error removing hidden element:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handles removing a specific invalidated CSS selector
   * @param {number} index - Index of selector to remove
   * @param {Function} sendResponse - Response callback
   */
  handleRemoveInvalidatedSelector(index, sendResponse) {
    try {
      if (!this.cssInvalidator) {
        sendResponse({
          success: false,
          error: 'CSS invalidator not available'
        });
        return;
      }

      const selectors = this.cssInvalidator.getInvalidatedSelectors();
      
      if (index >= 0 && index < selectors.length) {
        const selector = selectors[index];
        const success = this.cssInvalidator.restoreSelector(selector);
        
        if (success) {
          sendResponse({
            success: true,
            count: this.cssInvalidator.getInvalidatedCount()
          });

          // Notify popup of count update
          chrome.runtime.sendMessage({
            action: 'updateInvalidatedCount',
            count: this.cssInvalidator.getInvalidatedCount()
          });
        } else {
          sendResponse({
            success: false,
            error: 'Failed to restore CSS selector'
          });
        }
      } else {
        sendResponse({
          success: false,
          error: 'Invalid selector index'
        });
      }
    } catch (error) {
      console.error('Error removing invalidated selector:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Generates a CSS selector for an element
   * @param {Element} element - Element to generate selector for
   * @returns {string} CSS selector
   */
  generateElementSelector(element) {
    if (element.id) {
      return `#${element.id}`;
    }
    
    const classes = element.className 
      ? element.className.split(' ').filter(cls => cls.trim() && !cls.startsWith('hidethis-'))
      : [];
    
    if (classes.length > 0) {
      return `.${classes.join('.')}`;
    }
    
    return element.tagName.toLowerCase();
  }

  hideElement(element) {
    // Hide element and persist selector
    this.hideElementDirectly(element);
    
    // Persist selector to storage
    if (this.storageManager) {
      const selector = this.generateElementSelector(element);
      this.storageManager.addHiddenElement(selector).catch(error => {
        console.error('Error persisting hidden element:', error);
      });
    }
    
    // Notify popup
    chrome.runtime.sendMessage({
      action: 'elementHidden',
      count: this.hiddenElements.size
    });
  }

  hideElementDirectly(element) {
    // Save element reference and original display value
    this.hiddenElements.add(element);
    
    // Store original display value to restore later
    const originalDisplay = element.style.display || getComputedStyle(element).display;
    element.setAttribute('data-hidethis-original-display', originalDisplay);
    
    // Hide element completely
    element.style.display = 'none';
    element.setAttribute('data-hidethis-hidden', 'true');
  }

  showElement(element) {
    // Restore original display value
    const originalDisplay = element.getAttribute('data-hidethis-original-display');
    if (originalDisplay && originalDisplay !== 'none') {
      element.style.display = originalDisplay;
    } else {
      element.style.display = '';
    }
    
    // Clean up attributes
    element.removeAttribute('data-hidethis-hidden');
    element.removeAttribute('data-hidethis-original-display');
    this.hiddenElements.delete(element);
    
    // Remove from persistent storage
    if (this.storageManager) {
      const selector = this.generateElementSelector(element);
      this.storageManager.removeHiddenElement(selector).catch(error => {
        console.error('Error removing hidden element from storage:', error);
      });
    }
  }

  toggleHiddenElements() {
    const isVisible = this.hiddenElements.size > 0 && 
                     Array.from(this.hiddenElements)[0].style.display !== 'none';
    
    this.hiddenElements.forEach(element => {
      if (isVisible) {
        // Hide: set display to none
        const originalDisplay = element.getAttribute('data-hidethis-original-display') || 
                               getComputedStyle(element).display;
        if (!element.getAttribute('data-hidethis-original-display')) {
          element.setAttribute('data-hidethis-original-display', originalDisplay);
        }
        element.style.display = 'none';
      } else {
        // Show: restore original display
        const originalDisplay = element.getAttribute('data-hidethis-original-display');
        if (originalDisplay && originalDisplay !== 'none') {
          element.style.display = originalDisplay;
        } else {
          element.style.display = '';
        }
      }
    });
  }

  async clearAllHidden() {
    this.hiddenElements.forEach(element => {
      this.showElement(element);
    });
    this.hiddenElements.clear();
    
    // Clear from persistent storage
    if (this.storageManager) {
      try {
        await this.storageManager.clearHiddenElements();
      } catch (error) {
        console.error('Error clearing hidden elements from storage:', error);
      }
    }
    
    // Notify popup
    chrome.runtime.sendMessage({
      action: 'elementsCleared',
      count: 0
    });
  }

  showInstructions() {
    const instructions = document.createElement('div');
    instructions.id = 'hidethis-instructions';
    instructions.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #1f2937;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 1000000;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    instructions.textContent = '🎯 MODO SELECCIÓN ACTIVO • Click para seleccionar • ↑↓ para navegar • Enter confirmar • ESC cancelar';
    document.body.appendChild(instructions);
  }

  hideInstructions() {
    const instructions = document.getElementById('hidethis-instructions');
    if (instructions) {
      instructions.remove();
    }
  }

  hideElementInfo() {
    const info = document.getElementById('hidethis-element-info');
    if (info) {
      info.remove();
    }
  }

  hideSelectionControls() {
    const controls = document.getElementById('hidethis-selection-controls');
    if (controls) {
      controls.remove();
    }
  }

  clearAllOutlines() {
    // Find all elements that might have our outline styling
    const elementsWithOutline = document.querySelectorAll('[style*="outline"]');
    elementsWithOutline.forEach(element => {
      // Only clear our specific outline style
      if (element.style.outline.includes('#3b82f6') || element.style.outline.includes('2px solid')) {
        element.style.outline = '';
        element.style.outlineOffset = '';
      }
    });
  }

  setupSPANavigationListener() {
    // YouTube uses pushState/replaceState for navigation
    // We need to listen for these changes and reinitialize if needed
    
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    const self = this;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(() => {
        if (!document.getElementById('hidethis-overlay')) {
          self.createOverlay();
        }
        // Reinitialize CSS invalidator if needed
        if (self.cssInvalidator && !document.getElementById('hidethis-css-invalidation')) {
          self.cssInvalidator.createStyleElement();
        }
      }, 1000);
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(() => {
        if (!document.getElementById('hidethis-overlay')) {
          self.createOverlay();
        }
        // Reinitialize CSS invalidator if needed
        if (self.cssInvalidator && !document.getElementById('hidethis-css-invalidation')) {
          self.cssInvalidator.createStyleElement();
        }
      }, 1000);
    };
    
    // Also listen for popstate events
    window.addEventListener('popstate', () => {
      setTimeout(() => {
        if (!document.getElementById('hidethis-overlay')) {
          this.createOverlay();
        }
        // Reinitialize CSS invalidator if needed
        if (this.cssInvalidator && !document.getElementById('hidethis-css-invalidation')) {
          this.cssInvalidator.createStyleElement();
        }
      }, 1000);
    });
  }
}

// Initialize selector when DOM is ready
console.log('🔄 Content script starting to load on:', window.location.href);

try {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      try {
        new ElementSelector();
      } catch (error) {
        console.error('Error initializing ElementSelector:', error);
      }
    });
  } else {
    try {
      new ElementSelector();
    } catch (error) {
      console.error('Error initializing ElementSelector:', error);
    }
  }
} catch (error) {
  console.error('Critical error in content script:', error);
} 