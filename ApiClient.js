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
    console.log('🔧 === ApiClient.sendHashToApi CALLED ===');
    console.log('Hash:', hash?.substring(0, 16) + '...');
    console.log('Metadata keys:', Object.keys(metadata || {}));
    
    // Get access token from stored configuration
    const accessToken = getaccessToken();
    
    if (!accessToken) {
      console.error('No access token configured');
      return {
        error: 'Access token is required. Please configure your access token in the add-on settings.'
      };
    }
    
    // FIXED: Match the API's expected request structure
    // Extract formId and responseId from metadata to top level
    const payload = {
      hash: hash,
      formId: metadata?.formId || metadata?.form_id,
      responseId: metadata?.responseId || metadata?.response_id, 
      networkId: metadata?.networkId || metadata?.network_id || 0,
      metadata: metadata // Keep full metadata object as well
    };
    
    console.log('🔧 Request payload structure:', {
      hasHash: !!payload.hash,
      hasFormId: !!payload.formId,
      hasResponseId: !!payload.responseId,
      networkId: payload.networkId
    });
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'User-Agent': 'NoTamperData-GoogleAppsScript/1.0'
    };
    
    // Prepare request options with multiple fallback strategies
    const payloadString = JSON.stringify(payload);
    const options = {
      method: 'POST', // Use uppercase for Google Apps Script
      headers: headers,
      payload: payloadString,
      muteHttpExceptions: true,
      followRedirects: false, // Prevent method changes on redirects
      timeout: 60,
      validateHttpsCertificates: true
    };
    
    // Validate payload before sending
    if (!payloadString || payloadString === '{}') {
      console.error('❌ Empty or invalid payload generated');
      return {
        error: 'Failed to generate valid request payload'
      };
    }
    
    try {
      console.log(`🌐 Sending hash to API: ${API_ENDPOINT}/storehash`);
      console.log(`🔑 Using access token: ${accessToken.substring(0, 8)}...`);
      console.log('📦 Payload size:', payloadString.length, 'characters');
      console.log('🔧 HTTP Method:', options.method);
      console.log('🔧 Content-Type:', headers['Content-Type']);
      console.log('🔧 Payload preview:', payloadString.substring(0, 100) + '...');
      
      // Make the API request
      console.log('📡 Making UrlFetchApp request...');
      const response = UrlFetchApp.fetch(API_ENDPOINT + "/storehash", options);
      
      const responseCode = response.getResponseCode();
      const contentText = response.getContentText();
      
      console.log(`📬 API responded with status code: ${responseCode}`);
      console.log(`📄 Response content preview: ${contentText?.substring(0, 200)}...`);
      
      // Check if we got the GET endpoint response (API documentation)
      if (contentText && contentText.includes('"endpoint":"storehash"') && contentText.includes('"method":"POST')) {
        console.warn('⚠️ WARNING: Received API documentation - might be GET request fallback');
        // Don't return error immediately, as the new API handles both GET and POST
      }
      
      // Additional check for successful hash storage
      if (contentText && contentText.includes('"success":true') && contentText.includes('"transactionHash"')) {
        console.log('✅ Hash storage transaction detected in response');
      }
      
      if (responseCode >= 200 && responseCode < 300) {
        try {
          const parsedResponse = JSON.parse(contentText);
          console.log('✅ Successfully parsed API response');
          return parsedResponse;
        } catch (e) {
          console.error('Failed to parse API response:', e);
          console.log('Raw response content:', contentText);
          return { success: true }; // Assume success if we got 2xx
        }
      } else if (responseCode === 401) {
        // Unauthorized - likely invalid access token
        console.error('❌ 401 Unauthorized - Invalid access token');
        return {
          error: 'Invalid access token. Please check your access token configuration.'
        };
      } else if (responseCode === 402) {
        // Payment required - insufficient tokens
        console.error('❌ 402 Payment Required - Insufficient tokens');
        return {
          error: 'Insufficient tokens. Please purchase more tokens to continue.'
        };
      } else if (responseCode === 403) {
        // Forbidden - access token might be valid but lacks permissions
        console.error('❌ 403 Forbidden - Access token lacks permissions');
        return {
          error: 'Access token does not have permission to perform this action.'
        };
      } else if (responseCode === 0) {
        // Network error - try GET fallback as last resort
        console.error('❌ Network error - Response code 0, trying GET fallback...');
        return tryGetFallback(hash, metadata, accessToken);
      } else if (responseCode >= 500) {
        // Server error
        console.error('❌ Server error - Status:', responseCode);
        return {
          error: 'NoTamperData server error. Please try again later.'
        };
      } else {
        // Parse error response if available
        console.error('❌ Unexpected response code:', responseCode);
        console.log('Error response content:', contentText);
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
      console.error('💥 API request failed with exception:', error);
      
      if (error.toString().includes('timeout')) {
        return {
          error: 'Request timed out. Please try again.'
        };
      } else if (error.toString().includes('network')) {
        // Try GET fallback as last resort
        console.log('🔄 Network error detected, attempting GET fallback...');
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
    console.log('🔄 Attempting GET fallback request...');
    
    try {
      // Construct GET URL with parameters
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
      
      console.log('🌐 GET fallback URL:', getUrl);
      
      const response = UrlFetchApp.fetch(getUrl, {
        method: 'GET',
        headers: headers,
        muteHttpExceptions: true,
        timeout: 30
      });
      
      const responseCode = response.getResponseCode();
      const contentText = response.getContentText();
      
      console.log(`📬 GET fallback responded with: ${responseCode}`);
      
      if (responseCode >= 200 && responseCode < 300) {
        try {
          const parsedResponse = JSON.parse(contentText);
          console.log('✅ GET fallback successful');
          return parsedResponse;
        } catch (e) {
          console.error('Failed to parse GET fallback response');
          return { success: true };
        }
      } else {
        console.error('❌ GET fallback also failed:', responseCode);
        return {
          error: 'Both POST and GET requests failed. Please check your connection.'
        };
      }
    } catch (error) {
      console.error('💥 GET fallback exception:', error);
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