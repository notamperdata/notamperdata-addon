/**
 * FormHandler.gs
 * 
 * Handles extracting and processing form response data in a consistent format.
 */

var FormHandler = (function() {
  /**
   * Extracts response data from a FormResponse object and returns a standardized object.
   * This standardization is crucial for consistent hashing.
   * 
   * @param {FormApp.FormResponse} formResponse - The form response to process
   * @return {Object} Standardized response data object
   */
  function getResponseData(formResponse) {
    const responseData = {
      responseId: formResponse.getId(),
      timestamp: formResponse.getTimestamp().toISOString(),
      items: []
    };
    
    // Get all item responses
    const itemResponses = formResponse.getItemResponses();
    
    // Process each response item
    for (let i = 0; i < itemResponses.length; i++) {
      const itemResponse = itemResponses[i];
      const item = itemResponse.getItem();
      const itemId = item.getId();
      const title = item.getTitle();
      const type = item.getType().toString();
      const response = itemResponse.getResponse();
      
      // Create a standardized item response object
      const responseItem = {
        itemId: itemId,
        title: title,
        type: type,
        response: processResponseByType(response, type)
      };
      
      responseData.items.push(responseItem);
    }
    
    return responseData;
  }
  
  /**
   * Processes a response value based on its item type to ensure consistent formatting.
   * 
   * @param {*} response - The response value
   * @param {string} type - The item type
   * @return {*} Processed response value
   */
  function processResponseByType(response, type) {
    // Handle different response types consistently
    switch (type) {
      case 'CHECKBOX':
        // Ensure consistent ordering for checkbox responses
        return Array.isArray(response) ? response.sort() : response;
        
      case 'GRID':
      case 'CHECKBOX_GRID':
        // Ensure grid responses are consistently formatted
        if (typeof response === 'object' && !Array.isArray(response)) {
          const keys = Object.keys(response).sort();
          const sortedResponse = {};
          for (let i = 0; i < keys.length; i++) {
            const value = response[keys[i]];
            sortedResponse[keys[i]] = Array.isArray(value) ? value.sort() : value;
          }
          return sortedResponse;
        }
        return response;
        
      case 'DATE':
        // Ensure dates are in ISO format
        return response instanceof Date ? response.toISOString() : response;
        
      default:
        return response;
    }
  }
  
  /**
   * Processes a batch of form responses.
   * 
   * @param {FormApp.FormResponse[]} responses - Array of form responses
   * @return {Object[]} Array of standardized response data objects
   */
  function processResponseBatch(responses) {
    const processedResponses = [];
    
    for (let i = 0; i < responses.length; i++) {
      processedResponses.push(getResponseData(responses[i]));
    }
    
    return processedResponses;
  }
  
  // Public API
  return {
    getResponseData: getResponseData,
    processResponseBatch: processResponseBatch
  };
})();