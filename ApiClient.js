/**
 * Handles API communication with the NoTamperData backend.
 * Includes access token authentication for enhanced security.
 */
var ApiClient = (function() {
  /**
   * Sends hash and metadata to the NoTamperData API.
   * @param {String} hash - The generated hash
   * @param {Object} metadata - Metadata about the response
   * @return {Object} API response or error object
   */
  function sendHashToApi(hash, metadata) {
    // Get access token from stored configuration
    const accessToken = getaccessToken();
    
    if (!accessToken) {
      console.error('No access token configured');
      return {
        error: 'Access token is required. Please configure your access token in the add-on settings.'
      };
    }
    
    const payload = {
      hash: hash,
      metadata: metadata
      // No access token in request body - using header only
    };
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`  // Industry standard Bearer token
    };
    
    const options = {
      'method': 'post',
      'headers': headers,
      'payload': JSON.stringify(payload),
      'muteHttpExceptions': true,
      'timeout': 30 // 30 second timeout
    };
    
    try {
      console.log(`Sending hash to API: ${API_ENDPOINT}/storehash`);
      console.log(`Using access token: ${accessToken.substring(0, 8)}...`); // Log first 8 chars for debugging
      
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
        // Unauthorized - likely invalid access token
        return {
          error: 'Invalid access token. Please check your access token configuration.'
        };
      } else if (responseCode === 402) {
        // Payment required - insufficient tokens
        return {
          error: 'Insufficient tokens. Please purchase more tokens to continue.'
        };
      } else if (responseCode === 403) {
        // Forbidden - access token might be valid but lacks permissions
        return {
          error: 'Access token does not have permission to perform this action.'
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
      } else {
        // Parse error response if available
        try {
          const errorResponse = JSON.parse(contentText);
          return {
            error: errorResponse.error || `Request failed with status ${responseCode}`
          };
        } catch (e) {
          return {
            error: `Request failed with status ${responseCode}`
          };
        }
      }
    } catch (error) {
      console.error('API request failed:', error);
      
      if (error.toString().includes('timeout')) {
        return {
          error: 'Request timed out. Please try again.'
        };
      } else if (error.toString().includes('network')) {
        return {
          error: 'Unable to connect to NoTamperData servers. Please check your internet connection.'
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
    const accessToken = getaccessToken();
    
    if (!accessToken) {
      return {
        success: false,
        error: 'No access token configured'
      };
    }
    
    const headers = {
      'Authorization': `Bearer ${accessToken}`  // Standard Bearer authentication
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
        try {
          const responseData = JSON.parse(response.getContentText());
          
          // Check if authentication was validated
          if (responseData.authentication && responseData.authentication.validated) {
            return {
              success: true,
              message: 'API connection and access token validation successful'
            };
          } else {
            return {
              success: true,
              message: 'API connection successful (access token not validated by server)'
            };
          }
        } catch (e) {
          return {
            success: true,
            message: 'API connection successful'
          };
        }
      } else if (responseCode === 401) {
        return {
          success: false,
          error: 'Invalid access token'
        };
      } else if (responseCode === 403) {
        return {
          success: false,
          error: 'Access token lacks permissions'
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
   * Check access token status and remaining tokens.
   * @return {Object} Access token status result
   */
  function checkAccessTokenStatus() {
    const accessToken = getaccessToken();
    
    if (!accessToken) {
      return {
        success: false,
        error: 'No access token configured'
      };
    }
    
    const headers = {
      'Authorization': `Bearer ${accessToken}`  // Standard Bearer authentication
    };
    
    try {
      const response = UrlFetchApp.fetch(API_ENDPOINT + "/access-token-status", {
        'method': 'get',
        'headers': headers,
        'muteHttpExceptions': true,
        'timeout': 10
      });
      
      const responseCode = response.getResponseCode();
      const contentText = response.getContentText();
      
      if (responseCode === 200) {
        try {
          const statusData = JSON.parse(contentText);
          if (statusData.success && statusData.data) {
            return {
              success: true,
              data: statusData.data
            };
          } else {
            return {
              success: false,
              error: statusData.error || 'Failed to get access token status'
            };
          }
        } catch (e) {
          return {
            success: false,
            error: 'Failed to parse access token status response'
          };
        }
      } else if (responseCode === 401) {
        return {
          success: false,
          error: 'Invalid access token'
        };
      } else if (responseCode === 404) {
        return {
          success: false,
          error: 'Access token not found'
        };
      } else {
        return {
          success: false,
          error: `Access token status check failed with status ${responseCode}`
        };
      }
    } catch (error) {
      console.error('Access token status check failed:', error);
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
    checkAccessTokenStatus: checkAccessTokenStatus,
    checkApiHealth: checkApiHealth
  };
})();