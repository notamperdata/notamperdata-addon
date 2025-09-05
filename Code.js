const API_ENDPOINT = "https://www.notamperdata.com/api";
const ADDON_NAME = "NoTamperData";
const ADDON_VERSION = "1.1.0";
const BATCH_CONFIG_KEY = "NoTamperData_BATCH_CONFIG";
const Access_Token_CONFIG_KEY = "NoTamperData_Access_Token";
const LAST_PROCESSED_KEY = "NoTamperData_LAST_PROCESSED";

/**
 * Runs when the add-on is installed.
 */
function onInstall(e) {
  onOpen(e);
  FormApp.getUi().alert(
    'Welcome to NoTamperData!',
    'Thank you for installing NoTamperData. Click on Add-ons → NoTamperData → Open to get started.',
    FormApp.getUi().ButtonSet.OK
  );
}

/**
 * Runs when the form is opened.
 */
function onOpen(e) {
  FormApp.getUi()
    .createAddonMenu()
    .addItem('Open', 'showSidebar')
    .addItem('About', 'showAbout')
    .addToUi();
}

function showSidebar() {
  const ui = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle(ADDON_NAME)
    .setWidth(350);
  FormApp.getUi().showSidebar(ui);
}

function showAbout() {
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

function saveaccessToken(accessToken) {
  try {
    if (!accessToken || accessToken.trim() === '') {
      return { success: false, error: 'access token cannot be empty' };
    }
    
    PropertiesService.getDocumentProperties().setProperty(Access_Token_CONFIG_KEY, accessToken.trim());
    return { success: true };
  } catch (error) {
    console.error('Error saving access token:', error);
    return { success: false, error: error.toString() };
  }
}

function getaccessToken() {
  try {
    return PropertiesService.getDocumentProperties().getProperty(Access_Token_CONFIG_KEY);
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
}

function removeaccessToken() {
  try {
    PropertiesService.getDocumentProperties().deleteProperty(Access_Token_CONFIG_KEY);
    return { success: true };
  } catch (error) {
    console.error('Error removing access token:', error);
    return { success: false, error: error.toString() };
  }
}

function getBatchConfig() {
  try {
    const config = PropertiesService.getDocumentProperties().getProperty(BATCH_CONFIG_KEY);
    if (config) {
      return JSON.parse(config);
    }
    
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

function saveBatchConfig(config) {
  try {
    PropertiesService.getDocumentProperties().setProperty(
      BATCH_CONFIG_KEY, 
      JSON.stringify(config)
    );
    
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

function getLastProcessedTimestamp() {
  try {
    return PropertiesService.getDocumentProperties().getProperty(LAST_PROCESSED_KEY);
  } catch (error) {
    console.error('Error getting last processed timestamp:', error);
    return null;
  }
}

function setLastProcessedTimestamp(timestamp) {
  try {
    PropertiesService.getDocumentProperties().setProperty(LAST_PROCESSED_KEY, timestamp);
  } catch (error) {
    console.error('Error setting last processed timestamp:', error);
  }
}

/**
 * Convert day number to ScriptApp.WeekDay enum.
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

function updateBatchTriggers(config) {
  try {
    removeBatchTriggers();
    
    const form = FormApp.getActiveForm();
    
    switch (config.frequency) {
      case 'manual':
        break;
        
      case 'interval':
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
        const dayOfWeek = getWeekDayFromNumber(parseInt(config.day) || 1);
        
        ScriptApp.newTrigger('processBatchedResponses')
          .timeBased()
          .everyWeeks(1)
          .onWeekDay(dayOfWeek)
          .atHour(parseInt(weekHours))
          .nearMinute(parseInt(weekMinutes))
          .create();
        break;
    }
    
  } catch (error) {
    console.error('Error updating batch triggers:', error);
    throw error;
  }
}

function removeBatchTriggers() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(function(trigger) {
      if (trigger.getHandlerFunction() === 'processBatchedResponses') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
  } catch (error) {
    console.error('Error removing batch triggers:', error);
  }
}

function isBatchProcessingEnabled() {
  try {
    const config = getBatchConfig();
    return config.enabled === true;
  } catch (error) {
    console.error('Error checking batch status:', error);
    return false;
  }
}

function standardizeDataForCsvCompatibility(formData) {
  let standardized;
  
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
                response: item.response !== null && item.response !== undefined ? String(item.response) : ""
              };
            })
        };
      })
    };
  }
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
            response: item.response !== null && item.response !== undefined ? String(item.response) : ""
          };
        })
    };
  }
  else {
    standardized = formData;
  }
  
  return standardized;
}

function processFormResponses() {
  try {
    const result = processBatchedResponses();
    
    if (result.success) {
      setLastProcessedTimestamp(new Date().toISOString());
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

function processBatchedResponses() {
  try {
    const form = FormApp.getActiveForm();
    const allResponses = form.getResponses();
    
    if (allResponses.length === 0) {
      return { 
        success: true, 
        message: "No responses found in form",
        processed: 0,
        total: 0
      };
    }
    
    const batchData = allResponses.map(response => 
      FormHandler.extractResponseData(response)
    );
    
    const batchStructure = {
      formId: form.getId(),
      formTitle: form.getTitle(),
      responseCount: batchData.length,
      responses: batchData
    };
    
    const standardizedBatch = standardizeDataForCsvCompatibility(batchStructure);
    const batchHash = Hashing.hashStandardizedData(standardizedBatch);
    
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

function testApiConnection() {
  try {
    const result = ApiClient.testApiConnection();
    return result;
  } catch (error) {
    console.error('Error testing API connection:', error);
    return {
      success: false,
      error: 'Failed to test API connection: ' + error.toString()
    };
  }
}

function getProcessingStatus() {
  try {
    const form = FormApp.getActiveForm();
    const allResponses = form.getResponses();
    const config = getBatchConfig();
    const lastProcessed = getLastProcessedTimestamp();
    
    let nextScheduled = null;
    
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
      hasaccessToken: !!getaccessToken()
    };
  } catch (error) {
    console.error('Error getting processing status:', error);
    return { error: error.toString() };
  }
}

var FormHandler = (function() {
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
        
        switch(itemType) {
          case 'CHECKBOX':
            responseValue = responseValue.slice().sort();
            break;
          case 'GRID':
          case 'CHECKBOX_GRID':
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

var Hashing = (function() {
  function hashResponseData(responseData) {
    const standardized = standardizeDataForCsvCompatibility(responseData);
    return createDeterministicHash(standardized);
  }
  
  function hashBatchData(batchData) {
    const standardized = standardizeDataForCsvCompatibility(batchData);
    return createDeterministicHash(standardized);
  }
  
  function hashStandardizedData(standardizedData) {
    return createDeterministicHash(standardizedData);
  }
  
  function createDeterministicHash(data) {
    const jsonString = JSON.stringify(data, function(key, value) {
      if (Array.isArray(value)) {
        if (value.every(item => typeof item !== 'object' || item === null)) {
          return [...value].sort();
        }
        
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
      
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        return Object.keys(value).sort().reduce((obj, k) => {
          obj[k] = value[k];
          return obj;
        }, {});
      }
      
      return value;
    });
    
    const bytes = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256, 
      jsonString
    );
    
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