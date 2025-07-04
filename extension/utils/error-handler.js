/**
 * Utility for handling errors consistently throughout the extension
 * Provides structured logging and common error handling
 */
class ErrorHandler {
  /**
   * Common error types in the extension
   */
  static ErrorTypes = {
    COMMUNICATION: 'COMMUNICATION_ERROR',
    PERMISSION: 'PERMISSION_ERROR',
    VALIDATION: 'VALIDATION_ERROR',
    NETWORK: 'NETWORK_ERROR',
    UNKNOWN: 'UNKNOWN_ERROR'
  };

  /**
   * Logs an error with additional context
   * @param {Error|string} error - Error or error message
   * @param {string} context - Context where error occurred
   * @param {Object} metadata - Additional metadata
   */
  static logError(error, context = 'Unknown', metadata = {}) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      context,
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      metadata,
      url: window.location?.href || 'N/A'
    };

    console.error(`[${context}] Error:`, errorInfo);
    
    // In production, this could be sent to a logging service
    // this.sendToAnalytics(errorInfo);
  }

  /**
   * Handles communication errors with Chrome APIs
   * @param {Error} error - Communication error
   * @param {string} action - Action that caused the error
   * @returns {Object} Standardized error response
   */
  static handleCommunicationError(error, action = 'unknown') {
    const errorMessage = error?.message || 'Unknown communication error';
    
    this.logError(error, 'Communication', { action });
    
    // Determine specific type of communication error
    if (errorMessage.includes('Could not establish connection')) {
      return {
        success: false,
        error: 'Could not establish connection with page',
        type: this.ErrorTypes.COMMUNICATION,
        userMessage: 'Extension cannot communicate with this page. Try reloading the page or extension.',
        action
      };
    }
    
    if (errorMessage.includes('No active tab')) {
      return {
        success: false,
        error: 'No active tab',
        type: this.ErrorTypes.PERMISSION,
        userMessage: 'No active tab found. Make sure you have a tab open.',
        action
      };
    }
    
    return {
      success: false,
      error: errorMessage,
      type: this.ErrorTypes.COMMUNICATION,
      userMessage: 'Communication error. Try reloading the page.',
      action
    };
  }

  /**
   * Handles validation errors
   * @param {string} message - Validation error message
   * @param {string} field - Field that failed validation
   * @returns {Object} Standardized error response
   */
  static handleValidationError(message, field = null) {
    this.logError(message, 'Validation', { field });
    
    return {
      success: false,
      error: message,
      type: this.ErrorTypes.VALIDATION,
      field,
      userMessage: message
    };
  }

  /**
   * Handles permission errors
   * @param {string} permission - Permission that failed
   * @returns {Object} Standardized error response
   */
  static handlePermissionError(permission) {
    const message = `Required permission: ${permission}`;
    this.logError(message, 'Permission', { permission });
    
    return {
      success: false,
      error: message,
      type: this.ErrorTypes.PERMISSION,
      permission,
      userMessage: `Extension needs ${permission} permission. Check extension settings.`
    };
  }

  /**
   * Handles network errors
   * @param {Error} error - Network error
   * @param {string} url - URL that caused the error
   * @returns {Object} Standardized error response
   */
  static handleNetworkError(error, url = null) {
    this.logError(error, 'Network', { url });
    
    return {
      success: false,
      error: error.message,
      type: this.ErrorTypes.NETWORK,
      url,
      userMessage: 'Connection error. Check your internet connection.'
    };
  }

  /**
   * Handles generic errors
   * @param {Error|string} error - Generic error
   * @param {string} context - Error context
   * @returns {Object} Standardized error response
   */
  static handleGenericError(error, context = 'Unknown') {
    const message = error instanceof Error ? error.message : error;
    this.logError(error, context);
    
    return {
      success: false,
      error: message,
      type: this.ErrorTypes.UNKNOWN,
      context,
      userMessage: 'An unexpected error occurred. Please try again.'
    };
  }

  /**
   * Shows error message to user
   * @param {Object} errorResponse - Standardized error response
   * @param {boolean} showAlert - Whether to show alert (default true)
   */
  static showUserError(errorResponse, showAlert = true) {
    if (!errorResponse.userMessage) return;

    if (showAlert) {
      alert(`Error: ${errorResponse.userMessage}`);
    }

    // Here could integrate with a more sophisticated notification system
    console.warn('Error shown to user:', errorResponse.userMessage);
  }

  /**
   * Validates that a DOM element exists
   * @param {Element} element - Element to validate
   * @param {string} elementName - Element name for error
   * @returns {Object|null} Error if validation fails, null if valid
   */
  static validateElement(element, elementName = 'element') {
    if (!element) {
      return this.handleValidationError(`${elementName} not found`, elementName);
    }
    return null;
  }

  /**
   * Validates that an action is valid
   * @param {string} action - Action to validate
   * @param {string[]} validActions - List of valid actions
   * @returns {Object|null} Error if validation fails, null if valid
   */
  static validateAction(action, validActions = []) {
    if (!action) {
      return this.handleValidationError('Action not specified', 'action');
    }
    
    if (validActions.length > 0 && !validActions.includes(action)) {
      return this.handleValidationError(`Invalid action: ${action}`, 'action');
    }
    
    return null;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorHandler;
} else {
  window.ErrorHandler = ErrorHandler;
} 