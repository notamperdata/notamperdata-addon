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
        const response = {
          itemId: item.getId(),
          title: item.getTitle(),
          type: item.getType().toString(),
          response: itemResponse.getResponse()
        };
        
        result.items.push(response);
      });
      
      return result;
    }
    
    return {
      extractResponseData: extractResponseData
    };
  })();