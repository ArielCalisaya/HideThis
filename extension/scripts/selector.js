// HideThis Element Selector
class ElementSelector {
  constructor() {
    this.isActive = false;
    this.hiddenElements = new Set();
    this.overlay = null;
    this.selectedElement = null;
    this.pendingElements = new Set(); // Elements selected but not yet hidden
    this.boundHandlers = null; // Store bound event handlers for proper removal
    this.init();
  }

  init() {
    console.log('🎯 HideThis ElementSelector initialized on:', window.location.href);
    
    try {
      // Create overlay for highlighting elements
      this.createOverlay();
      
      // Listen for messages from popup
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        try {
          if (request.action === 'toggleSelector') {
            this.toggleSelector();
            sendResponse({ success: true, isActive: this.isActive });
          } else if (request.action === 'toggleVisibility') {
            this.toggleHiddenElements();
            sendResponse({ success: true });
          } else if (request.action === 'clearAll') {
            this.clearAllHidden();
            sendResponse({ success: true });
          } else if (request.action === 'getHiddenCount') {
            sendResponse({ count: this.hiddenElements.size });
          } else if (request.action === 'ping') {
            sendResponse({ success: true, message: 'pong', url: window.location.href });
          } else {
            sendResponse({ success: false, error: 'Unknown action' });
          }
        } catch (error) {
          console.error('❌ Error handling message:', error);
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
          console.error('❌ Error sending heartbeat:', error);
        }
      }, 500);
      
    } catch (error) {
      console.error('❌ Error in init():', error);
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
      max-width: 300px;
      text-align: center;
    `;
    
    const rect = element.getBoundingClientRect();
    const tagName = element.tagName.toLowerCase();
    const className = element.className ? `.${element.className.split(' ').join('.')}` : '';
    const id = element.id ? `#${element.id}` : '';
    
    info.innerHTML = `
      <div><strong>${tagName}${id}${className}</strong></div>
      <div style="font-size: 10px; opacity: 0.8;">
        ${Math.round(rect.width)}×${Math.round(rect.height)}px
        • Use ↑↓ arrows to select parent/child
      </div>
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
    `;
    
    controls.innerHTML = `
      <span>${this.pendingElements.size} elemento${this.pendingElements.size !== 1 ? 's' : ''} seleccionado${this.pendingElements.size !== 1 ? 's' : ''}</span>
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

  hideElement(element) {
    // Save element reference and original display value
    this.hiddenElements.add(element);
    
    // Store original display value to restore later
    const originalDisplay = element.style.display || getComputedStyle(element).display;
    element.setAttribute('data-hidethis-original-display', originalDisplay);
    
    // Hide element completely
    element.style.display = 'none';
    element.setAttribute('data-hidethis-hidden', 'true');
    
    // Notify popup
    chrome.runtime.sendMessage({
      action: 'elementHidden',
      count: this.hiddenElements.size
    });
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

  clearAllHidden() {
    this.hiddenElements.forEach(element => {
      this.showElement(element);
    });
    this.hiddenElements.clear();
    
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
      }, 1000);
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(() => {
        if (!document.getElementById('hidethis-overlay')) {
          self.createOverlay();
        }
      }, 1000);
    };
    
    // Also listen for popstate events
    window.addEventListener('popstate', () => {
      setTimeout(() => {
        if (!document.getElementById('hidethis-overlay')) {
          this.createOverlay();
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
        console.error('❌ Error initializing ElementSelector:', error);
      }
    });
  } else {
    try {
      new ElementSelector();
    } catch (error) {
      console.error('❌ Error initializing ElementSelector:', error);
    }
  }
} catch (error) {
  console.error('❌ Critical error in content script:', error);
} 