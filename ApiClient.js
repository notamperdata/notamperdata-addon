/**
 * Contains functions for API communication.
 * Simplified to use hardcoded endpoint and basic error handling.
 */
var ApiClient = (function() {
  /**
   * Sends hash and metadata to external API.
   * @param {String} hash - The generated hash
   * @param {Object} metadata - Metadata about the response
   * @return {Object} API response
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
      'muteHttpExceptions': true
    };
    
    try {
      console.log(`Sending hash to API: ${API_ENDPOINT}/formhash`);
      
      const response = UrlFetchApp.fetch(API_ENDPOINT + "/formhash", options);
      const responseCode = response.getResponseCode();
      const contentText = response.getContentText();
      
      console.log(`API responded with status code: ${responseCode}`);
      
      if (responseCode >= 200 && responseCode < 300) {
        return JSON.parse(contentText);
      } else {
        console.error(`API request failed with status ${responseCode}: ${contentText}`);
        return {
          error: `API request failed with status ${responseCode}`,
          details: contentText
        };
      }
    } catch (error) {
      console.error(`API request error: ${error.toString()}`);
      return {
        error: `API communication failed: ${error.toString()}`
      };
    }
  }
  
  /**
   * Verifies a hash against the API.
   * @param {String} hash - The hash to verify
   * @return {Object} Verification result
   */
  function verifyHash(hash) {
    const payload = {
      hash: hash
    };
    
    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify(payload),
      'muteHttpExceptions': true
    };
    
    try {
      console.log(`Verifying hash with API: ${API_ENDPOINT}/verify`);
      
      const response = UrlFetchApp.fetch(API_ENDPOINT + "/verify", options);
      const responseCode = response.getResponseCode();
      const contentText = response.getContentText();
      
      console.log(`Verification API responded with status code: ${responseCode}`);
      
      if (responseCode >= 200 && responseCode < 300) {
        return JSON.parse(contentText);
      } else {
        console.error(`Verification request failed with status ${responseCode}: ${contentText}`);
        return {
          verified: false,
          error: `Verification failed with status ${responseCode}`
        };
      }
    } catch (error) {
      console.error(`Verification request failed: ${error.toString()}`);
      return {
        verified: false,
        error: `Verification request failed: ${error.toString()}`
      };
    }
  }
  
  return {
    sendHashToApi: sendHashToApi,
    verifyHash: verifyHash
  };
})();