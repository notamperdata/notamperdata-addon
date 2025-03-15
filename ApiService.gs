/**
 * ApiService.gs
 * 
 * Handles communication with the AdaForms API.
 */

var ApiService = (function() {
    // API configuration
    // This should be made configurable in a production implementation
    const API_BASE_URL = 'https://your-api-domain.com/api'; // Replace with your actual API URL
    const API_ENDPOINTS = {
      STORE_HASH: '/hash', // Based on your Next.js route implementation
      VERIFY_HASH: '/verify'
    };
    
    // Maximum number of retry attempts for API calls
    const MAX_RETRIES = 3;
    
    /**
     * Sends a hash and associated metadata to the API.
     * 
     * @param {string} hash - The hash value to send
     * @param {Object} metadata - Associated metadata for the hash
     * @param {number} [retryCount=0] - Current retry attempt (used internally)
     * @return {Object} API response
     */
    function sendHash(hash, metadata, retryCount = 0) {
      const payload = {
        hash: hash,
        metadata: metadata
      };
      
      try {
        const response = makeApiRequest(API_ENDPOINTS.STORE_HASH, payload);
        
        // Log success
        console.log('Hash sent successfully:', hash.substring(0, 10) + '...');
        
        return response;
      } catch (error) {
        console.error('Error sending hash to API:', error);
        
        // Implement retry logic
        if (retryCount < MAX_RETRIES) {
          // Exponential backoff: wait longer with each retry
          const backoffMs = Math.pow(2, retryCount) * 1000;
          Utilities.sleep(backoffMs);
          return sendHash(hash, metadata, retryCount + 1);
        }
        
        throw error;
      }
    }
    
    /**
     * Verifies a hash against the API.
     * 
     * @param {string} hash - The hash to verify
     * @return {Object} Verification result
     */
    function verifyHash(hash) {
      const payload = {
        hash: hash
      };
      
      try {
        return makeApiRequest(API_ENDPOINTS.VERIFY_HASH, payload);
      } catch (error) {
        console.error('Error verifying hash:', error);
        throw error;
      }
    }
    
    /**
     * Makes an HTTP request to the API.
     * 
     * @param {string} endpoint - API endpoint
     * @param {Object} payload - Request payload
     * @return {Object} Parsed API response
     */
    function makeApiRequest(endpoint, payload) {
      const url = API_BASE_URL + endpoint;
      
      const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };
      
      // Make the HTTP request
      const response = UrlFetchApp.fetch(url, options);
      const statusCode = response.getResponseCode();
      const responseText = response.getContentText();
      
      // Check for successful status code
      if (statusCode < 200 || statusCode >= 300) {
        throw new Error('API request failed with status ' + statusCode + ': ' + responseText);
      }
      
      // Parse and return the response
      return JSON.parse(responseText);
    }
    
    // Public API
    return {
      sendHash: sendHash,
      verifyHash: verifyHash
    };
  })();