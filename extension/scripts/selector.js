// HideThis Element Selector
class ElementSelector {
  constructor() {
    // Initialize properties
    this.isActive = false;
    this.isInitialized = false;
    this.isFullyInitialized = false;
    this.selectedElement = null;
    this.highlightedElement = null;
    this.pendingSelection = new Set();
    this.hiddenElements = new Set();
    this.overlay = null;
    this.instructions = null;
    this.elementInfo = null;
    this.selectionControls = null;
    
    // Component references
    this.elementSelector = null; // ElementSelector component reference  
    // CSS invalidation functionality removed - now using DomAttrsRemover
    this.storageManager = null; // Persistent storage manager
    this.domAttrsRemover = null; // DomAttrsRemover instance
    
    // Initialize async
    this.initializeAsync();
  }

  /**
   * Async initialization wrapper
   */
  async initializeAsync() {
    try {
      await this.init();
    } catch (error) {
      console.error('[Selector] ❌ Async initialization failed:', error);
    }
  }

  async init() {
        try {
      console.log('[Selector] 🚀 Starting content script initialization...');
      
      // Wait a bit for the page to stabilize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if already initialized
      if (this.isInitialized) {
        console.log('[Selector] ⚠️ Already initialized, skipping');
        return;
      }
      
      this.isInitialized = true;
      console.log('[Selector] 📍 Initialization step 1: Basic setup');
      
      // Create overlay element
      this.createOverlay();
      console.log('✅ Overlay created successfully');
      
      // Initialize components
      await this.initializeStorageManager();
      console.log('✅ Storage Manager setup completed');
      
      await this.setupDomAttrsRemover();
      console.log('✅ DomAttrsRemover setup completed');
      
      // Set up initial message listener
      this.setupInitialMessageListener();
      console.log('✅ Message listener setup completed');
      
      console.log('[Selector] ✅ All components initialized successfully');
      this.isFullyInitialized = true;
      
      // Send a heartbeat to confirm we're loaded
      setTimeout(() => {
        try {
          console.log('💓 Sending heartbeat to background script...');
          chrome.runtime.sendMessage({ 
            action: 'contentScriptReady', 
            url: window.location.href,
            hostname: window.location.hostname,
            timestamp: new Date().toISOString()
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.warn('⚠️ Heartbeat failed:', chrome.runtime.lastError.message);
            } else {
              console.log('✅ Heartbeat sent successfully');
            }
          });
          
          // Special handling for YouTube and other SPAs
          if (window.location.hostname.includes('youtube.com')) {
            this.setupSPANavigationListener();
          }
        } catch (error) {
          console.error('💥 Error sending heartbeat:', error);
        }
      }, 500);
      
      console.log('🚀 Content script initialization completed successfully');
      
    } catch (error) {
      console.error('💥 Critical error in content script init():', error);
      console.error('Stack trace:', error.stack);
    }
  }

  /**
   * CSS invalidation functionality has been removed and replaced with DomAttrsRemover
   */

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
        
        // Restore hidden elements and removed elements for current domain
        await this.restorePersistedData();
      } else {
        console.warn('StorageManager not available, persistence features disabled');
      }
    } catch (error) {
      console.error('Error initializing Storage Manager:', error);
    }
  }

  /**
   * Restores hidden elements and removed elements for current domain
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
      
      // Restore removed elements (will be handled by DomAttrsRemover when it initializes)
      
      if (restoredHidden > 0) {
        console.log(`🔄 Restored ${restoredHidden} hidden elements for ${window.location.hostname}`);
      }
    } catch (error) {
      console.error('Error restoring persisted data:', error);
    }
  }

  /**
   * Get count of hidden elements and removed elements
   * @returns {Object} Counts object with hidden and removedElements
   */
  async getHiddenCount() {
    try {
      const hiddenCount = await this.storageManager.getHiddenCount();
      
      let removedElementsCount = 0;
      if (this.domAttrsRemover) {
        try {
          removedElementsCount = await this.domAttrsRemover.getRemovedElementsCount();
        } catch (error) {
          console.warn('[Selector] Could not get removed elements count:', error);
        }
      }
      
      console.log(`[Selector] 📊 Counts - Hidden: ${hiddenCount}, Removed: ${removedElementsCount}`);
      
      return {
        hidden: hiddenCount,
        removedElements: removedElementsCount
      };
      
    } catch (error) {
      console.error('[Selector] ❌ Error getting counts:', error);
      return {
        hidden: 0,
        removedElements: 0
      };
    }
  }

  /**
   * CSS invalidation functionality has been removed
   */

  /**
   * Handles clearing all invalidated CSS
   * @param {Function} sendResponse - Response callback
   */
  /**
   * CSS invalidation functionality has been removed
   */

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
    this.pendingSelection.forEach(element => {
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
    if (this.pendingSelection.has(element)) {
      // Deselect element
      this.pendingSelection.delete(element);
      element.style.backgroundColor = '';
      element.style.border = '';
    } else {
      // Select element
      this.pendingSelection.add(element);
      element.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
      element.style.border = '2px solid #3b82f6';
    }
    
    this.updateSelectionControls();
  }

  updateSelectionControls() {
    // Remove existing controls
    const existingControls = document.getElementById('hidethis-selection-controls');
    if (existingControls) existingControls.remove();
    
    if (this.pendingSelection.size === 0) return;
    
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
        ${this.pendingSelection.size} elemento${this.pendingSelection.size !== 1 ? 's' : ''} seleccionado${this.pendingSelection.size !== 1 ? 's' : ''}
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
    console.log('[Selector] 🎯 Confirming selection with removal options');
    
    if (this.pendingSelection.size === 0) {
      console.log('[Selector] ⚠️ No elements selected');
      return;
    }

    // Show action selection dialog
    this.showActionSelectionDialog();
  }

  /**
   * Show dialog to choose between hide or remove actions
   */
  showActionSelectionDialog() {
    // Remove existing dialog
    const existingDialog = document.getElementById('hidethis-action-dialog');
    if (existingDialog) existingDialog.remove();

    const dialog = document.createElement('div');
    dialog.id = 'hidethis-action-dialog';
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.95);
      color: white;
      padding: 20px;
      border-radius: 12px;
      font-family: Arial, sans-serif;
      z-index: 1000010;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      min-width: 300px;
      text-align: center;
    `;

    dialog.innerHTML = `
      <h3 style="margin: 0 0 16px 0; color: #3b82f6;">
        🎯 Acción para ${this.pendingSelection.size} elemento${this.pendingSelection.size !== 1 ? 's' : ''}
      </h3>
      <p style="margin: 0 0 20px 0; color: #ccc; font-size: 14px;">
        Elige qué hacer con los elementos seleccionados:
      </p>
      <div style="display: flex; gap: 12px; justify-content: center;">
        <button id="hidethis-action-hide" style="
          background: #3b82f6;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        ">
          👁️ Ocultar
        </button>
        <button id="hidethis-action-remove" style="
          background: #ef4444;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        ">
          🗑️ Eliminar
        </button>
        <button id="hidethis-action-cancel" style="
          background: #6b7280;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        ">
          ❌ Cancelar
        </button>
      </div>
    `;

    document.body.appendChild(dialog);

    // Add event listeners
    const hideBtn = dialog.querySelector('#hidethis-action-hide');
    const removeBtn = dialog.querySelector('#hidethis-action-remove');
    const cancelBtn = dialog.querySelector('#hidethis-action-cancel');

    hideBtn.addEventListener('click', () => {
      this.executeHideAction();
      dialog.remove();
    });

    removeBtn.addEventListener('click', () => {
      this.executeRemoveAction();
      dialog.remove();
    });

    cancelBtn.addEventListener('click', () => {
      dialog.remove();
    });

    // Close on Escape
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        dialog.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  /**
   * Execute hide action on selected elements
   */
  async executeHideAction() {
    console.log('[Selector] 👁️ Executing hide action');
    
    try {
    // Hide all selected elements
      for (const element of this.pendingSelection) {
      // Clear selection styling before hiding
      element.style.backgroundColor = '';
      element.style.border = '';
      
      // Hide the element
        await this.hideElement(element);
      }
      
      console.log(`[Selector] ✅ Hidden ${this.pendingSelection.size} elements`);
      
      // Clear pending elements
      this.pendingSelection.clear();
      
      // Deactivate selector
      this.deactivateSelector();
      
    } catch (error) {
      console.error('[Selector] ❌ Error hiding elements:', error);
    }
  }

  /**
   * Execute remove action on selected elements
   */
  async executeRemoveAction() {
    console.log('[Selector] 🗑️ Executing remove action');
    
    try {
      if (!this.domAttrsRemover) {
        throw new Error('DomAttrsRemover not initialized');
      }

      let totalRemoved = 0;
      
      // Remove each selected element
      for (const element of this.pendingSelection) {
        // Clear selection styling
        element.style.backgroundColor = '';
        element.style.border = '';
        
        // Generate selector for this element
        const selector = this.generateElementSelector(element);
        console.log(`[Selector] 🎯 Removing element with selector: ${selector}`);
        
        try {
          const result = await this.domAttrsRemover.removeElements(selector);
          if (result.success) {
            totalRemoved += result.count;
          }
        } catch (error) {
          console.warn(`[Selector] ⚠️ Could not remove element: ${selector}`, error.message);
        }
      }
      
      console.log(`[Selector] ✅ Removed ${totalRemoved} elements via visual selection`);
      
      // Clear pending elements
      this.pendingSelection.clear();
      
      // Deactivate selector
      this.deactivateSelector();
      
    } catch (error) {
      console.error('[Selector] ❌ Error removing elements:', error);
    }
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
    for (const element of this.pendingSelection) {
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
    this.pendingSelection.clear();
    
    // Deactivate selector
    this.deactivateSelector();
    this.isActive = false;
  }

  cancelSelection() {
    // Clear selection styling from all pending elements
    this.pendingSelection.forEach(element => {
      element.style.backgroundColor = '';
      element.style.border = '';
      element.style.outline = '';
      element.style.outlineOffset = '';
    });
    
    // Clear pending elements
    this.pendingSelection.clear();
    
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
  /**
   * CSS invalidation functionality has been removed
   */
  handleGetInvalidatedCSSList(sendResponse) {
    console.log('⚠️ CSS Invalidator not available - functionality removed');
    sendResponse({
      success: true,
      selectors: [],
      count: 0
    });
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
  /**
   * CSS invalidation functionality has been removed
   */
  handleRemoveInvalidatedSelector(index, sendResponse) {
    console.log('⚠️ CSS Invalidator not available - functionality removed');
    sendResponse({
      success: false,
      error: 'CSS invalidation functionality has been removed'
    });
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

  /**
   * Handle remove class action
   */
  /**
   * Use DomAttrsRemover.removeElements() instead
   */
  async handleRemoveClass(className, sendResponse) {
    console.log('⚠️ CSS Invalidator not available - use removeElements instead');
    
    try {
      if (this.domAttrsRemover) {
        const result = await this.domAttrsRemover.removeElements(`.${className}`);
        sendResponse({ 
          success: true, 
          removedCount: result.count,
          totalCount: result.count,
          message: `Removed class '${className}' from ${result.count} elements`
        });
      } else {
        sendResponse({ success: false, error: 'DomAttrsRemover not available' });
      }
    } catch (error) {
      console.error('Error removing class:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Handle remove blur filter action
   */
  /**
   * Use DomAttrsRemover.removeBlurFilter() instead
   */
  async handleRemoveBlurFilter(className, sendResponse) {
    console.log('⚠️ CSS Invalidator not available - using DomAttrsRemover.removeBlurFilter instead');
    
    try {
      if (this.domAttrsRemover) {
        const result = await this.domAttrsRemover.removeBlurFilter();
        sendResponse({ 
          success: true, 
          removedCount: result.count,
          totalCount: result.count,
          message: `Removed blur filter from ${result.count} elements`
        });
      } else {
        sendResponse({ success: false, error: 'DomAttrsRemover not available' });
      }
    } catch (error) {
      console.error('Error removing blur filter:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Use DomAttrsRemover.clearRemovedElements() instead
   */
  async handleClearRemovedClasses(sendResponse) {
    console.log('⚠️ Using DomAttrsRemover.clearRemovedElements instead');
    
    try {
      if (this.domAttrsRemover) {
        const result = await this.domAttrsRemover.clearRemovedElements();
        sendResponse({ 
          success: true, 
          clearedCount: result.clearedCount,
          totalCount: 0,
          message: `Cleared ${result.clearedCount} removed elements`
        });
      } else if (this.storageManager) {
        const clearedCount = await this.storageManager.clearRemovedClasses();
        sendResponse({ 
          success: true, 
          clearedCount: clearedCount,
          totalCount: 0,
          message: `Cleared ${clearedCount} removed classes`
        });
      } else {
        sendResponse({ success: false, error: 'Neither DomAttrsRemover nor StorageManager available' });
      }
    } catch (error) {
      console.error('Error clearing removed classes:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Get total count of removed elements
   */
  async getTotalRemovedClassesCount() {
    try {
      if (this.domAttrsRemover) {
        return await this.domAttrsRemover.getRemovedElementsCount();
      } else if (this.storageManager) {
        const counts = await this.storageManager.getCounts();
        return counts.removedClasses || 0;
      }
      return 0;
    } catch (error) {
      console.error('Error getting removed elements count:', error);
      return 0;
    }
  }

  /**
   * Setup DomAttrsRemover for element removal functionality
   */
  async setupDomAttrsRemover() {
    try {
      console.log('[Selector] 🎯 Setting up DomAttrsRemover...');
      
      if (typeof DomAttrsRemover !== 'undefined') {
        // Use the global instance created by the component
        if (window.domAttrsRemover) {
          this.domAttrsRemover = window.domAttrsRemover;
          console.log('[Selector] ✅ Using existing DomAttrsRemover instance');
        } else {
          this.domAttrsRemover = new DomAttrsRemover();
          console.log('[Selector] ✅ Created new DomAttrsRemover instance');
        }
      } else {
        console.warn('[Selector] ⚠️ DomAttrsRemover not available');
      }
      
    } catch (error) {
      console.error('[Selector] ❌ Error setting up DomAttrsRemover:', error);
      ErrorHandler.handle(error, 'DomAttrsRemover setup');
    }
  }

  /**
   * Set up the initial message listener for popup communication
   */
  setupInitialMessageListener() {
    try {
      console.log('[Selector] 📡 Setting up message listener...');
      
      // Use chrome.runtime.onMessage directly since MessageHandler might not be available
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        try {
          console.log(`[Selector] 📨 Received message: ${request.action}`);
          
          switch (request.action) {
            case 'ping':
              console.log('[Selector] 🏓 Responding to ping');
              sendResponse({ success: true, message: 'pong', url: window.location.href });
              break;
              
            case 'toggleSelector':
              this.toggleSelector();
              sendResponse({ success: true, isActive: this.isActive });
              break;
              
            case 'getSelectorState':
              sendResponse({ success: true, isActive: this.isActive });
              break;
              
            case 'toggleVisibility':
              this.toggleHiddenElements();
              sendResponse({ success: true });
              break;
              
            case 'clearAll':
              this.clearAllHidden().then(() => {
                sendResponse({ success: true });
              }).catch(error => {
                console.error('[Selector] Error in clearAll:', error);
                sendResponse({ success: false, error: error.message });
              });
              return true; // Async response
              
            case 'getHiddenCount':
              this.getHiddenCount().then(counts => {
                sendResponse({ 
                  success: true, 
                  count: counts.hidden,
                  removedElementsCount: counts.removedElements || 0
                });
              }).catch(error => {
                console.error('[Selector] Error in getHiddenCount:', error);
                sendResponse({ success: false, error: error.message });
              });
              return true; // Async response
              
            // Element removal actions
            case 'removeElements':
              console.log('[Selector] 🎯 Handling removeElements');
              this.handleRemoveElements(request.selector, sendResponse);
              return true; // Async response
              
            case 'removeBlurFilter':
              console.log('[Selector] 🌀 Handling removeBlurFilter');
              this.handleRemoveBlurFilter(sendResponse);
              return true; // Async response
              
            case 'clearRemovedElements':
              console.log('[Selector] 🧹 Handling clearRemovedElements');
              this.handleClearRemovedElements(sendResponse);
              return true; // Async response
              
            case 'getRemovedElementsCount':
              console.log('[Selector] 📊 Handling getRemovedElementsCount');
              this.handleGetRemovedElementsCount(sendResponse);
              return true; // Async response
              
            // List management actions
            case 'getHiddenElementsList':
              console.log('[Selector] 📋 Getting hidden elements list');
              this.handleGetHiddenElementsList(sendResponse);
              return true; // Async response
              
            case 'removeHiddenElement':
              this.handleRemoveHiddenElement(request.index, sendResponse);
              return true; // Async response
              
            default:
              console.warn(`[Selector] ❓ Unknown action: ${request.action}`);
              sendResponse({ success: false, error: 'Unknown action' });
              break;
          }
          
        } catch (error) {
          console.error('[Selector] 💥 Error handling message:', error);
          sendResponse({ success: false, error: error.message });
        }
      });
      
      console.log('[Selector] ✅ Message listener setup complete');
      
    } catch (error) {
      console.error('[Selector] ❌ Error setting up message listener:', error);
    }
  }

  /**
   * Handle removeElements action
   * @param {string} selector - The selector to remove
   * @param {Function} sendResponse - Response callback
   */
  async handleRemoveElements(selector, sendResponse) {
    try {
      console.log(`[Selector] 🎯 removeElements: "${selector}"`);
      
      if (!this.domAttrsRemover) {
        throw new Error('DomAttrsRemover not initialized');
      }
      
      const result = await this.domAttrsRemover.removeElements(selector);
      
      console.log(`[Selector] ✅ removeElements result:`, result);
      sendResponse({ 
        success: true, 
        count: result.count,
        type: result.type,
        selector: result.selector
      });
      
    } catch (error) {
      console.error('[Selector] ❌ Error in removeElements:', error);
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    }
  }
  
  /**
   * Handle removeBlurFilter action
   * @param {Function} sendResponse - Response callback
   */
  async handleRemoveBlurFilter(sendResponse) {
    try {
      console.log('[Selector] 🌀 removeBlurFilter called');
      
      if (!this.domAttrsRemover) {
        throw new Error('DomAttrsRemover not initialized');
      }
      
      const result = await this.domAttrsRemover.removeBlurFilter();
      
      console.log('[Selector] ✅ removeBlurFilter result:', result);
      sendResponse({ 
        success: true, 
        count: result.count,
        patterns: result.patterns
      });
      
    } catch (error) {
      console.error('[Selector] ❌ Error in removeBlurFilter:', error);
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    }
  }
  
  /**
   * Handle clearRemovedElements action
   * @param {Function} sendResponse - Response callback
   */
  async handleClearRemovedElements(sendResponse) {
    try {
      console.log('[Selector] 🧹 clearRemovedElements called');
      
      if (!this.domAttrsRemover) {
        throw new Error('DomAttrsRemover not initialized');
      }
      
      const result = await this.domAttrsRemover.clearRemovedElements();
      
      console.log('[Selector] ✅ clearRemovedElements result:', result);
      sendResponse({ 
        success: true, 
        clearedCount: result.clearedCount
      });
      
    } catch (error) {
      console.error('[Selector] ❌ Error in clearRemovedElements:', error);
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    }
  }
  
  /**
   * Handle getRemovedElementsCount action
   * @param {Function} sendResponse - Response callback
   */
  async handleGetRemovedElementsCount(sendResponse) {
    try {
      console.log('[Selector] 📊 getRemovedElementsCount called');
      
      if (!this.domAttrsRemover) {
        console.log('[Selector] ⚠️ DomAttrsRemover not initialized, returning 0');
        sendResponse({ success: true, count: 0 });
      return;
    }

      const count = await this.domAttrsRemover.getRemovedElementsCount();
      
      console.log(`[Selector] ✅ getRemovedElementsCount result: ${count}`);
      sendResponse({ 
        success: true, 
        count: count
      });
      
    } catch (error) {
      console.error('[Selector] ❌ Error in getRemovedElementsCount:', error);
      sendResponse({ 
        success: false, 
        error: error.message,
        count: 0
      });
    }
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