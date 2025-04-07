/**
 * Contains functions for handling form responses.
 */
var FormHandler = (function() {
  /**
   * Extracts response data in a standardized format.
   * @param {FormResponse} formResponse - The form response object
   * @return {Object} Standardized response data
   */
  function extractResponseData(formResponse) {
    const result = {
      responseId: formResponse.getId(),
      timestamp: formResponse.getTimestamp().toISOString(),
      items: []
    };
    
    // Get all item responses
    const itemResponses = formResponse.getItemResponses();
    
    // Process each item response
    itemResponses.forEach(function(itemResponse) {
      const item = FormApp.getActiveForm().getItemById(itemResponse.getItem().getId());
      const itemType = item.getType().toString();
      
      let responseValue = itemResponse.getResponse();
      
      // Handle different item types to ensure consistent formatting
      switch(itemType) {
        case 'CHECKBOX':
          // Ensure array is sorted for consistent hashing
          responseValue = responseValue.slice().sort();
          break;
        case 'GRID':
        case 'CHECKBOX_GRID':
          // Ensure grid responses are consistently ordered
          if (responseValue && typeof responseValue === 'object') {
            responseValue = Object.keys(responseValue).sort().reduce((obj, key) => {
              obj[key] = responseValue[key];
              return obj;
            }, {});
          }
          break;
        // Add other special cases as needed
      }
      
      const response = {
        itemId: item.getId(),
        title: item.getTitle(),
        type: itemType,
        response: responseValue
      };
      
      result.items.push(response);
    });
    
    return result;
  }
  
  return {
    extractResponseData: extractResponseData
  };
})();