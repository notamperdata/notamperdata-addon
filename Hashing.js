/**
 * Contains functions for hashing response data.
 */
var Hashing = (function() {
  /**
   * Creates a deterministic hash from response data.
   * @param {Object} responseData - The standardized response data
   * @return {String} SHA-256 hash of the response data
   */
  function hashResponseData(responseData) {
    // Convert to string in a deterministic way (stable ordering of keys)
    const jsonString = JSON.stringify(responseData, function(key, value) {
      // Handle arrays to ensure consistent ordering
      if (Array.isArray(value)) {
        // Sort simple arrays by their string representation
        if (value.every(item => typeof item !== 'object')) {
          return [...value].sort();
        }
        
        // For arrays of objects, sort by stringifying their contents
        return value.map(item => JSON.stringify(item)).sort().map(item => {
          try {
            return JSON.parse(item);
          } catch (e) {
            return item;
          }
        });
      }
      
      // Handle objects to ensure consistent key ordering
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        return Object.keys(value).sort().reduce((obj, k) => {
          obj[k] = value[k];
          return obj;
        }, {});
      }
      
      return value;
    });
    
    // Use Apps Script's Utilities to compute SHA-256 hash
    const bytes = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256, 
      jsonString
    );
    
    // Convert bytes to hex string
    return bytes.map(function(byte) {
      return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
  }
  
  return {
    hashResponseData: hashResponseData
  };
})();