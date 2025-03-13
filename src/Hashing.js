/**
 * Contains functions for hashing response data.
 */
var Hashing = (function() {
    /**
     * Creates a deterministic hash from response data.
     * Uses a simple approach for the demo.
     * @param {Object} responseData - The standardized response data
     * @return {String} SHA-256 hash of the response data
     */
    function hashResponseData(responseData) {
      // Convert to string in a deterministic way (stable ordering)
      const jsonString = JSON.stringify(responseData, function(key, value) {
        // Handle arrays to ensure consistent ordering
        if (Array.isArray(value)) {
          // Sort arrays by stringifying their contents
          return value.map(item => JSON.stringify(item)).sort().map(item => JSON.parse(item));
        }
        return value;
      });
      
      // Use Apps Script's Utilities to compute SHA-256 hash
      return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, jsonString)
        .map(function(byte) {
          // Convert to hex string
          return ('0' + (byte & 0xFF).toString(16)).slice(-2);
        }).join('');
    }
    
    return {
      hashResponseData: hashResponseData
    };
  })();