/**
 * Contains functions for handling form responses.
 * Simplified with clearer logging and error handling.
 */
var FormHandler = (function() {
  /**
   * Extracts response data in a standardized format.
   * @param {FormResponse} formResponse - The form response object
   * @return {Object} Standardized response data
   */
  function extractResponseData(formResponse) {
    console.log(`Extracting data from response ID: ${formResponse.getId()}`);
    
    const result = {
      responseId: formResponse.getId(),
      timestamp: formResponse.getTimestamp().toISOString(),
      items: []
    };
    
    try {
      // Get all item responses
      const itemResponses = formResponse.getItemResponses();
      console.log(`Processing ${itemResponses.length} response items`);
      
      // Process each item response
      itemResponses.forEach(function(itemResponse, index) {
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
        }
        
        const response = {
          itemId: item.getId(),
          title: item.getTitle(),
          type: itemType,
          response: responseValue
        };
        
        result.items.push(response);
        
        // Log brief info about each item (optional, for debugging)
        console.log(`Item ${index + 1}: ${itemType} - "${item.getTitle().substring(0, 20)}..."`);
      });
      
      console.log(`Successfully processed response data`);
      return result;
    } catch (error) {
      console.error(`Error extracting response data: ${error.toString()}`);
      throw new Error(`Failed to extract response data: ${error.toString()}`);
    }
  }
  
  return {
    extractResponseData: extractResponseData
  };
})();