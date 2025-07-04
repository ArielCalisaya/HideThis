/**
 * PopupController - Manages the popup interface and communication with background script
 */
class PopupController {
  constructor() {
    this.uiElements = {};
    this.messageCleanup = null;
    this.currentListType = null;
    // Don't call init() here - will be called externally with await
  }

  /**
   * Initialize the popup controller
   */
  async init() {
    try {
      console.log('🔧 Initializing PopupController...');
      this.initializeUIElements();
      console.log('✅ UI elements initialized');
      
      this.setupEventListeners();
      console.log('✅ Event listeners setup');
      
      this.setupMessageListener();
      console.log('✅ Message listener setup');
      
      await this.loadInitialState();
      console.log('✅ Initial state loaded');
      
      console.log('🚀 PopupController initialization complete');
    } catch (error) {
      console.error('💥 Error in PopupController.init():', error);
      console.error('Stack trace:', error.stack);
      ErrorHandler.logError(error, 'Error initializing popup');
      throw error; // Re-throw so the calling code can handle it
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
    
    // List view buttons
    this.uiElements.backToMain.addEventListener('click', async () => await this.showMainView());
    this.uiElements.clearAllList.addEventListener('click', () => this.handleClearAllFromList());
    


    // Element removal event listeners
    this.setupElementRemovalListeners();
    
    console.log('✅ All event listeners set up successfully');
  }

  /**
   * Setup element removal event listeners
   */
  setupElementRemovalListeners() {
    const removeElementsBtn = document.getElementById('removeElements');
    const removeBlurBtn = document.getElementById('removeBlurFilter');
    const clearRemovedElementsBtn = document.getElementById('clearRemovedElements');
    const removedElementsCountBtn = document.getElementById('removedElementsCount');
    const selectorInput = document.getElementById('selectorToRemove');

    if (removeElementsBtn) {
      removeElementsBtn.addEventListener('click', async () => {
        console.log('🎯 Remove elements button clicked');
        await this.handleRemoveElements();
      });
    }

    if (removeBlurBtn) {
      removeBlurBtn.addEventListener('click', async () => {
        console.log('🌀 Remove blur filter button clicked');
        await this.handleRemoveBlurFilter();
      });
    }

    if (clearRemovedElementsBtn) {
      clearRemovedElementsBtn.addEventListener('click', async () => {
        console.log('🧹 Clear removed elements button clicked');
        await this.handleClearRemovedElements();
      });
    }

    if (removedElementsCountBtn) {
      removedElementsCountBtn.addEventListener('click', () => {
        console.log('📊 Show removed elements list (future feature)');
        // TODO: Show list of removed elements
      });
    }

    // Allow Enter key in selector input
    if (selectorInput) {
      selectorInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
          await this.handleRemoveElements();
        }
      });
    }
  }

  /**
   * Setup message listener for background script communication
   */
  setupMessageListener() {
    this.messageCleanup = MessageHandler.setupMessageListener((message) => {
      if (message.type === 'selectorModeChanged') {
        this.updateSelectorButtonState();
      } else if (message.action === 'updateCount') {
        console.log('🔄 Received count update:', message);
        this.updateHiddenElementsCount(message.count);
        this.updateCounts(); // Update all counts
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
        await this.updateCounts(); // Update all counts
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
   * Handle remove blur filter button click
   */
  async handleRemoveBlurFilter() {
    try {
      console.log('🌀 Removing blur filters');
      
      const response = await MessageHandler.sendToBackground(Constants.ACTIONS.REMOVE_BLUR_FILTER);

      if (response.success) {
        const patterns = response.patterns || [];
        const totalCount = response.count || 0;
        
        if (totalCount > 0) {
          showSuccess(`Eliminados ${totalCount} filtros blur`);
          console.log('Blur patterns removed:', patterns);
        } else {
          showInfo('No se encontraron filtros blur para eliminar');
        }
        
        await this.updateCounts(); // Refresh counts
      } else {
        showError(response.error || 'Error eliminando filtros blur');
      }

    } catch (error) {
      console.error('Error in handleRemoveBlurFilter:', error);
      showError('Error eliminando filtros blur: ' + error.message);
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
   * Show success message (using global function)
   */
  showSuccess(message) {
    showSuccess(message);
  }

  /**
   * Show info message (using global function)
   */
  showInfo(message) {
    showInfo(message);
  }

  /**
   * Show error message (using global function)
   */
  showError(message) {
    showError(`❌ ${message}`);
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

  /**
   * Handle remove elements action
   */
  async handleRemoveElements() {
    try {
      const selectorInput = document.getElementById('selectorToRemove');
      const selector = selectorInput?.value?.trim();

      if (!selector) {
        showError('Por favor ingresa un selector válido');
        return;
      }

      console.log(`🎯 Removing elements with selector: "${selector}"`);
      
      const response = await this.sendMessage({
        action: 'removeElements',
        selector: selector
      });

      if (response.success) {
        showSuccess(`Eliminados ${response.count} elementos (${response.type})`);
        selectorInput.value = ''; // Clear input
        await this.updateCounts(); // Refresh counts
      } else {
        showError(response.error || 'Error eliminando elementos');
      }

    } catch (error) {
      console.error('Error in handleRemoveElements:', error);
      showError('Error eliminando elementos: ' + error.message);
    }
  }

  /**
   * Handle clear removed elements action
   */
  async handleClearRemovedElements() {
    try {
      console.log('🧹 Clearing all removed elements');
      
      const response = await this.sendMessage({
        action: 'clearRemovedElements'
      });

      if (response.success) {
        showSuccess(`Restaurados ${response.clearedCount || 0} elementos (recargando página)`);
        // Page will reload automatically from content script
      } else {
        showError(response.error || 'Error restaurando elementos');
      }

    } catch (error) {
      console.error('Error in handleClearRemovedElements:', error);
      showError('Error restaurando elementos: ' + error.message);
    }
  }

  /**
   * Update UI counts
   */
  async updateCounts() {
    try {
      console.log('📊 Updating counts...');
      
      const response = await this.sendMessage({ action: 'getHiddenCount' });
      
      if (response?.success) {
        const hiddenCount = response.count || 0;
        const removedElementsCount = response.removedElementsCount || 0;
        
        // Update hidden elements count
        if (this.uiElements.hiddenCount) {
          this.uiElements.hiddenCount.textContent = `${hiddenCount} elemento${hiddenCount !== 1 ? 's' : ''}`;
        }
        
        // Update removed elements count
        const removedElementsCountElement = document.getElementById('removedElementsCount');
        if (removedElementsCountElement) {
          removedElementsCountElement.textContent = `${removedElementsCount} elementos`;
        }
        
        console.log(`📊 Updated counts - Hidden: ${hiddenCount}, Removed: ${removedElementsCount}`);
        
      } else {
        console.warn('⚠️ Failed to get counts:', response);
      }
      
    } catch (error) {
      console.error('❌ Error updating counts:', error);
    }
  }

  /**
   * Send message to content script via background
   * @param {Object} message - Message to send
   * @returns {Promise} Response from content script
   */
  async sendMessage(message) {
    try {
      console.log('📨 Sending message:', message);
      
      const response = await MessageHandler.sendToBackground(message.action, message);
      console.log('📨 Response received:', response);
      
      return response;
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error;
    }
  }
}

/**
 * Controller initialization when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🎯 HideThis popup loaded');
  
  try {
    // Test content script connection first
    console.log('🔍 Testing content script connection...');
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    
    if (tabs.length === 0) {
      console.error('❌ No active tab found');
      showError('No hay pestaña activa disponible');
      return;
    }
    
    const activeTab = tabs[0];
    console.log('📋 Active tab:', activeTab.url);
    
    // Try to ping the content script
    try {
      const pingResponse = await chrome.tabs.sendMessage(activeTab.id, { action: 'ping' });
      console.log('✅ Content script connection successful:', pingResponse);
    } catch (connectionError) {
      console.error('❌ Content script connection failed:', connectionError);
      showError('⚠️ No se puede conectar con la página. Recarga la página e intenta de nuevo.');
      
      // Still try to initialize the popup, but with limited functionality
      console.log('⚠️ Continuing with limited functionality...');
    }
    
    // Initialize popup controller
    const popupController = new PopupController();
    await popupController.init();
    
    // Cleanup on close
    window.addEventListener('beforeunload', () => {
      popupController.cleanup();
    });
  } catch (error) {
    console.error('💥 Critical error initializing popup:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    showError('Error crítico al inicializar la extensión: ' + error.message);
  }
});

/**
 * Shows error message to user
 * @param {string} message - Error message to display
 */
function showError(message) {
  console.error('👤 Showing user error:', message);
  
  // Try to show in popup if possible
  const errorContainer = document.getElementById('errorContainer');
  if (errorContainer) {
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
    setTimeout(() => {
      errorContainer.style.display = 'none';
    }, 5000);
  } else {
    // Fallback to alert
    alert(message);
  }
}

/**
 * Show success message
 */
function showSuccess(message) {
  const feedback = document.createElement('div');
  feedback.className = 'feedback success';
  feedback.textContent = message;
  document.body.appendChild(feedback);
  setTimeout(() => feedback.remove(), 3000);
}

/**
 * Show info message
 */
function showInfo(message) {
  const feedback = document.createElement('div');
  feedback.className = 'feedback info';
  feedback.textContent = message;
  document.body.appendChild(feedback);
  setTimeout(() => feedback.remove(), 3000);
}

/**
 * Show error message
 */
function showError(message) {
  const feedback = document.createElement('div');
  feedback.className = 'feedback error';
  feedback.textContent = message;
  document.body.appendChild(feedback);
  setTimeout(() => feedback.remove(), 5000);
} 