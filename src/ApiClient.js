/**
 * Contains functions for API communication.
 */
var ApiClient = (function() {
    // TODO: Replace with configuration from user settings
    const API_ENDPOINT = "https://your-nextjs-api.vercel.app/api/formhash";
    
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
        'payload': JSON.stringify(payload)
      };
      
      try {
        const response = UrlFetchApp.fetch(API_ENDPOINT, options);
        return JSON.parse(response.getContentText());
      } catch (error) {
        console.error(`API request failed: ${error.toString()}`);
        // In a production version, implement retry logic here
        throw error;
      }
    }
    
    return {
      sendHashToApi: sendHashToApi
    };
  })();