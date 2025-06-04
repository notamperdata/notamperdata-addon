/**
 * Handles API communication with the Adaverc backend.
 * Simplified for MVP - no authentication required.
 */
var ApiClient = (function() {
  /**
   * Sends hash and metadata to the Adaverc API.
   * @param {String} hash - The generated hash
   * @param {Object} metadata - Metadata about the response
   * @return {Object} API response or error object
   */
  function sendHashToApi(hash, metadata) {
    const payload = {
      hash: hash,
      metadata: metadata
    };
    
    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify(payload),
      'muteHttpExceptions': true,
      'timeout': 30 // 30 second timeout
    };
    
    try {
      console.log(`Sending hash to API: ${API_ENDPOINT}/storehash`);
      
      const response = UrlFetchApp.fetch(API_ENDPOINT + "/storehash", options);
      const responseCode = response.getResponseCode();
      const contentText = response.getContentText();
      
      console.log(`API responded with status code: ${responseCode}`);
      
      if (responseCode >= 200 && responseCode < 300) {
        try {
          return JSON.parse(contentText);
        } catch (e) {
          console.error('Failed to parse API response:', e);
          return { success: true }; // Assume success if we got 2xx
        }
      } else if (responseCode === 0) {
        // Network error
        return {
          error: 'Unable to connect to Adaverc servers. Please check your internet connection.'
        };
      } else if (responseCode >= 500) {
        // Server error
        return {
          error: 'Adaverc server error. Please try again later.'
        };
      } else if (responseCode >= 400) {
        // Client error
        try {
          const errorData = JSON.parse(contentText);
          return {
            error: errorData.error || `Request failed (${responseCode})`
          };
        } catch (e) {
          return {
            error: `Request failed with status ${responseCode}`
          };
        }
      } else {
        return {
          error: `Unexpected response (${responseCode})`
        };
      }
    } catch (error) {
      console.error(`API request error: ${error.toString()}`);
      
      // Handle specific error types
      if (error.toString().includes('DNS error')) {
        return {
          error: 'Unable to reach Adaverc servers. Please check your internet connection.'
        };
      } else if (error.toString().includes('timeout')) {
        return {
          error: 'Request timed out. Please try again.'
        };
      } else {
        return {
          error: 'Unable to connect to verification service.'
        };
      }
    }
  }
  
  /**
   * Health check for API connectivity (optional, for future use).
   * @return {boolean} Whether the API is reachable
   */
  function checkApiHealth() {
    try {
      const response = UrlFetchApp.fetch(API_ENDPOINT + "/health", {
        'method': 'get',
        'muteHttpExceptions': true,
        'timeout': 10
      });
      
      return response.getResponseCode() === 200;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
  
  return {
    sendHashToApi: sendHashToApi,
    checkApiHealth: checkApiHealth
  };
})();