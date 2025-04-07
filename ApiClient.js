/**
 * Contains functions for API communication.
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
      const response = UrlFetchApp.fetch(API_ENDPOINT, options);
      const responseCode = response.getResponseCode();
      const contentText = response.getContentText();
      
      if (responseCode >= 200 && responseCode < 300) {
        return JSON.parse(contentText);
      } else {
        console.error(`API request failed with status ${responseCode}: ${contentText}`);
        return {
          error: `Request failed with status ${responseCode}`,
          details: contentText
        };
      }
    } catch (error) {
      console.error(`API request error: ${error.toString()}`);
      
      // Implement basic retry logic
      try {
        console.log('Retrying API request after failure...');
        Utilities.sleep(2000);  // Wait 2 seconds before retry
        const retryResponse = UrlFetchApp.fetch(API_ENDPOINT, options);
        return JSON.parse(retryResponse.getContentText());
      } catch (retryError) {
        console.error(`Retry also failed: ${retryError.toString()}`);
        throw new Error(`API communication failed: ${error.toString()}`);
      }
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
      // Assuming verify endpoint is at the same base URL but with /verify path
      const verifyEndpoint = API_ENDPOINT.replace('/formhash', '/verify');
      const response = UrlFetchApp.fetch(verifyEndpoint, options);
      return JSON.parse(response.getContentText());
    } catch (error) {
      console.error(`Verification request failed: ${error.toString()}`);
      return {
        verified: false,
        error: error.toString()
      };
    }
  }
  
  return {
    sendHashToApi: sendHashToApi,
    verifyHash: verifyHash
  };
})();