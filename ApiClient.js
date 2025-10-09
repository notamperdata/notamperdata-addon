/**
 * ApiClient Module
 * Handles all API communication with the NoTamperData backend.
 */
var ApiClient = (function() {
  /**
   * Sends hash and metadata to the NoTamperData API.
   * @param {string} hash - The generated hash
   * @param {Object} metadata - Metadata about the response
   * @return {Object} API response or error object
   */
  function sendHashToApi(hash, metadata) {
    const accessToken = getAccessToken();
    
    if (!accessToken) {
      console.warn('No access token configured');
      return {
        error: 'Access token is required. Please configure your access token in the add-on settings.'
      };
    }
    
    // Prepare payload
    const payload = {
      hash: hash,
      formId: metadata?.formId || metadata?.form_id,
      responseId: metadata?.responseId || metadata?.response_id, 
      networkId: metadata?.networkId || metadata?.network_id || 0,
      metadata: metadata
    };
    
    // Set up headers
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'User-Agent': 'NoTamperData-GoogleAppsScript/1.0'
    };
    
    const payloadString = JSON.stringify(payload);
    const options = {
      method: 'POST',
      headers: headers,
      payload: payloadString,
      muteHttpExceptions: true,
      followRedirects: false,
      timeout: 60,
      validateHttpsCertificates: true
    };
    
    // Validate payload
    if (!payloadString || payloadString === '{}') {
      console.error('Failed to generate valid payload');
      return {
        error: 'Failed to generate valid request payload'
      };
    }
    
    try {
      console.log('Sending hash to API endpoint...');
      const response = UrlFetchApp.fetch(API_ENDPOINT + "/storehash", options);
      const responseCode = response.getResponseCode();
      const contentText = response.getContentText();
      
      // Check if we got API documentation instead of actual response
      if (contentText && contentText.includes('"endpoint":"storehash"') && contentText.includes('"method":"POST')) {
        console.warn('Received API documentation - might be GET request fallback');
      }
      
      // Handle success responses (2xx)
      if (responseCode >= 200 && responseCode < 300) {
        console.log('Hash sent successfully');
        try {
          const parsedResponse = JSON.parse(contentText);
          return parsedResponse;
        } catch (e) {
          console.error('Failed to parse API response:', e);
          return { success: true };
        }
      } 
      // Handle authentication errors
      else if (responseCode === 401) {
        console.error('Authentication failed - invalid access token');
        return {
          error: 'Invalid access token. Please check your access token configuration.'
        };
      } 
      // Handle insufficient tokens
      else if (responseCode === 402) {
        console.error('Insufficient tokens');
        return {
          error: 'Insufficient tokens. Please purchase more tokens to continue.'
        };
      } 
      // Handle permission errors
      else if (responseCode === 403) {
        console.error('Permission denied');
        return {
          error: 'Access token does not have permission to perform this action.'
        };
      } 
      // Handle connection failures - try GET fallback
      else if (responseCode === 0) {
        console.warn('POST request failed, trying GET fallback...');
        return tryGetFallback(hash, metadata, accessToken);
      } 
      // Handle server errors
      else if (responseCode >= 500) {
        console.error('Server error:', responseCode);
        return {
          error: 'NoTamperData server error. Please try again later.'
        };
      } 
      // Handle other errors
      else {
        console.error('Request failed with status:', responseCode);
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
      console.error('API request exception:', error);
      
      // Handle specific error types
      if (error.toString().includes('timeout')) {
        return {
          error: 'Request timed out. Please try again.'
        };
      } else if (error.toString().includes('network')) {
        console.warn('Network error, trying GET fallback...');
        return tryGetFallback(hash, metadata, accessToken);
      } else {
        return {
          error: 'Unable to connect to verification service.'
        };
      }
    }
  }
  
  /**
   * Fallback function to try GET request when POST fails.
   * Some network configurations may block POST requests.
   * @param {string} hash - The generated hash
   * @param {Object} metadata - Metadata about the response  
   * @param {string} accessToken - The access token
   * @return {Object} API response or error object
   */
  function tryGetFallback(hash, metadata, accessToken) {
    try {
      console.log('Attempting GET fallback...');
      
      // Build URL parameters
      const params = new URLSearchParams({
        hash: hash,
        formId: metadata?.formId || metadata?.form_id || '',
        responseId: metadata?.responseId || metadata?.response_id || '',
        networkId: (metadata?.networkId || metadata?.network_id || 0).toString()
      });
      
      const getUrl = `${API_ENDPOINT}/storehash?${params.toString()}`;
      
      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      };
      
      const response = UrlFetchApp.fetch(getUrl, {
        method: 'GET',
        headers: headers,
        muteHttpExceptions: true,
        timeout: 30
      });
      
      const responseCode = response.getResponseCode();
      const contentText = response.getContentText();
      
      if (responseCode >= 200 && responseCode < 300) {
        console.log('GET fallback successful');
        try {
          const parsedResponse = JSON.parse(contentText);
          return parsedResponse;
        } catch (e) {
          console.error('Failed to parse GET fallback response:', e);
          return { success: true };
        }
      } else {
        console.error('GET fallback also failed');
        return {
          error: 'Both POST and GET requests failed. Please check your connection.'
        };
      }
    } catch (error) {
      console.error('GET fallback exception:', error);
      return {
        error: 'Unable to connect to verification service via any method.'
      };
    }
  }
  
  /**
   * Tests API connectivity and access token authentication.
   * @return {Object} Test result with success/error status
   */
  function testApiConnection() {
    const accessToken = getAccessToken();
    
    if (!accessToken) {
      console.warn('Cannot test connection - no access token');
      return {
        success: false,
        error: 'No access token configured'
      };
    }
    
    const headers = {
      'Authorization': `Bearer ${accessToken}`
    };
    
    try {
      console.log('Testing API connection...');
      const response = UrlFetchApp.fetch(API_ENDPOINT + "/health", {
        'method': 'get',
        'headers': headers,
        'muteHttpExceptions': true,
        'timeout': 10
      });
      
      const responseCode = response.getResponseCode();
      
      if (responseCode === 200) {
        console.log('API connection test successful');
        try {
          const responseData = JSON.parse(response.getContentText());
          
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
        console.error('Invalid access token');
        return {
          success: false,
          error: 'Invalid access token'
        };
      } else if (responseCode === 403) {
        console.error('Access token lacks permissions');
        return {
          success: false,
          error: 'Access token lacks permissions'
        };
      } else {
        console.error('API test failed with status:', responseCode);
        return {
          success: false,
          error: `API test failed with status ${responseCode}`
        };
      }
    } catch (error) {
      console.error('API connection test exception:', error);
      return {
        success: false,
        error: 'Unable to connect to API servers'
      };
    }
  }
  
  /**
   * Checks access token status and remaining token balance.
   * @return {Object} Access token status result
   */
  function checkAccessTokenStatus() {
    const accessToken = getAccessToken();
    
    if (!accessToken) {
      console.warn('Cannot check status - no access token');
      return {
        success: false,
        error: 'No access token configured'
      };
    }
    
    const headers = {
      'Authorization': `Bearer ${accessToken}`
    };
    
    try {
      console.log('Checking access token status...');
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
            console.log('Access token status retrieved successfully');
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
          console.error('Failed to parse status response:', e);
          return {
            success: false,
            error: 'Failed to parse access token status response'
          };
        }
      } else if (responseCode === 401) {
        console.error('Invalid access token');
        return {
          success: false,
          error: 'Invalid access token'
        };
      } else if (responseCode === 404) {
        console.error('Access token not found');
        return {
          success: false,
          error: 'Access token not found'
        };
      } else {
        console.error('Status check failed with code:', responseCode);
        return {
          success: false,
          error: `Access token status check failed with status ${responseCode}`
        };
      }
    } catch (error) {
      console.error('Access token status check exception:', error);
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
  
  // Public API
  return {
    sendHashToApi: sendHashToApi,
    testApiConnection: testApiConnection,
    checkAccessTokenStatus: checkAccessTokenStatus,
    checkApiHealth: checkApiHealth
  };
})();