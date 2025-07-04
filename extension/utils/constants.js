/**
 * Centralized constants and configurations for HideThis extension
 */
const Constants = {
  // Available actions in the extension
  ACTIONS: {
    PING: 'ping',
    PING_CONTENT_SCRIPT: 'ping',
    TOGGLE_SELECTOR: 'toggleSelector',
    GET_SELECTOR_STATE: 'getSelectorState',
    TOGGLE_VISIBILITY: 'toggleVisibility',
    CLEAR_ALL: 'clearAll',
    GET_HIDDEN_COUNT: 'getHiddenCount',
    ELEMENT_HIDDEN: 'elementHidden',
    ELEMENTS_CLEARED: 'elementsCleared',
    CONTENT_SCRIPT_LOADED: 'contentScriptLoaded',
    CONTENT_SCRIPT_READY: 'contentScriptReady',
    UPDATE_COUNT: 'updateCount',
    TEST: 'test',
    INVALIDATE_CSS: 'invalidateCSS',
    CLEAR_INVALIDATED_CSS: 'clearInvalidatedCSS',
    GET_INVALIDATED_COUNT: 'getInvalidatedCount',
    UPDATE_INVALIDATED_COUNT: 'updateInvalidatedCount',
    GET_HIDDEN_ELEMENTS_LIST: 'getHiddenElementsList',
    GET_INVALIDATED_CSS_LIST: 'getInvalidatedCSSList',
    REMOVE_HIDDEN_ELEMENT: 'removeHiddenElement',
    REMOVE_INVALIDATED_SELECTOR: 'removeInvalidatedSelector'
  },

  // CSS selectors for UI elements
  SELECTORS: {
    TOGGLE_SELECTOR_BTN: '#toggleSelector',
    TOGGLE_VISIBILITY_BTN: '#toggleVisibility',
    CLEAR_ALL_BTN: '#clearAll',
    HIDDEN_COUNT_SPAN: '#hiddenCount',
    CSS_SELECTOR_INPUT: '#cssSelector',
    INVALIDATE_CSS_BTN: '#invalidateCSS',
    CLEAR_INVALIDATED_CSS_BTN: '#clearInvalidatedCSS',
    INVALIDATED_COUNT_SPAN: '#invalidatedCount',
    OVERLAY: '#hidethis-overlay',
    INSTRUCTIONS: '#hidethis-instructions',
    ELEMENT_INFO: '#hidethis-element-info',
    SELECTION_CONTROLS: '#hidethis-selection-controls'
  },

  // CSS classes for styling
  CSS_CLASSES: {
    HIDDEN_ELEMENT: 'hidethis-hidden',
    SELECTED_ELEMENT: 'hidethis-selected',
    HIGHLIGHTED_ELEMENT: 'hidethis-highlighted',
    PENDING_SELECTION: 'hidethis-pending',
    INVALIDATED_STYLE: 'hidethis-invalidated-style'
  },

  // Extension configuration
  CONFIG: {
    HEARTBEAT_DELAY: 500,
    OVERLAY_Z_INDEX: 999999,
    INSTRUCTION_Z_INDEX: 1000000,
    ELEMENT_INFO_Z_INDEX: 1000001,
    SELECTION_CONTROLS_Z_INDEX: 1000002,
    MAX_ELEMENT_HIERARCHY_DEPTH: 10,
    DEBOUNCE_DELAY: 100,
    CSS_INVALIDATION_STYLE_ID: 'hidethis-css-invalidation'
  },

  // CSS styles as strings
  STYLES: {
    OVERLAY: `
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
    `,
    
    ELEMENT_OUTLINE: `
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    `,
    
    HIDDEN_ELEMENT: `
      display: none !important;
    `,
    
    INSTRUCTIONS_CONTAINER: `
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
    `,
    
    ELEMENT_INFO_CONTAINER: `
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
    `,

    // CSS invalidation template - resets all common properties
    CSS_INVALIDATION_TEMPLATE: `
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
    `
  },

  // Interface texts
  TEXTS: {
    ACTIVATE_SELECTOR: 'Activar Selector',
    DEACTIVATE_SELECTOR: 'Desactivar Selector',
    SHOW_HIDE_ELEMENTS: 'Mostrar/Ocultar Elementos',
    CLEAR_ALL: 'Limpiar Todo',
    INVALIDATE_CSS: 'Invalidar CSS',
    CLEAR_INVALIDATED_CSS: 'Restaurar CSS',
    ELEMENTS_COUNT: (count) => `${count} elemento${count !== 1 ? 's' : ''}`,
    INVALIDATED_COUNT: (count) => `${count} regla${count !== 1 ? 's' : ''}`,
    
    INSTRUCTIONS: {
      TITLE: '🎯 Modo Selector Activo',
      LINES: [
        '• Mueve el ratón para seleccionar elementos',
        '• Click para ocultar el elemento',
        '• Esc para cancelar',
        '• ↑/↓ para seleccionar elemento padre/hijo'
      ]
    },
    
    ELEMENT_INFO: {
      TAG: 'Etiqueta',
      CLASS: 'Clase',
      ID: 'ID',
      SIZE: 'Tamaño'
    },
    
    ERRORS: {
      NO_ACTIVE_TAB: 'No hay pestaña activa disponible',
      COMMUNICATION_ERROR: 'Error de comunicación con la página',
      CONNECTION_FAILED: 'No se pudo establecer conexión con la página',
      ELEMENT_NOT_FOUND: 'Elemento no encontrado',
      INVALID_ACTION: 'Acción inválida',
      EXTENSION_RELOAD_REQUIRED: 'Es necesario recargar la extensión',
      INVALID_CSS_SELECTOR: 'Selector CSS inválido',
      CSS_SELECTOR_REQUIRED: 'Debe especificar un selector CSS'
    }
  },

  // Site-specific configurations
  SITE_CONFIGS: {
    'youtube.com': {
      SPA_MODE: true,
      NAVIGATION_SELECTOR: 'yt-navigate-finish',
      SPECIAL_HANDLING: true
    },
    'facebook.com': {
      SPA_MODE: true,
      NAVIGATION_SELECTOR: 'pushState',
      SPECIAL_HANDLING: true
    },
    'twitter.com': {
      SPA_MODE: true,
      NAVIGATION_SELECTOR: 'pushState',
      SPECIAL_HANDLING: true
    },
    'x.com': {
      SPA_MODE: true,
      NAVIGATION_SELECTOR: 'pushState',
      SPECIAL_HANDLING: true
    }
  },

  // Elements that should not be selectable
  EXCLUDED_ELEMENTS: [
    'html',
    'body',
    'head',
    'script',
    'style',
    'meta',
    'link',
    'title'
  ],

  // Selectors that indicate extension system elements
  SYSTEM_SELECTORS: [
    '#hidethis-overlay',
    '#hidethis-instructions',
    '#hidethis-element-info',
    '#hidethis-selection-controls',
    '[id^="hidethis-"]',
    '[class*="hidethis-"]'
  ]
};

// Helper function to get site configuration
Constants.getSiteConfig = function(hostname) {
  for (const [site, config] of Object.entries(this.SITE_CONFIGS)) {
    if (hostname.includes(site)) {
      return config;
    }
  }
  return null;
};

// Helper function to check if element should be excluded
Constants.isExcludedElement = function(element) {
  if (!element || !element.tagName) return true;
  
  const tagName = element.tagName.toLowerCase();
  return this.EXCLUDED_ELEMENTS.includes(tagName);
};

// Helper function to check if element is system element
Constants.isSystemElement = function(element) {
  if (!element) return false;
  
  return this.SYSTEM_SELECTORS.some(selector => {
    try {
      return element.matches(selector);
    } catch (e) {
      return false;
    }
  });
};

// Helper function to validate CSS selector
Constants.isValidCSSSelector = function(selector) {
  if (!selector || typeof selector !== 'string') return false;
  
  // Basic validation for class, ID, or attribute selectors
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
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Constants;
} else {
  window.Constants = Constants;
} 