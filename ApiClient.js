/**
 * Handles API communication with the NoTamperData backend.
 */
var ApiClient = (function() {
  /**
   * Sends hash and metadata to the NoTamperData API.
   * @param {String} hash - The generated hash
   * @param {Object} metadata - Metadata about the response
   * @return {Object} API response or error object
   */
  function sendHashToApi(hash, metadata) {
    const accessToken = getaccessToken();
    
    if (!accessToken) {
      return {
        error: 'Access token is required. Please configure your access token in the add-on settings.'
      };
    }
    
    const payload = {
      hash: hash,
      formId: metadata?.formId || metadata?.form_id,
      responseId: metadata?.responseId || metadata?.response_id, 
      networkId: metadata?.networkId || metadata?.network_id || 0,
      metadata: metadata
    };
    
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
    
    if (!payloadString || payloadString === '{}') {
      return {
        error: 'Failed to generate valid request payload'
      };
    }
    
    try {
      const response = UrlFetchApp.fetch(API_ENDPOINT + "/storehash", options);
      const responseCode = response.getResponseCode();
      const contentText = response.getContentText();
      
      if (contentText && contentText.includes('"endpoint":"storehash"') && contentText.includes('"method":"POST')) {
        console.warn('Received API documentation - might be GET request fallback');
      }
      
      if (responseCode >= 200 && responseCode < 300) {
        try {
          const parsedResponse = JSON.parse(contentText);
          return parsedResponse;
        } catch (e) {
          console.error('Failed to parse API response:', e);
          return { success: true };
        }
      } else if (responseCode === 401) {
        return {
          error: 'Invalid access token. Please check your access token configuration.'
        };
      } else if (responseCode === 402) {
        return {
          error: 'Insufficient tokens. Please purchase more tokens to continue.'
        };
      } else if (responseCode === 403) {
        return {
          error: 'Access token does not have permission to perform this action.'
        };
      } else if (responseCode === 0) {
        return tryGetFallback(hash, metadata, accessToken);
      } else if (responseCode >= 500) {
        return {
          error: 'NoTamperData server error. Please try again later.'
        };
      } else {
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
        return tryGetFallback(hash, metadata, accessToken);
      } else {
        return {
          error: 'Unable to connect to verification service.'
        };
      }
    }
  }
  
  /**
   * Fallback function to try GET request when POST fails
   * @param {String} hash - The generated hash
   * @param {Object} metadata - Metadata about the response  
   * @param {String} accessToken - The access token
   * @return {Object} API response or error object
   */
  function tryGetFallback(hash, metadata, accessToken) {
    try {
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
        try {
          const parsedResponse = JSON.parse(contentText);
          return parsedResponse;
        } catch (e) {
          console.error('Failed to parse GET fallback response:', e);
          return { success: true };
        }
      } else {
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
      'Authorization': `Bearer ${accessToken}`
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
      'Authorization': `Bearer ${accessToken}`
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