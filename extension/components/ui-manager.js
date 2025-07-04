/**
 * User interface manager for element selector
 * Handles overlay, instructions and element information
 */
class UIManager {
  constructor() {
    this.overlay = null;
    this.instructionsElement = null;
    this.elementInfoElement = null;
    this.selectionControlsElement = null;
  }

  /**
   * Initializes all UI elements
   */
  initialize() {
    this.createOverlay();
    this.createInstructions();
    this.createElementInfo();
    this.createSelectionControls();
  }

  /**
   * Creates main overlay for selector mode
   */
  createOverlay() {
    // Remove existing overlay if exists
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

  /**
   * Creates instructions element
   */
  createInstructions() {
    this.instructionsElement = document.createElement('div');
    this.instructionsElement.id = 'hidethis-instructions';
    this.instructionsElement.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 1000000;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      display: none;
    `;
    
    this.instructionsElement.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 10px;">🎯 Selector Mode Active</div>
      <div style="font-size: 12px; line-height: 1.4;">
        • Move mouse to select elements<br>
        • Click to hide element<br>
        • Esc to cancel<br>
        • ↑/↓ to select parent/child element
      </div>
    `;
    
    document.body.appendChild(this.instructionsElement);
  }

  /**
   * Creates element information element
   */
  createElementInfo() {
    this.elementInfoElement = document.createElement('div');
    this.elementInfoElement.id = 'hidethis-element-info';
    this.elementInfoElement.style.cssText = `
      position: fixed;
      top: 60px;
      left: 20px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 12px;
      border-radius: 6px;
      font-family: Arial, sans-serif;
      font-size: 12px;
      z-index: 1000001;
      max-width: 250px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      display: none;
    `;
    
    document.body.appendChild(this.elementInfoElement);
  }

  /**
   * Creates selection controls
   */
  createSelectionControls() {
    this.selectionControlsElement = document.createElement('div');
    this.selectionControlsElement.id = 'hidethis-selection-controls';
    this.selectionControlsElement.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 10px 15px;
      border-radius: 6px;
      font-family: Arial, sans-serif;
      font-size: 12px;
      z-index: 1000002;
      display: none;
      gap: 10px;
    `;
    
    document.body.appendChild(this.selectionControlsElement);
  }

  /**
   * Shows overlay
   */
  showOverlay() {
    if (this.overlay) {
      this.overlay.style.display = 'block';
    }
  }

  /**
   * Hides overlay
   */
  hideOverlay() {
    if (this.overlay) {
      this.overlay.style.display = 'none';
    }
  }

  /**
   * Shows instructions
   */
  showInstructions() {
    if (this.instructionsElement) {
      this.instructionsElement.style.display = 'block';
    }
  }

  /**
   * Hides instructions
   */
  hideInstructions() {
    if (this.instructionsElement) {
      this.instructionsElement.style.display = 'none';
    }
  }

  /**
   * Shows information for selected element
   * @param {Element} element - Element to show information for
   */
  showElementInfo(element) {
    if (!this.elementInfoElement || !element) return;

    const tagName = element.tagName.toLowerCase();
    const className = element.className || 'No class';
    const elementId = element.id || 'No ID';
    const rect = element.getBoundingClientRect();
    
    this.elementInfoElement.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">📋 Element Information</div>
      <div style="line-height: 1.4;">
        <strong>Tag:</strong> ${tagName}<br>
        <strong>Class:</strong> ${className}<br>
        <strong>ID:</strong> ${elementId}<br>
        <strong>Size:</strong> ${Math.round(rect.width)}×${Math.round(rect.height)}px
      </div>
    `;
    
    this.elementInfoElement.style.display = 'block';
  }

  /**
   * Hides element information
   */
  hideElementInfo() {
    if (this.elementInfoElement) {
      this.elementInfoElement.style.display = 'none';
    }
  }

  /**
   * Updates selection controls
   * @param {Set} pendingElements - Pending selection elements
   */
  updateSelectionControls(pendingElements) {
    if (!this.selectionControlsElement) return;

    const count = pendingElements.size;
    
    if (count > 0) {
      this.selectionControlsElement.innerHTML = `
        <span>✨ ${count} element${count !== 1 ? 's' : ''} selected</span>
        <button id="hidethis-confirm-btn" style="
          background: #10b981; 
          color: white; 
          border: none; 
          padding: 4px 8px; 
          border-radius: 4px; 
          cursor: pointer; 
          margin-left: 10px;
        ">Confirm</button>
        <button id="hidethis-cancel-btn" style="
          background: #ef4444; 
          color: white; 
          border: none; 
          padding: 4px 8px; 
          border-radius: 4px; 
          cursor: pointer; 
          margin-left: 5px;
        ">Cancel</button>
      `;
      this.selectionControlsElement.style.display = 'flex';
    } else {
      this.selectionControlsElement.style.display = 'none';
    }
  }

  /**
   * Hides selection controls
   */
  hideSelectionControls() {
    if (this.selectionControlsElement) {
      this.selectionControlsElement.style.display = 'none';
    }
  }

  /**
   * Applies selection styling to element
   * @param {Element} element - Element to highlight
   */
  highlightElement(element) {
    if (!element) return;
    
    element.style.outline = '2px solid #3b82f6';
    element.style.outlineOffset = '2px';
  }

  /**
   * Removes selection styling from element
   * @param {Element} element - Element to remove highlight from
   */
  removeHighlight(element) {
    if (!element) return;
    
    element.style.outline = '';
    element.style.outlineOffset = '';
  }

  /**
   * Removes all selection styling
   */
  clearAllHighlights() {
    const highlightedElements = document.querySelectorAll('[style*="outline"]');
    highlightedElements.forEach(element => {
      element.style.outline = '';
      element.style.outlineOffset = '';
    });
  }

  /**
   * Applies hidden element styling
   * @param {Element} element - Element to hide
   */
  hideElement(element) {
    if (!element) return;
    
    element.style.display = 'none';
    element.classList.add('hidethis-hidden');
  }

  /**
   * Removes hidden element styling
   * @param {Element} element - Element to show
   */
  showElement(element) {
    if (!element) return;
    
    element.style.display = '';
    element.classList.remove('hidethis-hidden');
  }

  /**
   * Cleans up all UI elements
   */
  cleanup() {
    const elementsToRemove = [
      this.overlay,
      this.instructionsElement,
      this.elementInfoElement,
      this.selectionControlsElement
    ];

    elementsToRemove.forEach(element => {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });

    this.overlay = null;
    this.instructionsElement = null;
    this.elementInfoElement = null;
    this.selectionControlsElement = null;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIManager;
} else {
  window.UIManager = UIManager;
} 