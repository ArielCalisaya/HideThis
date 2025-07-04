/**
 * PopupController - Manages the popup interface and communication with background script
 */
class PopupController {
  constructor() {
    this.uiElements = {};
    this.messageCleanup = null;
    this.currentListType = null;
    this.init();
  }

  /**
   * Initialize the popup controller
   */
  async init() {
    try {
      this.initializeUIElements();
      this.setupEventListeners();
      this.setupMessageListener();
      await this.loadInitialState();
    } catch (error) {
      ErrorHandler.handle(error, 'Error initializing popup');
    }
  }

  /**
   * Initialize UI elements
   */
  initializeUIElements() {
    // Main view elements
    this.uiElements.toggleSelector = this.getRequiredElement('#toggleSelector');
    this.uiElements.hiddenCount = this.getRequiredElement('#hiddenCount');
    this.uiElements.toggleVisibility = this.getRequiredElement('#toggleVisibility');
    this.uiElements.clearAll = this.getRequiredElement('#clearAll');
    this.uiElements.cssSelector = this.getRequiredElement('#cssSelector');
    this.uiElements.invalidateCSS = this.getRequiredElement('#invalidateCSS');
    this.uiElements.invalidatedCount = this.getRequiredElement('#invalidatedCount');
    this.uiElements.clearInvalidatedCSS = this.getRequiredElement('#clearInvalidatedCSS');
    
    // View elements
    this.uiElements.mainView = this.getRequiredElement('#mainView');
    this.uiElements.listView = this.getRequiredElement('#listView');
    this.uiElements.backToMain = this.getRequiredElement('#backToMain');
    this.uiElements.listTitle = this.getRequiredElement('#listTitle');
    this.uiElements.listCount = this.getRequiredElement('#listCount');
    this.uiElements.listContent = this.getRequiredElement('#listContent');
    this.uiElements.clearAllList = this.getRequiredElement('#clearAllList');
  }

  /**
   * Get required element with error handling
   */
  getRequiredElement(selector) {
    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(`Required element not found: ${selector}`);
    }
    return element;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Main view buttons
    this.uiElements.toggleSelector.addEventListener('click', () => this.handleToggleSelector());
    this.uiElements.hiddenCount.addEventListener('click', () => this.showHiddenElementsList());
    this.uiElements.toggleVisibility.addEventListener('click', () => this.handleToggleVisibility());
    this.uiElements.clearAll.addEventListener('click', () => this.handleClearAll());
    this.uiElements.invalidateCSS.addEventListener('click', () => this.handleInvalidateCSS());
    this.uiElements.invalidatedCount.addEventListener('click', () => this.showInvalidatedCSSList());
    this.uiElements.clearInvalidatedCSS.addEventListener('click', () => this.handleClearInvalidatedCSS());
    
    // List view buttons
    this.uiElements.backToMain.addEventListener('click', async () => await this.showMainView());
    this.uiElements.clearAllList.addEventListener('click', () => this.handleClearAllFromList());
    
    // CSS selector input
    this.uiElements.cssSelector.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        this.handleInvalidateCSS();
      }
    });
  }

  /**
   * Setup message listener for background script communication
   */
  setupMessageListener() {
    this.messageCleanup = MessageHandler.addListener((message) => {
      if (message.type === 'selectorModeChanged') {
        this.updateSelectorButtonState();
      } else if (message.action === 'updateCount') {
        console.log('🔄 Received count update:', message);
        this.updateHiddenElementsCount(message.count);
      } else if (message.action === 'updateInvalidatedCount') {
        console.log('🔄 Received invalidated count update:', message);
        this.updateInvalidatedCSSCount(message.count);
      }
    });
  }

  /**
   * Load initial state from background script
   */
  async loadInitialState() {
    try {
      console.log('🔍 Loading initial state...');
      const response = await MessageHandler.sendToBackground(Constants.ACTIONS.GET_HIDDEN_COUNT);
      console.log('📋 Initial state response:', response);
      
      if (response?.success) {
        this.updateHiddenElementsCount(response.count);
        this.updateInvalidatedCSSCount(response.invalidatedCount || 0);
        this.updateSelectorButtonState();
        console.log('✅ Initial state loaded successfully');
      } else {
        console.warn('⚠️ Failed to load initial state:', response);
      }
    } catch (error) {
      console.error('❌ Error loading initial state:', error);
      ErrorHandler.handle(error, 'Error loading initial state');
    }
  }

  /**
   * Handle toggle selector button click
   */
  async handleToggleSelector() {
    try {
      console.log('🔍 Toggling selector...');
      const response = await MessageHandler.sendToBackground(Constants.ACTIONS.TOGGLE_SELECTOR);
      console.log('📋 Toggle selector response:', response);
      
      if (!response?.success) {
        this.handleToggleSelectorError(response);
        return;
      }
      
      this.updateSelectorButtonState();
      
      if (response.isActive) {
        this.showTemporaryFeedback('Selector activado. Haz clic en elementos de la página.');
      } else {
        this.showTemporaryFeedback('Selector desactivado.');
      }
    } catch (error) {
      console.error('❌ Error toggling selector:', error);
      ErrorHandler.handle(error, 'Error toggling selector');
    }
  }

  /**
   * Handle invalidate CSS button click
   */
  async handleInvalidateCSS() {
    try {
      const selector = this.uiElements.cssSelector.value.trim();
      
      if (!selector) {
        this.showTemporaryFeedback('Por favor ingresa un selector CSS');
        return;
      }
      
      // Validate selector format
      const validSelectors = ['.', '#', '['];
      const isValidSelector = validSelectors.some(prefix => selector.startsWith(prefix));
      
      if (!isValidSelector) {
        this.showTemporaryFeedback('Selector debe empezar con . (clase), # (ID) o [ (atributo)');
        return;
      }
      
      const response = await MessageHandler.sendToBackground(Constants.ACTIONS.INVALIDATE_CSS, {
        selector: selector
      });
      
      if (response?.success) {
        this.uiElements.cssSelector.value = '';
        this.updateInvalidatedCSSCount(response.totalCount);
        this.showTemporaryFeedback(`CSS invalidado: ${selector}`);
      } else {
        this.showTemporaryFeedback(response?.message || 'Error al invalidar CSS');
      }
    } catch (error) {
      ErrorHandler.handle(error, 'Error invalidating CSS');
    }
  }

  /**
   * Handle clear invalidated CSS button click
   */
  async handleClearInvalidatedCSS() {
    try {
      const response = await MessageHandler.sendToBackground(Constants.ACTIONS.CLEAR_INVALIDATED_CSS);
      
      if (response?.success) {
        this.updateInvalidatedCSSCount(0);
        this.showTemporaryFeedback('CSS restaurado');
      } else {
        this.showTemporaryFeedback(response?.message || 'Error al restaurar CSS');
      }
    } catch (error) {
      ErrorHandler.handle(error, 'Error clearing invalidated CSS');
    }
  }

  /**
   * Show temporary feedback message
   */
  showTemporaryFeedback(message) {
    // Create or update feedback element
    let feedback = document.getElementById('feedback');
    if (!feedback) {
      feedback = document.createElement('div');
      feedback.id = 'feedback';
      feedback.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm';
      document.body.appendChild(feedback);
    }
    
    feedback.textContent = message;
    feedback.classList.remove('hidden');
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      feedback.classList.add('hidden');
    }, 3000);
  }

  /**
   * Ping content script to check connection
   */
  async pingContentScript() {
    try {
      const response = await MessageHandler.sendToBackground(Constants.ACTIONS.PING_CONTENT_SCRIPT);
      return response?.success === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Handle toggle selector error
   */
  handleToggleSelectorError(response) {
    if (response?.error === 'NO_CONTENT_SCRIPT') {
      this.showConnectionError();
    } else {
      this.showTemporaryFeedback(response?.message || 'Error al activar selector');
    }
  }

  /**
   * Show connection error message
   */
  showConnectionError() {
    const errorMessage = `
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div class="flex items-center mb-2">
          <span class="text-red-600 text-lg mr-2">⚠️</span>
          <h3 class="text-red-800 font-semibold">Error de Conexión</h3>
        </div>
        <p class="text-red-700 text-sm mb-3">
          La extensión no puede comunicarse con esta página.
        </p>
        <div class="text-red-600 text-xs">
          <p class="mb-1"><strong>Posibles soluciones:</strong></p>
          <ul class="list-disc list-inside space-y-1">
            <li>Recarga la página (F5)</li>
            <li>Recarga la extensión en chrome://extensions/</li>
            <li>Verifica que la página no bloquee extensiones</li>
          </ul>
        </div>
      </div>
    `;
    
    // Insert error message at the beginning of main content
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.insertAdjacentHTML('afterbegin', errorMessage);
    }
  }

  /**
   * Handle toggle visibility button click
   */
  async handleToggleVisibility() {
    try {
      const response = await MessageHandler.sendToBackground(Constants.ACTIONS.TOGGLE_VISIBILITY);
      
      if (response?.success) {
        this.showTemporaryFeedback(response.visible ? 'Elementos mostrados' : 'Elementos ocultos');
      } else {
        this.showTemporaryFeedback(response?.message || 'Error al cambiar visibilidad');
      }
    } catch (error) {
      ErrorHandler.handle(error, 'Error toggling visibility');
    }
  }

  /**
   * Handle clear all button click
   */
  async handleClearAll() {
    try {
      const response = await MessageHandler.sendToBackground(Constants.ACTIONS.CLEAR_ALL);
      
      if (response?.success) {
        this.updateHiddenElementsCount(0);
        this.showTemporaryFeedback('Todos los elementos eliminados');
      } else {
        this.showTemporaryFeedback(response?.message || 'Error al limpiar elementos');
      }
    } catch (error) {
      ErrorHandler.handle(error, 'Error clearing all elements');
    }
  }

  /**
   * Refresh hidden elements count
   */
  async refreshHiddenElementsCount() {
    try {
      const response = await MessageHandler.sendToBackground(Constants.ACTIONS.GET_HIDDEN_COUNT);
      
      if (response?.success) {
        this.updateHiddenElementsCount(response.count);
      }
    } catch (error) {
      ErrorHandler.handle(error, 'Error refreshing hidden elements count');
    }
  }

  /**
   * Update selector button state
   */
  updateSelectorButtonState() {
    console.log('🔍 Updating selector button state...');
    MessageHandler.sendToBackground(Constants.ACTIONS.GET_SELECTOR_STATE)
      .then(response => {
        console.log('📋 Selector state response:', response);
        if (response?.success) {
          const button = this.uiElements.toggleSelector;
          if (response.isActive) {
            console.log('✅ Setting button to active state');
            this.setSelectorButtonActive(button);
          } else {
            console.log('✅ Setting button to inactive state');
            this.setSelectorButtonInactive(button);
          }
        } else {
          console.warn('⚠️ Failed to get selector state:', response);
        }
      })
      .catch(error => {
        console.error('❌ Error updating selector button state:', error);
        ErrorHandler.handle(error, 'Error updating selector button state');
      });
  }

  /**
   * Set selector button to active state
   */
  setSelectorButtonActive(button) {
    button.textContent = 'Desactivar Selector';
    button.classList.remove('btn-primary');
    button.classList.add('bg-red-600', 'hover:bg-red-700', 'text-white');
  }

  /**
   * Set selector button to inactive state
   */
  setSelectorButtonInactive(button) {
    button.textContent = 'Activar Selector';
    button.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white');
    button.classList.add('btn-primary');
  }

  /**
   * Update hidden elements count display
   */
  updateHiddenElementsCount(count) {
    this.uiElements.hiddenCount.textContent = `${count} elemento${count !== 1 ? 's' : ''}`;
    this.updateVisibilityButtonState(this.uiElements.toggleVisibility, count);
  }

  /**
   * Update invalidated CSS count display
   */
  updateInvalidatedCSSCount(count) {
    this.uiElements.invalidatedCount.textContent = `${count} regla${count !== 1 ? 's' : ''}`;
    this.updateClearInvalidatedButtonState(this.uiElements.clearInvalidatedCSS, count);
  }

  /**
   * Update visibility button state based on count
   */
  updateVisibilityButtonState(button, count) {
    if (count > 0) {
      this.enableVisibilityButton(button);
    } else {
      this.disableVisibilityButton(button);
    }
  }

  /**
   * Update clear invalidated CSS button state based on count
   */
  updateClearInvalidatedButtonState(button, count) {
    if (count > 0) {
      this.enableButton(button);
    } else {
      this.disableButton(button);
    }
  }

  /**
   * Enable visibility button
   */
  enableVisibilityButton(button) {
    button.disabled = false;
    button.classList.remove('opacity-50', 'cursor-not-allowed');
    button.classList.add('hover:bg-gray-300');
  }

  /**
   * Disable visibility button
   */
  disableVisibilityButton(button) {
    button.disabled = true;
    button.classList.add('opacity-50', 'cursor-not-allowed');
    button.classList.remove('hover:bg-gray-300');
  }

  /**
   * Enable button
   */
  enableButton(button) {
    button.disabled = false;
    button.classList.remove('opacity-50', 'cursor-not-allowed');
  }

  /**
   * Disable button
   */
  disableButton(button) {
    button.disabled = true;
    button.classList.add('opacity-50', 'cursor-not-allowed');
  }

  // === LIST VIEW METHODS ===

  /**
   * Show hidden elements list
   */
  async showHiddenElementsList() {
    try {
      console.log('🔍 Requesting hidden elements list...');
      const response = await MessageHandler.sendToBackground('getHiddenElementsList');
      
      console.log('📋 Hidden elements response:', response);
      
      if (response?.success) {
        this.showListView('Elementos Ocultos', 'hidden', response.elements, response.elements.length);
      } else {
        this.showTemporaryFeedback('Error al obtener lista de elementos ocultos');
      }
    } catch (error) {
      console.error('❌ Error getting hidden elements list:', error);
      this.showTemporaryFeedback('Error al obtener lista de elementos ocultos');
    }
  }

  /**
   * Show invalidated CSS list
   */
  async showInvalidatedCSSList() {
    try {
      console.log('🔍 Requesting invalidated CSS list...');
      const response = await MessageHandler.sendToBackground('getInvalidatedCSSList');
      
      console.log('📋 Invalidated CSS response:', response);
      
      if (response?.success) {
        this.showListView('CSS Invalidados', 'invalidated', response.selectors, response.selectors.length);
      } else {
        this.showTemporaryFeedback('Error al obtener lista de CSS invalidados');
      }
    } catch (error) {
      console.error('❌ Error getting invalidated CSS list:', error);
      this.showTemporaryFeedback('Error al obtener lista de CSS invalidados');
    }
  }

  /**
   * Show list view with data
   */
  showListView(title, type, items, count) {
    console.log(`🔍 Showing ${type} list with ${count} items:`, items);
    
    // Set list data
    this.currentListType = type;
    this.uiElements.listTitle.textContent = title;
    this.uiElements.listCount.textContent = `${count} elemento${count !== 1 ? 's' : ''}`;
    
    // Generate list content
    if (items.length === 0) {
      this.uiElements.listContent.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <div class="text-4xl mb-2">🎉</div>
          <p>No hay elementos en esta lista</p>
        </div>
      `;
    } else {
      const htmlItems = items.map((item, index) => {
        const html = this.generateListItem(item, index, type);
        console.log(`📝 Generated HTML for item ${index + 1}:`, html.substring(0, 100) + '...');
        return html;
      });
      
      this.uiElements.listContent.innerHTML = htmlItems.join('');
      console.log('🔍 Total list content length:', this.uiElements.listContent.innerHTML.length);
      
      // Add event listeners to delete buttons
      this.setupListItemEventListeners(type);
    }
    
    // Switch to list view
    this.uiElements.mainView.classList.add('hidden');
    this.uiElements.listView.classList.remove('hidden');
    
    console.log('✅ List view should now be visible');
  }

  /**
   * Show main view
   */
  async showMainView() {
    this.uiElements.listView.classList.add('hidden');
    this.uiElements.mainView.classList.remove('hidden');
    this.currentListType = null;
    
    // Update counters when returning to main view
    await this.loadInitialState();
    
    console.log('✅ Switched back to main view');
  }

  /**
   * Generates HTML for a list item
   */
  generateListItem(item, index, type) {
    if (type === 'hidden') {
      return `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2 group hover:bg-gray-100 transition-colors">
          <div class="flex-1 min-w-0">
            <div class="font-medium text-sm text-gray-900 truncate">
              ${item.tagName || 'elemento'}${item.id ? `#${item.id}` : ''}
            </div>
            <div class="text-xs text-gray-500 truncate">
              ${item.classes ? `.${item.classes.join('.')}` : 'Sin clases'}
            </div>
            <div class="text-xs text-gray-400">
              ${item.size ? `${item.size.width}×${item.size.height}px` : ''}
            </div>
          </div>
          <button 
            class="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
            data-type="hidden"
            data-index="${index}"
            title="Mostrar elemento"
          >
            Mostrar
          </button>
        </div>
      `;
    } else {
      return `
        <div class="flex items-center justify-between p-3 bg-orange-50 rounded-lg mb-2 group hover:bg-orange-100 transition-colors">
          <div class="flex-1 min-w-0">
            <div class="font-medium text-sm text-gray-900 font-mono">
              ${item.selector}
            </div>
            <div class="text-xs text-gray-500">
              ${item.type === 'class' ? 'Clase CSS' : item.type === 'id' ? 'ID' : 'Atributo'}
            </div>
          </div>
          <button 
            class="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
            data-type="invalidated"
            data-index="${index}"
            title="Restaurar CSS"
          >
            Restaurar
          </button>
        </div>
      `;
    }
  }

  /**
   * Sets up event listeners for list items
   */
  setupListItemEventListeners(type) {
    const deleteButtons = this.uiElements.listContent.querySelectorAll(`[data-type="${type}"]`);
    
    deleteButtons.forEach(button => {
      button.addEventListener('click', async (event) => {
        const index = parseInt(event.target.dataset.index);
        await this.handleDeleteListItem(type, index);
      });
    });
  }

  /**
   * Handles deletion of a single list item
   */
  async handleDeleteListItem(type, index) {
    try {
      let response;
      
      if (type === 'hidden') {
        response = await MessageHandler.sendToBackground('removeHiddenElement', { index });
      } else {
        response = await MessageHandler.sendToBackground('removeInvalidatedSelector', { index });
      }
      
      if (response?.success) {
        // Refresh the list content
        if (type === 'hidden') {
          await this.showHiddenElementsList();
        } else {
          await this.showInvalidatedCSSList();
        }
        
        // Update counters in background - this will be reflected when user returns to main view
        console.log('🔄 Item deleted, counters will be updated when returning to main view');
      }
    } catch (error) {
      console.error('Error deleting list item:', error);
    }
  }

  /**
   * Handles clearing all items from the current list
   */
  async handleClearAllFromList() {
    try {
      let response;
      
      if (this.currentListType === 'hidden') {
        response = await MessageHandler.sendToBackground(Constants.ACTIONS.CLEAR_ALL);
      } else {
        response = await MessageHandler.sendToBackground(Constants.ACTIONS.CLEAR_INVALIDATED_CSS);
      }
      
      if (response?.success) {
        await this.showMainView();
      }
    } catch (error) {
      console.error('Error clearing all from list:', error);
    }
  }

  /**
   * Cleans up resources when popup closes
   */
  cleanup() {
    if (this.messageCleanup) {
      this.messageCleanup();
      this.messageCleanup = null;
    }
  }
}

/**
 * Controller initialization when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  // Verify utilities are available
  if (typeof MessageHandler === 'undefined' || 
      typeof ErrorHandler === 'undefined' || 
      typeof Constants === 'undefined') {
    console.error('Utility modules not loaded. Verify scripts are included in HTML.');
    return;
  }

  // Initialize controller
  const popupController = new PopupController();
  
  // Clean up resources when window closes
  window.addEventListener('beforeunload', () => {
    popupController.cleanup();
  });
}); 