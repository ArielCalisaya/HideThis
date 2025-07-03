// Popup JavaScript for HideThis
class PopupController {
  constructor() {
    this.isSelectorActive = false;
    this.hiddenCount = 0;
    this.init();
  }

  init() {
    // Get DOM elements
    this.toggleSelectorBtn = document.getElementById('toggleSelector');
    this.toggleVisibilityBtn = document.getElementById('toggleVisibility');
    this.clearAllBtn = document.getElementById('clearAll');
    this.hiddenCountSpan = document.getElementById('hiddenCount');

    // Add event listeners
    this.toggleSelectorBtn.addEventListener('click', () => this.toggleSelector());
    this.toggleVisibilityBtn.addEventListener('click', () => this.toggleVisibility());
    this.clearAllBtn.addEventListener('click', () => this.clearAll());

    // Load initial state
    this.loadInitialState();

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'updateCount') {
        this.updateHiddenCount(request.count);
      }
    });
  }

  async loadInitialState() {
    try {
      const response = await this.sendMessageToContentScript({ action: 'getHiddenCount' });
      if (response && response.count !== undefined) {
        this.updateHiddenCount(response.count);
      }
    } catch (error) {
      console.error('Error loading initial state:', error);
    }
  }

  async toggleSelector() {
    try {
      // First, ping the content script to make sure it's loaded
      try {
        const pingResponse = await this.sendMessageToContentScript({ action: 'ping' });
        
        if (!pingResponse || !pingResponse.success) {
          console.warn('⚠️ Ping failed, but attempting direct toggle anyway');
        }
      } catch (pingError) {
        console.warn('⚠️ Ping failed with error, but attempting direct toggle anyway');
      }
      
      const response = await this.sendMessageToContentScript({ action: 'toggleSelector' });
      
      if (response && response.success) {
        this.isSelectorActive = response.isActive !== undefined ? response.isActive : !this.isSelectorActive;
        this.updateSelectorButton();
      } else {
        console.error('❌ Failed to toggle selector:', response);
        
        // Check if it's a connection error specifically
        if (response && response.error && response.error.includes('Could not establish connection')) {
          alert('❌ Error: La extensión no puede conectarse con esta página.\n\nEsto puede ocurrir en:\n- Páginas especiales del navegador (chrome://, about:, etc.)\n- Sitios con políticas de seguridad muy estrictas\n- Páginas que bloquean extensiones\n\nIntenta:\n1. Recargar la página\n2. Recargar la extensión\n3. Probar en otra página web');
        } else {
          alert('❌ Error al activar el selector.\n\nDetalles: ' + (response?.error || 'Respuesta inesperada') + '\n\nRevisa la consola para más información.');
        }
      }
    } catch (error) {
      console.error('❌ Error toggling selector:', error);
      
      if (error.message && error.message.includes('Could not establish connection')) {
        alert('❌ Error de conexión: La extensión no puede comunicarse con esta página.\n\nSoluciones:\n1. Recarga la página (F5)\n2. Recarga la extensión en chrome://extensions/\n3. Prueba en otra página web\n\nAlgunas páginas (como YouTube) pueden tener restricciones especiales.');
      } else {
        alert('❌ Error inesperado: ' + error.message + '\n\nRevisa la consola para más detalles.');
      }
    }
  }

  async toggleVisibility() {
    try {
      const response = await this.sendMessageToContentScript({ action: 'toggleVisibility' });
      if (response && response.success) {
        // Update count after toggling visibility
        const countResponse = await this.sendMessageToContentScript({ action: 'getHiddenCount' });
        if (countResponse && countResponse.count !== undefined) {
          this.updateHiddenCount(countResponse.count);
        }
      }
    } catch (error) {
      console.error('Error toggling visibility:', error);
    }
  }

  async clearAll() {
    try {
      const response = await this.sendMessageToContentScript({ action: 'clearAll' });
      if (response && response.success) {
        this.updateHiddenCount(0);
      }
    } catch (error) {
      console.error('Error clearing all:', error);
    }
  }

  sendMessageToContentScript(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }

  updateSelectorButton() {
    if (this.isSelectorActive) {
      this.toggleSelectorBtn.textContent = 'Desactivar Selector';
      this.toggleSelectorBtn.classList.remove('bg-primary-600', 'hover:bg-primary-700');
      this.toggleSelectorBtn.classList.add('bg-red-600', 'hover:bg-red-700');
    } else {
      this.toggleSelectorBtn.textContent = 'Activar Selector';
      this.toggleSelectorBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
      this.toggleSelectorBtn.classList.add('bg-primary-600', 'hover:bg-primary-700');
    }
  }

  updateHiddenCount(count) {
    this.hiddenCount = count;
    this.hiddenCountSpan.textContent = `${count} elemento${count !== 1 ? 's' : ''}`;
    
    // Update visibility button state
    if (count > 0) {
      this.toggleVisibilityBtn.disabled = false;
      this.toggleVisibilityBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
      this.toggleVisibilityBtn.disabled = true;
      this.toggleVisibilityBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
  }
}

// Initialize controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
}); 