// API endpoint - Update this to match your deployment
// For testing: "http://localhost:3000/api"
// For production: "https://adaverc.vercel.app/api"
const API_ENDPOINT = "https://adaverc.vercel.app/api";

// Add-on metadata
const ADDON_NAME = "Adaverc";
const ADDON_VERSION = "1.1.0";

// Configuration for batch processing
const BATCH_CONFIG_KEY = "ADAVERC_BATCH_CONFIG";
const API_KEY_CONFIG_KEY = "ADAVERC_API_KEY";
const LAST_PROCESSED_KEY = "ADAVERC_LAST_PROCESSED";

/**
 * Runs when the add-on is installed.
 * @param {Object} e - The installation event object
 */
function onInstall(e) {
  onOpen(e);
  // Show welcome message on first install
  FormApp.getUi().alert(
    'Welcome to Adaverc!',
    'Thank you for installing Adaverc. Click on Add-ons → Adaverc → Open to get started.',
    FormApp.getUi().ButtonSet.OK
  );
}

/**
 * Runs when the form is opened.
 * @param {Object} e - The open event object
 */
function onOpen(e) {
  FormApp.getUi()
    .createAddonMenu()
    .addItem('Open', 'showSidebar')
    .addItem('About', 'showAbout')
    .addToUi();
}

/**
 * Shows the main sidebar interface.
 */
function showSidebar() {
  const ui = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle(ADDON_NAME)
    .setWidth(350);
  FormApp.getUi().showSidebar(ui);
}

/**
 * Shows about dialog with links to privacy policy and terms.
 */
function showAbout() {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h3 style="color: #0033AD;">About ${ADDON_NAME}</h3>
      <p style="margin-bottom: 15px;">
        Version ${ADDON_VERSION}<br><br>
        Adaverc provides blockchain-based verification for Google Forms responses, 
        ensuring data integrity through cryptographic hashing with cost-efficient batch processing.
      </p>
      <p style="margin-bottom: 15px;">
        <strong>How it works:</strong><br>
        • Form responses are collected and processed in batches<br>
        • Responses are hashed together at scheduled intervals<br>
        • Only hashes are sent to our servers<br>
        • Your actual form data never leaves Google<br>
        • Hashes can be verified at any time
      </p>
      <p style="margin-bottom: 20px;">
        <a href="https://adaverc.vercel.app/privacy" target="_blank">Privacy Policy</a> | 
        <a href="https://adaverc.vercel.app/terms" target="_blank">Terms of Service</a> | 
        <a href="https://adaverc.vercel.app/support" target="_blank">Support</a>
      </p>
      <div style="text-align: center; margin-top: 20px;">
        <button onclick="google.script.host.close()">Close</button>
      </div>
    </div>
  `;
  
  const htmlOutput = HtmlService.createHtmlOutput(htmlContent)
    .setWidth(400)
    .setHeight(350);
  
  FormApp.getUi().showModalDialog(htmlOutput, 'About ' + ADDON_NAME);
}

/**
 * Get information about the current form.
 * @return {Object} Form information
 */
function getFormInfo() {
  try {
    const form = FormApp.getActiveForm();
    const responses = form.getResponses();
    const config = getBatchConfig();
    
    return {
      title: form.getTitle(),
      id: form.getId(),
      description: form.getDescription() || 'No description',
      isAcceptingResponses: form.isAcceptingResponses(),
      totalResponses: responses.length,
      batchConfig: config
    };
  } catch (error) {
    console.error('Error getting form info:', error);
    return {
      error: 'Unable to access form information'
    };
  }
}

/**
 * Save API key.
 * @param {string} apiKey - The API key to save
 * @return {Object} Result object
 */
function saveApiKey(apiKey) {
  try {
    if (!apiKey || apiKey.trim() === '') {
      return { success: false, error: 'API key cannot be empty' };
    }
    
    PropertiesService.getDocumentProperties().setProperty(API_KEY_CONFIG_KEY, apiKey.trim());
    console.log('API key saved successfully');
    return { success: true };
  } catch (error) {
    console.error('Error saving API key:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * Get saved API key.
 * @return {string|null} The saved API key or null
 */
function getApiKey() {
  try {
    return PropertiesService.getDocumentProperties().getProperty(API_KEY_CONFIG_KEY);
  } catch (error) {
    console.error('Error getting API key:', error);
    return null;
  }
}

/**
 * Get current batch configuration.
 * @return {Object} Batch configuration
 */
function getBatchConfig() {
  try {
    const config = PropertiesService.getDocumentProperties().getProperty(BATCH_CONFIG_KEY);
    if (config) {
      return JSON.parse(config);
    }
    
    // Default configuration
    return {
      enabled: false,
      frequency: 'daily', // 'manual', 'hourly', 'daily', 'weekly'
      time: '11:00', // For daily/weekly scheduling
      interval: 24 // Hours for interval-based scheduling
    };
  } catch (error) {
    console.error('Error getting batch config:', error);
    return { enabled: false, frequency: 'manual' };
  }
}

/**
 * Save batch configuration.
 * @param {Object} config - Batch configuration
 * @return {Object} Result object
 */
function saveBatchConfig(config) {
  try {
    PropertiesService.getDocumentProperties().setProperty(
      BATCH_CONFIG_KEY, 
      JSON.stringify(config)
    );
    
    // Update triggers based on new configuration
    if (config.enabled) {
      updateBatchTriggers(config);
    } else {
      removeBatchTriggers();
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error saving batch config:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * Get last processed timestamp.
 * @return {string|null} ISO timestamp or null
 */
function getLastProcessedTimestamp() {
  try {
    return PropertiesService.getDocumentProperties().getProperty(LAST_PROCESSED_KEY);
  } catch (error) {
    console.error('Error getting last processed timestamp:', error);
    return null;
  }
}

/**
 * Update last processed timestamp.
 * @param {string} timestamp - ISO timestamp
 */
function setLastProcessedTimestamp(timestamp) {
  try {
    PropertiesService.getDocumentProperties().setProperty(LAST_PROCESSED_KEY, timestamp);
  } catch (error) {
    console.error('Error setting last processed timestamp:', error);
  }
}

/**
 * Update batch processing triggers based on configuration.
 * @param {Object} config - Batch configuration
 */
function updateBatchTriggers(config) {
  try {
    // Remove existing triggers first
    removeBatchTriggers();
    
    const form = FormApp.getActiveForm();
    
    switch (config.frequency) {
      case 'manual':
        // No automatic triggers for manual mode
        break;
        
      case 'hourly':
        ScriptApp.newTrigger('processBatchedResponses')
          .timeBased()
          .everyHours(config.interval || 1)
          .create();
        break;
        
      case 'daily':
        const [hours, minutes] = (config.time || '11:00').split(':');
        ScriptApp.newTrigger('processBatchedResponses')
          .timeBased()
          .everyDays(1)
          .atHour(parseInt(hours))
          .nearMinute(parseInt(minutes))
          .create();
        break;
        
      case 'weekly':
        const [weekHours, weekMinutes] = (config.time || '11:00').split(':');
        ScriptApp.newTrigger('processBatchedResponses')
          .timeBased()
          .everyWeeks(1)
          .onWeekDay(ScriptApp.WeekDay.MONDAY)
          .atHour(parseInt(weekHours))
          .nearMinute(parseInt(weekMinutes))
          .create();
        break;
    }
    
    console.log(`Batch triggers updated for ${config.frequency} processing`);
  } catch (error) {
    console.error('Error updating batch triggers:', error);
    throw error;
  }
}

/**
 * Remove all batch processing triggers.
 */
function removeBatchTriggers() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(function(trigger) {
      if (trigger.getHandlerFunction() === 'processBatchedResponses') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    console.log('Batch triggers removed');
  } catch (error) {
    console.error('Error removing batch triggers:', error);
  }
}

/**
 * Check if batch processing is enabled.
 * @return {boolean} Whether batch processing is enabled
 */
function isBatchProcessingEnabled() {
  try {
    const config = getBatchConfig();
    return config.enabled === true;
  } catch (error) {
    console.error('Error checking batch status:', error);
    return false;
  }
}

/**
 * Standardizes form response data to enable CSV export verification.
 * Removes dynamic fields and normalizes structure for consistent hashing.
 * @param {Object} formData - The form response data
 * @return {Object} Standardized data structure
 */
function standardizeFormDataForCsvCompatibility(formData) {
  console.log("Standardizing form data for CSV compatibility");
  
  let standardized;
  
  // Handle batch data (multiple responses)
  if (formData.responses && Array.isArray(formData.responses)) {
    standardized = {
      responseCount: formData.responseCount || formData.responses.length,
      responses: formData.responses.map(function(response, index) {
        return {
          // Normalize response ID to be predictable
          responseId: "response-" + index,
          // Remove timestamp entirely - not needed for CSV compatibility
          // Standardize items
          items: (response.items || [])
            .slice() // Create copy
            .sort(function(a, b) {
              // Sort by title alphabetically for consistency
              return (a.title || "").localeCompare(b.title || "");
            })
            .map(function(item) {
              return {
                // Remove dynamic itemId and type
                title: item.title || "",
                response: item.response !== null && item.response !== undefined ? String(item.response) : ""
              };
            })
        };
      })
    };
  }
  // Handle single response
  else if (formData.items && Array.isArray(formData.items)) {
    standardized = {
      responseId: "response-0",
      // Remove timestamp entirely
      items: formData.items
        .slice()
        .sort(function(a, b) {
          return (a.title || "").localeCompare(b.title || "");
        })
        .map(function(item) {
          return {
            title: item.title || "",
            response: item.response !== null && item.response !== undefined ? String(item.response) : ""
          };
        })
    };
  }
  else {
    // If it's already in a different format, return as-is
    standardized = formData;
  }
  
  console.log("Data standardized successfully");
  return standardized;
}

/**
 * Main function to process all responses in batch.
 * Called by time-based triggers or manually.
 * Always processes ALL responses, not just new ones.
 * @return {Object} Processing result
 */
function processBatchedResponses() {
  try {
    console.log("Starting batch processing of ALL responses");
    
    const form = FormApp.getActiveForm();
    const allResponses = form.getResponses();
    
    if (allResponses.length === 0) {
      console.log("No responses to process");
      return { 
        success: true, 
        message: "No responses found in form",
        processed: 0,
        total: 0
      };
    }
    
    console.log(`Processing ALL ${allResponses.length} responses`);
    
    // Extract all response data
    const batchData = allResponses.map(response => 
      FormHandler.extractResponseData(response)
    );
    
    // Create batch structure
    const batchStructure = {
      formId: form.getId(),
      formTitle: form.getTitle(),
      responseCount: batchData.length,
      responses: batchData
    };
    
    // Apply standardization for CSV compatibility
    const standardizedBatch = standardizeFormDataForCsvCompatibility(batchStructure);
    
    // Create batch hash from standardized data
    const batchHash = Hashing.hashBatchData(standardizedBatch);
    
    // Prepare metadata for the batch
    const metadata = {
      formId: form.getId(),
      responseId: `batch-all-${Date.now()}`,
      timestamp: new Date().toISOString(),
      batchInfo: {
        responseCount: batchData.length,
        firstResponseId: batchData.length > 0 ? batchData[0]?.responseId : null,
        lastResponseId: batchData.length > 0 ? batchData[batchData.length - 1]?.responseId : null,
        totalFormResponses: allResponses.length,
        processingType: "all_responses_standardized"
      }
    };
    
    console.log(`Generated standardized batch hash: ${batchHash} for ${batchData.length} responses`);
    
    // Send batch hash to API
    const result = ApiClient.sendHashToApi(batchHash, metadata);
    
    if (result.error) {
      console.error(`API error: ${JSON.stringify(result)}`);
      return { 
        success: false, 
        error: result.error,
        processed: 0,
        total: allResponses.length
      };
    }
    
    console.log(`Batch processing completed successfully - processed ALL responses with standardization`);
    return { 
      success: true, 
      hash: batchHash,
      processed: allResponses.length,
      total: allResponses.length,
      processingType: "all_responses_standardized"
    };
  } catch (error) {
    console.error(`Error in batch processing: ${error.toString()}`);
    return {
      success: false,
      error: error.toString(),
      processed: 0
    };
  }
}

/**
 * Test API connection and authentication.
 * @return {Object} Test result with success/error status
 */
function testApiConnection() {
  try {
    const result = ApiClient.testApiConnection();
    console.log('API connection test result:', result);
    return result;
  } catch (error) {
    console.error('Error testing API connection:', error);
    return {
      success: false,
      error: 'Failed to test API connection: ' + error.toString()
    };
  }
}

/**
 * Get processing status and statistics.
 * @return {Object} Status information
 */
function getProcessingStatus() {
  try {
    const form = FormApp.getActiveForm();
    const allResponses = form.getResponses();
    const config = getBatchConfig();
    
    let nextScheduled = null;
    
    // Calculate next scheduled run
    if (config.enabled && config.frequency !== 'manual') {
      // This is a simplified calculation - in practice, you'd check the actual trigger schedule
      const now = new Date();
      switch (config.frequency) {
        case 'hourly':
          nextScheduled = new Date(now.getTime() + (config.interval || 1) * 60 * 60 * 1000);
          break;
        case 'daily':
          const [hours, minutes] = (config.time || '11:00').split(':');
          nextScheduled = new Date();
          nextScheduled.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          if (nextScheduled <= now) {
            nextScheduled.setDate(nextScheduled.getDate() + 1);
          }
          break;
        case 'weekly':
          // Simplified - next Monday at specified time
          nextScheduled = new Date();
          const daysUntilMonday = (1 + 7 - nextScheduled.getDay()) % 7 || 7;
          nextScheduled.setDate(nextScheduled.getDate() + daysUntilMonday);
          const [weekHours, weekMinutes] = (config.time || '11:00').split(':');
          nextScheduled.setHours(parseInt(weekHours), parseInt(weekMinutes), 0, 0);
          break;
      }
    }
    
    return {
      totalResponses: allResponses.length,
      readyToProcess: allResponses.length, // All responses are always ready to process
      nextScheduled: nextScheduled ? nextScheduled.toISOString() : null,
      config: config,
      hasApiKey: !!getApiKey()
    };
  } catch (error) {
    console.error('Error getting processing status:', error);
    return { error: error.toString() };
  }
}

//HELPER FUNCTIONS

/**
 * Functions for handling form responses.
 */
var FormHandler = (function() {
  /**
   * Extracts response data in a standardized format.
   * @param {FormResponse} formResponse - The form response object
   * @return {Object} Standardized response data
   */
  function extractResponseData(formResponse) {
    console.log(`Extracting data from response ID: ${formResponse.getId()}`);
    
    const result = {
      responseId: formResponse.getId(),
      timestamp: formResponse.getTimestamp().toISOString(),
      items: []
    };
    
    try {
      // Get all item responses
      const itemResponses = formResponse.getItemResponses();
      console.log(`Processing ${itemResponses.length} response items`);
      
      // Process each item response
      itemResponses.forEach(function(itemResponse, index) {
        const item = FormApp.getActiveForm().getItemById(itemResponse.getItem().getId());
        const itemType = item.getType().toString();
        
        let responseValue = itemResponse.getResponse();
        
        // Handle different item types to ensure consistent formatting
        switch(itemType) {
          case 'CHECKBOX':
            // Ensure array is sorted for consistent hashing
            responseValue = responseValue.slice().sort();
            break;
          case 'GRID':
          case 'CHECKBOX_GRID':
            // Ensure grid responses are consistently ordered
            if (responseValue && typeof responseValue === 'object') {
              responseValue = Object.keys(responseValue).sort().reduce((obj, key) => {
                obj[key] = responseValue[key];
                return obj;
              }, {});
            }
            break;
        }
        
        const response = {
          itemId: item.getId(),
          title: item.getTitle(),
          type: itemType,
          response: responseValue
        };
        
        result.items.push(response);
        
        // Log brief info about each item (optional, for debugging)
        console.log(`Item ${index + 1}: ${itemType} - "${item.getTitle().substring(0, 20)}..."`);
      });
      
      console.log(`Successfully processed response data`);
      return result;
    } catch (error) {
      console.error(`Error extracting response data: ${error.toString()}`);
      throw new Error(`Failed to extract response data: ${error.toString()}`);
    }
  }
  
  return {
    extractResponseData: extractResponseData
  };
})();

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
    return createDeterministicHash(responseData);
  }
  
  /**
   * Creates a deterministic hash from batch data.
   * @param {Object} batchData - The batch data containing multiple responses
   * @return {String} SHA-256 hash of the batch data
   */
  function hashBatchData(batchData) {
    return createDeterministicHash(batchData);
  }
  
  /**
   * Creates a deterministic hash from any data object.
   * This function must match exactly the hashing logic in the web app.
   * @param {Object} data - The data to hash
   * @return {String} SHA-256 hash as hex string
   */
  function createDeterministicHash(data) {
    // Convert to string in a deterministic way (stable ordering of keys)
    const jsonString = JSON.stringify(data, function(key, value) {
      // Handle arrays to ensure consistent ordering
      if (Array.isArray(value)) {
        // Sort simple arrays by their string representation
        if (value.every(item => typeof item !== 'object' || item === null)) {
          return [...value].sort();
        }
        
        // For arrays of objects, sort by stringifying their contents first
        return value
          .map(item => JSON.stringify(item, arguments.callee)) // Use the same replacer function recursively
          .sort()
          .map(item => {
            try {
              return JSON.parse(item);
            } catch (e) {
              console.log("Parse error in hashing:", e);
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
    
    console.log("Hashing JSON string:", jsonString.substring(0, 200) + "...");
    
    // Use Apps Script's Utilities to compute SHA-256 hash
    const bytes = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256, 
      jsonString
    );
    
    // Convert bytes to hex string
    const hexHash = bytes.map(function(byte) {
      return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
    
    console.log("Generated hash:", hexHash);
    return hexHash;
  }
  
  return {
    hashResponseData: hashResponseData,
    hashBatchData: hashBatchData,
    createDeterministicHash: createDeterministicHash
  };
})();