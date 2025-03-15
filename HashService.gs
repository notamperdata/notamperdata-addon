/**
 * HashService.gs
 * 
 * Provides utility functions for generating cryptographic hashes.
 * Implements a SHA-256 algorithm for Google Apps Script environment.
 */

var HashService = (function() {
    /**
     * Converts a string to a SHA-256 hash.
     * 
     * @param {string} str - The string to hash
     * @return {string} The hexadecimal representation of the hash
     */
    function sha256(str) {
      // Since Google Apps Script doesn't have built-in crypto functions,
      // we use a pure JavaScript implementation of SHA-256
      // This is a simplified version for the demo
      // In production, you'd want to use a well-tested library
      
      // For the demo, we'll use Utilities.computeDigest which provides various hashing algorithms
      const bytes = Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256, 
        str, 
        Utilities.Charset.UTF_8
      );
      
      return bytesToHex(bytes);
    }
    
    /**
     * Converts a byte array to a hex string.
     * 
     * @param {Byte[]} bytes - Array of bytes
     * @return {string} Hex string
     */
    function bytesToHex(bytes) {
      return bytes.map(function(byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
      }).join('');
    }
    
    /**
     * Canonicalizes an object for consistent hashing by converting it to
     * a sorted, deterministic JSON string.
     * 
     * @param {Object} obj - The object to canonicalize
     * @return {string} Canonical string representation
     */
    function canonicalize(obj) {
      if (typeof obj !== 'object' || obj === null) {
        // Handle primitive types
        return String(obj);
      }
      
      if (Array.isArray(obj)) {
        // Sort arrays if they contain primitive values
        // For arrays of objects, maintain original order
        const canHandleSort = obj.every(item => 
          typeof item !== 'object' || item === null
        );
        
        return JSON.stringify(
          canHandleSort ? obj.slice().sort() : obj,
          replacer
        );
      }
      
      // For objects, we'll ensure deterministic key ordering
      return JSON.stringify(obj, replacer);
    }
    
    /**
     * Custom replacer function for JSON.stringify to ensure deterministic output.
     */
    function replacer(key, value) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Sort object keys for deterministic output
        return Object.keys(value).sort().reduce(function(result, key) {
          result[key] = value[key];
          return result;
        }, {});
      }
      return value;
    }
    
    /**
     * Hashes an object by first canonicalizing it and then hashing the result.
     * 
     * @param {Object} obj - The object to hash
     * @return {string} Hash as a hex string
     */
    function hashObject(obj) {
      const canonicalStr = canonicalize(obj);
      return sha256(canonicalStr);
    }
    
    // Public API
    return {
      sha256: sha256,
      hashObject: hashObject
    };
  })();