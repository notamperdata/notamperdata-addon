// ==========================================
// CONFIGURATION CONSTANTS
// ==========================================

const API_ENDPOINT = "https://www.notamperdata.com/api";
const ADDON_NAME = "NoTamperData";
const ADDON_VERSION = "1.1.0";
const BATCH_CONFIG_KEY = "NoTamperData_BATCH_CONFIG";
const ACCESS_TOKEN_CONFIG_KEY = "NoTamperData_Access_Token";
const LAST_PROCESSED_KEY = "NoTamperData_LAST_PROCESSED";

// ==========================================
// ADD-ON LIFECYCLE HANDLERS
// ==========================================

/**
 * Runs when the add-on is installed.
 * @param {Object} e - Event object
 */
function onInstall(e) {
  console.log('NoTamperData add-on installed');
  onOpen(e);
  FormApp.getUi().alert(
    'Welcome to NoTamperData!',
    'Thank you for installing NoTamperData. Click on Add-ons → NoTamperData → Open to get started.',
    FormApp.getUi().ButtonSet.OK
  );
}

/**
 * Runs when the form is opened.
 * @param {Object} e - Event object
 */
function onOpen(e) {
  console.log('NoTamperData add-on menu created');
  FormApp.getUi()
    .createAddonMenu()
    .addItem('Open', 'showSidebar')
    .addItem('About', 'showAbout')
    .addToUi();
}

/**
 * Shows the add-on sidebar interface.
 */
function showSidebar() {
  console.log('Opening NoTamperData sidebar');
  const ui = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle(ADDON_NAME)
    .setWidth(350);
  FormApp.getUi().showSidebar(ui);
}

/**
 * Shows the About dialog with version and documentation links.
 */
function showAbout() {
  console.log('Opening About dialog');
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h3 style="color: #0033AD;">About ${ADDON_NAME}</h3>
      <p style="margin-bottom: 15px;">
        Version ${ADDON_VERSION}<br><br>
        NoTamperData provides blockchain-based verification for Google Forms responses, 
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
        <a href="https://www.notamperdata.com/privacy" target="_blank">Privacy Policy</a> | 
        <a href="https://www.notamperdata.com/terms" target="_blank">Terms of Service</a> | 
        <a href="https://www.notamperdata.com/support" target="_blank">Support</a>
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

// ==========================================
// FORM INFORMATION
// ==========================================

/**
 * Retrieves information about the current form including response count and configuration.
 * @return {Object} Form metadata and configuration
 */
function getFormInfo() {
  try {
    const form = FormApp.getActiveForm();
    const responses = form.getResponses();
    const config = getBatchConfig();
    
    console.log(`Form info retrieved: ${responses.length} responses`);
    
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

// ==========================================
// ACCESS TOKEN MANAGEMENT
// ==========================================

/**
 * Saves the access token to document properties after validation.
 * @param {string} accessToken - The access token to save
 * @return {Object} Result object with success status
 */
function saveAccessToken(accessToken) {
  try {
    if (!accessToken || accessToken.trim() === '') {
      return { success: false, error: 'Access token cannot be empty' };
    }
    
    // Validate access token format: ak_[16 alphanumeric characters]
    const tokenPattern = /^ak_[a-zA-Z0-9]{16}$/;
    if (!tokenPattern.test(accessToken.trim())) {
      console.warn('Invalid access token format provided');
      return { 
        success: false, 
        error: 'Invalid access token format. Expected: ak_[16 alphanumeric characters]' 
      };
    }
    
    PropertiesService.getDocumentProperties().setProperty(
      ACCESS_TOKEN_CONFIG_KEY, 
      accessToken.trim()
    );
    console.log('Access token saved successfully');
    return { success: true };
  } catch (error) {
    console.error('Error saving access token:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * Retrieves the stored access token from document properties.
 * @return {string|null} The access token or null if not found
 */
function getAccessToken() {
  try {
    return PropertiesService.getDocumentProperties().getProperty(ACCESS_TOKEN_CONFIG_KEY);
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
}

/**
 * Removes the access token from document properties.
 * @return {Object} Result object with success status
 */
function removeAccessToken() {
  try {
    PropertiesService.getDocumentProperties().deleteProperty(ACCESS_TOKEN_CONFIG_KEY);
    console.log('Access token removed successfully');
    return { success: true };
  } catch (error) {
    console.error('Error removing access token:', error);
    return { success: false, error: error.toString() };
  }
}

// ==========================================
// BATCH CONFIGURATION MANAGEMENT
// ==========================================

/**
 * Retrieves the batch processing configuration.
 * @return {Object} Configuration object with frequency, time, and other settings
 */
function getBatchConfig() {
  try {
    const config = PropertiesService.getDocumentProperties().getProperty(BATCH_CONFIG_KEY);
    if (config) {
      return JSON.parse(config);
    }
    
    // Return default configuration
    return {
      enabled: false,
      frequency: 'daily',
      time: '11:00',
      interval: 24,
      day: 1
    };
  } catch (error) {
    console.error('Error getting batch config:', error);
    return { enabled: false, frequency: 'manual', day: 1 };
  }
}

/**
 * Saves the batch processing configuration and updates triggers accordingly.
 * @param {Object} config - Configuration object
 * @return {Object} Result object with success status
 */
function saveBatchConfig(config) {
  try {
    PropertiesService.getDocumentProperties().setProperty(
      BATCH_CONFIG_KEY, 
      JSON.stringify(config)
    );
    console.log(`Batch config saved: ${config.frequency}, enabled: ${config.enabled}`);
    
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
 * Retrieves the timestamp of the last batch processing.
 * @return {string|null} ISO timestamp string or null
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
 * Sets the timestamp of the last batch processing.
 * @param {string} timestamp - ISO timestamp string
 */
function setLastProcessedTimestamp(timestamp) {
  try {
    PropertiesService.getDocumentProperties().setProperty(LAST_PROCESSED_KEY, timestamp);
    console.log(`Last processed timestamp updated: ${timestamp}`);
  } catch (error) {
    console.error('Error setting last processed timestamp:', error);
  }
}

// ==========================================
// TRIGGER MANAGEMENT
// ==========================================

/**
 * Converts a day number (0-6) to ScriptApp.WeekDay enum.
 * @param {number} dayNumber - Day number (0=Sunday, 6=Saturday)
 * @return {ScriptApp.WeekDay} Week day enum value
 */
function getWeekDayFromNumber(dayNumber) {
  const weekDays = [
    ScriptApp.WeekDay.SUNDAY,
    ScriptApp.WeekDay.MONDAY,
    ScriptApp.WeekDay.TUESDAY,
    ScriptApp.WeekDay.WEDNESDAY,
    ScriptApp.WeekDay.THURSDAY,
    ScriptApp.WeekDay.FRIDAY,
    ScriptApp.WeekDay.SATURDAY
  ];
  
  return weekDays[dayNumber] || ScriptApp.WeekDay.MONDAY;
}

/**
 * Updates batch processing triggers based on configuration.
 * Removes existing triggers and creates new ones.
 * @param {Object} config - Batch configuration object
 */
function updateBatchTriggers(config) {
  try {
    console.log('Updating batch triggers...');
    removeBatchTriggers();
    
    // Small delay to ensure cleanup is complete
    Utilities.sleep(100);
    
    const form = FormApp.getActiveForm();
    
    switch (config.frequency) {
      case 'manual':
        console.log('Manual mode - no triggers created');
        break;
        
      case 'interval':
        ScriptApp.newTrigger('processBatchedResponses')
          .timeBased()
          .everyHours(config.interval || 1)
          .create();
        console.log(`Interval trigger created: every ${config.interval} hours`);
        break;
        
      case 'daily':
        const [hours, minutes] = (config.time || '11:00').split(':');
        ScriptApp.newTrigger('processBatchedResponses')
          .timeBased()
          .everyDays(1)
          .atHour(parseInt(hours))
          .nearMinute(parseInt(minutes))
          .create();
        console.log(`Daily trigger created: ${config.time}`);
        break;
        
      case 'weekly':
        const [weekHours, weekMinutes] = (config.time || '11:00').split(':');
        const dayOfWeek = getWeekDayFromNumber(parseInt(config.day) || 1);
        
        ScriptApp.newTrigger('processBatchedResponses')
          .timeBased()
          .everyWeeks(1)
          .onWeekDay(dayOfWeek)
          .atHour(parseInt(weekHours))
          .nearMinute(parseInt(weekMinutes))
          .create();
        console.log(`Weekly trigger created: day ${config.day} at ${config.time}`);
        break;
    }
    
  } catch (error) {
    console.error('Error updating batch triggers:', error);
    throw error;
  }
}

/**
 * Removes all batch processing triggers.
 */
function removeBatchTriggers() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    let removedCount = 0;
    
    triggers.forEach(function(trigger) {
      if (trigger.getHandlerFunction() === 'processBatchedResponses') {
        ScriptApp.deleteTrigger(trigger);
        removedCount++;
      }
    });
    
    console.log(`Removed ${removedCount} batch processing triggers`);
  } catch (error) {
    console.error('Error removing batch triggers:', error);
  }
}

/**
 * Checks if batch processing is currently enabled.
 * @return {boolean} True if enabled, false otherwise
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

// ==========================================
// DATA STANDARDIZATION
// ==========================================

/**
 * Standardizes form data structure for CSV compatibility and consistent hashing.
 * Ensures deterministic ordering of items and responses.
 * @param {Object} formData - Raw form data structure
 * @return {Object} Standardized data structure
 */
function standardizeDataForCsvCompatibility(formData) {
  let standardized;
  
  // Handle batch data with multiple responses
  if (formData.responses && Array.isArray(formData.responses)) {
    standardized = {
      responseCount: formData.responseCount || formData.responses.length,
      responses: formData.responses.map(function(response, index) {
        return {
          responseId: "response-" + index,
          items: (response.items || [])
            .slice()
            .sort(function(a, b) {
              return (a.title || "").localeCompare(b.title || "");
            })
            .map(function(item) {
              return {
                title: item.title || "",
                response: item.response !== null && item.response !== undefined ? 
                  String(item.response) : ""
              };
            })
        };
      })
    };
  }
  // Handle single response data
  else if (formData.items && Array.isArray(formData.items)) {
    standardized = {
      responseId: "response-0",
      items: formData.items
        .slice()
        .sort(function(a, b) {
          return (a.title || "").localeCompare(b.title || "");
        })
        .map(function(item) {
          return {
            title: item.title || "",
            response: item.response !== null && item.response !== undefined ? 
              String(item.response) : ""
          };
        })
    };
  }
  // Data is already in correct format
  else {
    standardized = formData;
  }
  
  return standardized;
}

// ==========================================
// FORM RESPONSE PROCESSING
// ==========================================

/**
 * Manually processes all form responses.
 * Called from the UI when user clicks "Process Responses" button.
 * @return {Object} Processing result with success status and statistics
 */
function processFormResponses() {
  console.log('Starting manual form processing...');
  try {
    const result = processBatchedResponses();
    
    if (result.success) {
      setLastProcessedTimestamp(new Date().toISOString());
      console.log(`Processing complete. Processed: ${result.processed}/${result.total}`);
    }
    
    return result;
  } catch (error) {
    console.error('Error in manual form processing:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Processes all form responses in a batch, generates hash, and sends to API.
 * This function is called by triggers or manually.
 * @return {Object} Processing result with success status, hash, and statistics
 */
function processBatchedResponses() {
  try {
    console.log('Processing batched responses...');
    const form = FormApp.getActiveForm();
    const allResponses = form.getResponses();
    
    if (allResponses.length === 0) {
      console.log('No responses found in form');
      return { 
        success: true, 
        message: "No responses found in form",
        processed: 0,
        total: 0
      };
    }
    
    // Extract data from all responses
    const batchData = allResponses.map(response => 
      FormHandler.extractResponseData(response)
    );
    
    // Create standardized batch structure
    const batchStructure = {
      formId: form.getId(),
      formTitle: form.getTitle(),
      responseCount: batchData.length,
      responses: batchData
    };
    
    // Standardize and hash
    const standardizedBatch = standardizeDataForCsvCompatibility(batchStructure);
    const batchHash = Hashing.hashStandardizedData(standardizedBatch);
    
    console.log(`Generated batch hash for ${batchData.length} responses`);
    
    // Prepare metadata
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
    
    // Send to API
    console.log('Sending hash to API...');
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
    
    console.log('Batch processing completed successfully');
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
 * Tests API connection and access token validity.
 * @return {Object} Test result with success status and message
 */
function testApiConnection() {
  console.log('Testing API connection...');
  try {
    const result = ApiClient.testApiConnection();
    console.log(`API test result: ${result.success ? 'Success' : 'Failed'}`);
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
 * Gets current processing status including response counts and schedule.
 * @return {Object} Status information including next scheduled run
 */
function getProcessingStatus() {
  try {
    const form = FormApp.getActiveForm();
    const allResponses = form.getResponses();
    const config = getBatchConfig();
    const lastProcessed = getLastProcessedTimestamp();
    
    let nextScheduled = null;
    
    // Calculate next scheduled processing time
    if (config.enabled && config.frequency !== 'manual') {
      const now = new Date();
      switch (config.frequency) {
        case 'interval':
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
          nextScheduled = new Date();
          const selectedDay = parseInt(config.day) || 1;
          const daysUntilTarget = (selectedDay + 7 - nextScheduled.getDay()) % 7 || 7;
          nextScheduled.setDate(nextScheduled.getDate() + daysUntilTarget);
          const [weekHours, weekMinutes] = (config.time || '11:00').split(':');
          nextScheduled.setHours(parseInt(weekHours), parseInt(weekMinutes), 0, 0);
          break;
      }
    }
    
    return {
      totalResponses: allResponses.length,
      readyToProcess: allResponses.length,
      nextScheduled: nextScheduled ? nextScheduled.toISOString() : null,
      lastProcessed: lastProcessed,
      config: config,
      hasAccessToken: !!getAccessToken()
    };
  } catch (error) {
    console.error('Error getting processing status:', error);
    return { error: error.toString() };
  }
}

// ==========================================
// FORM HANDLER MODULE
// ==========================================

var FormHandler = (function() {
  /**
   * Extracts response data from a FormResponse object in a standardized format.
   * Handles different question types and ensures consistent ordering.
   * @param {FormResponse} formResponse - Google Forms response object
   * @return {Object} Standardized response data structure
   */
  function extractResponseData(formResponse) {
    const result = {
      responseId: formResponse.getId(),
      timestamp: formResponse.getTimestamp().toISOString(),
      items: []
    };
    
    try {
      const itemResponses = formResponse.getItemResponses();
      
      itemResponses.forEach(function(itemResponse, index) {
        const item = FormApp.getActiveForm().getItemById(itemResponse.getItem().getId());
        const itemType = item.getType().toString();
        
        let responseValue = itemResponse.getResponse();
        
        // Normalize response values for different question types
        switch(itemType) {
          case 'CHECKBOX':
            // Sort checkbox values for consistency
            responseValue = responseValue.slice().sort();
            break;
          case 'GRID':
          case 'CHECKBOX_GRID':
            // Sort grid response keys for consistency
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
      });
      
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

// ==========================================
// HASHING MODULE
// ==========================================

var Hashing = (function() {
  /**
   * Hashes response data after standardization.
   * @param {Object} responseData - Response data to hash
   * @return {string} SHA-256 hash as hex string
   */
  function hashResponseData(responseData) {
    const standardized = standardizeDataForCsvCompatibility(responseData);
    return createDeterministicHash(standardized);
  }
  
  /**
   * Hashes batch data after standardization.
   * @param {Object} batchData - Batch data to hash
   * @return {string} SHA-256 hash as hex string
   */
  function hashBatchData(batchData) {
    const standardized = standardizeDataForCsvCompatibility(batchData);
    return createDeterministicHash(standardized);
  }
  
  /**
   * Hashes already standardized data.
   * @param {Object} standardizedData - Pre-standardized data
   * @return {string} SHA-256 hash as hex string
   */
  function hashStandardizedData(standardizedData) {
    return createDeterministicHash(standardizedData);
  }
  
  /**
   * Creates a deterministic SHA-256 hash from data.
   * Ensures consistent ordering of object keys and array elements.
   * @param {Object} data - Data to hash
   * @return {string} SHA-256 hash as 64-character hex string
   */
  function createDeterministicHash(data) {
    // Convert to JSON with deterministic key ordering
    const jsonString = JSON.stringify(data, function(key, value) {
      // Handle arrays
      if (Array.isArray(value)) {
        // Sort primitive arrays
        if (value.every(item => typeof item !== 'object' || item === null)) {
          return [...value].sort();
        }
        
        // For arrays of objects, stringify each, sort, then parse back
        return value
          .map(item => JSON.stringify(item, arguments.callee))
          .sort()
          .map(item => {
            try {
              return JSON.parse(item);
            } catch (e) {
              console.error("Parse error in hashing:", e);
              return item;
            }
          });
      }
      
      // Handle objects - sort keys alphabetically
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        return Object.keys(value).sort().reduce((obj, k) => {
          obj[k] = value[k];
          return obj;
        }, {});
      }
      
      return value;
    });
    
    // Compute SHA-256 hash
    const bytes = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256, 
      jsonString
    );
    
    // Convert byte array to hex string
    const hexHash = bytes.map(function(byte) {
      return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
    
    return hexHash;
  }
  
  return {
    hashResponseData: hashResponseData,
    hashBatchData: hashBatchData,
    hashStandardizedData: hashStandardizedData,
    createDeterministicHash: createDeterministicHash
  };
})();