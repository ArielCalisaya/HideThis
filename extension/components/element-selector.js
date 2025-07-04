/**
 * Element selection manager
 * Handles element selection logic, hierarchy navigation and validation
 */
class ElementSelector {
  constructor() {
    this.currentElement = null;
    this.pendingElements = new Set();
    this.excludedSelectors = [
      'html', 'body', 'head', 'script', 'style', 'meta', 'link', 'title',
      '#hidethis-overlay', '#hidethis-instructions', '#hidethis-element-info', 
      '#hidethis-selection-controls', '[id^="hidethis-"]', '[class*="hidethis-"]'
    ];
  }

  /**
   * Finds the best element to select based on target element
   * @param {Element} targetElement - Initial target element
   * @returns {Element} Best element for selection
   */
  findBestElementToSelect(targetElement) {
    if (!targetElement) return null;

    // If element is valid, use it directly
    if (this.isValidElement(targetElement)) {
      return targetElement;
    }

    // Search upward in hierarchy
    let current = targetElement.parentElement;
    while (current && current !== document.body) {
      if (this.isValidElement(current)) {
        return current;
      }
      current = current.parentElement;
    }

    // If nothing valid found, return original element
    return targetElement;
  }

  /**
   * Validates if an element is selectable
   * @param {Element} element - Element to validate
   * @returns {boolean} True if element is valid for selection
   */
  isValidElement(element) {
    if (!element || !element.tagName) return false;

    const tagName = element.tagName.toLowerCase();
    
    // Check excluded elements by tag
    if (this.excludedSelectors.includes(tagName)) return false;

    // Check system elements
    if (this.isSystemElement(element)) return false;

    // Check element is visible
    if (!this.isElementVisible(element)) return false;

    // Check element has minimum size
    const rect = element.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return false;

    return true;
  }

  /**
   * Checks if element belongs to extension system
   * @param {Element} element - Element to check
   * @returns {boolean} True if it's a system element
   */
  isSystemElement(element) {
    return this.excludedSelectors.some(selector => {
      try {
        if (selector.startsWith('#') || selector.startsWith('[')) {
          return element.matches(selector);
        }
        return false;
      } catch (e) {
        return false;
      }
    });
  }

  /**
   * Checks if element is visible
   * @param {Element} element - Element to check
   * @returns {boolean} True if element is visible
   */
  isElementVisible(element) {
    if (!element) return false;

    const style = window.getComputedStyle(element);
    
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
  }

  /**
   * Selects parent element of current element
   * @returns {Element|null} Selected parent element or null
   */
  selectParentElement() {
    if (!this.currentElement) return null;

    let parent = this.currentElement.parentElement;
    let depth = 0;
    const maxDepth = 10;

    while (parent && depth < maxDepth) {
      if (this.isValidElement(parent) && parent !== document.body) {
        this.currentElement = parent;
        return parent;
      }
      parent = parent.parentElement;
      depth++;
    }

    return null;
  }

  /**
   * Selects child element of current element
   * @returns {Element|null} Selected child element or null
   */
  selectChildElement() {
    if (!this.currentElement) return null;

    const children = Array.from(this.currentElement.children);
    
    for (const child of children) {
      if (this.isValidElement(child)) {
        this.currentElement = child;
        return child;
      }
    }

    return null;
  }

  /**
   * Sets current element
   * @param {Element} element - Element to set as current
   */
  setCurrentElement(element) {
    this.currentElement = element;
  }

  /**
   * Gets current element
   * @returns {Element|null} Current element
   */
  getCurrentElement() {
    return this.currentElement;
  }

  /**
   * Adds element to pending selection
   * @param {Element} element - Element to add
   */
  addToPendingSelection(element) {
    if (element && this.isValidElement(element)) {
      this.pendingElements.add(element);
    }
  }

  /**
   * Removes element from pending selection
   * @param {Element} element - Element to remove
   */
  removeFromPendingSelection(element) {
    this.pendingElements.delete(element);
  }

  /**
   * Checks if element is in pending selection
   * @param {Element} element - Element to check
   * @returns {boolean} True if in pending selection
   */
  isInPendingSelection(element) {
    return this.pendingElements.has(element);
  }

  /**
   * Gets all elements in pending selection
   * @returns {Set<Element>} Set of pending elements
   */
  getPendingElements() {
    return this.pendingElements;
  }

  /**
   * Confirms pending selection
   * @returns {Array<Element>} Array of confirmed elements
   */
  confirmPendingSelection() {
    const confirmedElements = Array.from(this.pendingElements);
    this.clearPendingSelection();
    return confirmedElements;
  }

  /**
   * Cancels pending selection
   */
  cancelPendingSelection() {
    this.clearPendingSelection();
  }

  /**
   * Clears pending selection
   */
  clearPendingSelection() {
    this.pendingElements.clear();
  }

  /**
   * Toggles element selection
   * @param {Element} element - Element to toggle
   * @returns {boolean} True if added, false if removed
   */
  toggleElementSelection(element) {
    if (!element || !this.isValidElement(element)) return false;

    if (this.isInPendingSelection(element)) {
      this.removeFromPendingSelection(element);
      return false;
    } else {
      this.addToPendingSelection(element);
      return true;
    }
  }

  /**
   * Gets detailed information about an element
   * @param {Element} element - Element to get info from
   * @returns {Object} Element information
   */
  getElementInfo(element) {
    if (!element) return null;

    const rect = element.getBoundingClientRect();
    
    return {
      tagName: element.tagName.toLowerCase(),
      id: element.id || null,
      className: element.className || null,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      isVisible: this.isElementVisible(element),
      isValid: this.isValidElement(element)
    };
  }

  /**
   * Finds similar elements on the page
   * @param {Element} element - Reference element
   * @returns {Array<Element>} Array of similar elements
   */
  findSimilarElements(element) {
    if (!element) return [];

    const similarElements = [];
    const elementInfo = this.getElementInfo(element);
    
    // Search by class
    if (elementInfo.className) {
      const byClass = document.querySelectorAll(`.${elementInfo.className.split(' ')[0]}`);
      similarElements.push(...Array.from(byClass));
    }

    // Search by tag
    const byTag = document.querySelectorAll(elementInfo.tagName);
    similarElements.push(...Array.from(byTag));

    // Filter valid and unique elements
    return [...new Set(similarElements)]
      .filter(el => el !== element && this.isValidElement(el));
  }

  /**
   * Resets selector state
   */
  reset() {
    this.currentElement = null;
    this.clearPendingSelection();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ElementSelector;
} else {
  window.ElementSelector = ElementSelector;
} 