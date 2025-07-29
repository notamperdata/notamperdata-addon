/**
 * Handles API communication with the NoTamperData backend.
 * Includes API key authentication for enhanced security.
 */
var ApiClient = (function() {
  /**
   * Sends hash and metadata to the NoTamperData API.
   * @param {String} hash - The generated hash
   * @param {Object} metadata - Metadata about the response
   * @return {Object} API response or error object
   */
  function sendHashToApi(hash, metadata) {
    // Get API key from stored configuration
    const apiKey = getApiKey();
    
    if (!apiKey) {
      console.error('No API key configured');
      return {
        error: 'API key is required. Please configure your API key in the add-on settings.'
      };
    }
    
    const payload = {
      hash: hash,
      metadata: metadata
    };
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add API key to headers
    headers['Authorization'] = `Bearer ${apiKey}`;
    // Alternative header format if needed
    headers['X-API-Key'] = apiKey;
    
    const options = {
      'method': 'post',
      'headers': headers,
      'payload': JSON.stringify(payload),
      'muteHttpExceptions': true,
      'timeout': 30 // 30 second timeout
    };
    
    try {
      console.log(`Sending hash to API: ${API_ENDPOINT}/storehash`);
      console.log(`Using API key: ${apiKey.substring(0, 8)}...`); // Log first 8 chars for debugging
      
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
      } else if (responseCode === 401) {
        // Unauthorized - likely invalid API key
        return {
          error: 'Invalid API key. Please check your API key configuration.'
        };
      } else if (responseCode === 403) {
        // Forbidden - API key might be valid but lacks permissions
        return {
          error: 'API key does not have permission to perform this action.'
        };
      } else if (responseCode === 0) {
        // Network error
        return {
          error: 'Unable to connect to NoTamperData servers. Please check your internet connection.'
        };
      } else if (responseCode >= 500) {
        // Server error
        return {
          error: 'NoTamperData server error. Please try again later.'
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
          error: 'Unable to reach NoTamperData servers. Please check your internet connection.'
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
   * Test API connectivity and authentication.
   * @return {Object} Test result with success/error status
   */
  function testApiConnection() {
    const apiKey = getApiKey();
    
    if (!apiKey) {
      return {
        success: false,
        error: 'No API key configured'
      };
    }
    
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'X-API-Key': apiKey
    };
    
    try {
      const response = UrlFetchApp.fetch(API_ENDPOINT + "/health", {
        'method': 'get',
        'headers': headers,
        'muteHttpExceptions': true,
        'timeout': 10
      });
      
      const responseCode = response.getResponseCode();
      
      if (responseCode === 200) {
        return {
          success: true,
          message: 'API connection successful'
        };
      } else if (responseCode === 401) {
        return {
          success: false,
          error: 'Invalid API key'
        };
      } else if (responseCode === 403) {
        return {
          success: false,
          error: 'API key lacks permissions'
        };
      } else {
        return {
          success: false,
          error: `API test failed with status ${responseCode}`
        };
      }
    } catch (error) {
      console.error('API connection test failed:', error);
      return {
        success: false,
        error: 'Unable to connect to API servers'
      };
    }
  }
  
  /**
   * Health check for API connectivity (legacy function, kept for compatibility).
   * @return {boolean} Whether the API is reachable
   */
  function checkApiHealth() {
    const result = testApiConnection();
    return result.success;
  }
  
  return {
    sendHashToApi: sendHashToApi,
    testApiConnection: testApiConnection,
    checkApiHealth: checkApiHealth
  };
})();