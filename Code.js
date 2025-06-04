// API endpoint - Update this to match your deployment
// For testing: "http://localhost:3002/api"
// For production: "https://adaverc.com/api"
const API_ENDPOINT = "http://localhost:3002/api";

// Add-on metadata
const ADDON_NAME = "Adaverc";
const ADDON_VERSION = "1.0.0";

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
    .setWidth(300);
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
        ensuring data integrity through cryptographic hashing.
      </p>
      <p style="margin-bottom: 15px;">
        <strong>How it works:</strong><br>
        • Form responses are hashed using SHA-256<br>
        • Only hashes are sent to our servers<br>
        • Your actual form data never leaves Google<br>
        • Hashes can be verified at any time
      </p>
      <p style="margin-bottom: 20px;">
        <a href="https://adaverc.com/privacy" target="_blank">Privacy Policy</a> | 
        <a href="https://adaverc.com/terms" target="_blank">Terms of Service</a> | 
        <a href="https://adaverc.com/support" target="_blank">Support</a>
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
    return {
      title: form.getTitle(),
      id: form.getId(),
      description: form.getDescription() || 'No description',
      isAcceptingResponses: form.isAcceptingResponses()
    };
  } catch (error) {
    console.error('Error getting form info:', error);
    return {
      error: 'Unable to access form information'
    };
  }
}

/**
 * Creates a form submit trigger.
 * @return {Object} Result object
 */
function createFormTrigger() {
  try {
    // Remove any existing triggers first
    removeTrigger();
    
    // Create new trigger
    ScriptApp.newTrigger('onFormSubmit')
      .forForm(FormApp.getActiveForm())
      .onFormSubmit()
      .create();
    
    console.log('Form submit trigger created successfully');
    return { success: true };
  } catch (error) {
    console.error('Error creating trigger:', error);
    return { 
      success: false, 
      error: 'Unable to enable automatic recording. Please check your permissions.' 
    };
  }
}

/**
 * Removes form submit trigger.
 * @return {boolean} Whether a trigger was removed
 */
function removeTrigger() {
  try {
    const triggers = ScriptApp.getUserTriggers(FormApp.getActiveForm());
    let removed = false;
    
    triggers.forEach(function(trigger) {
      if (trigger.getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT) {
        ScriptApp.deleteTrigger(trigger);
        removed = true;
      }
    });
    
    return removed;
  } catch (error) {
    console.error('Error removing trigger:', error);
    return false;
  }
}

/**
 * Checks if trigger is enabled.
 * @return {boolean} Whether trigger is enabled
 */
function isTriggerEnabled() {
  try {
    const triggers = ScriptApp.getUserTriggers(FormApp.getActiveForm());
    return triggers.some(function(trigger) {
      return trigger.getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT;
    });
  } catch (error) {
    console.error('Error checking triggers:', error);
    return false;
  }
}

/**
 * Handles form submission.
 * @param {Object} e - The form submit event
 */
function onFormSubmit(e) {
  try {
    console.log("Processing form submission");
    
    const formResponse = e.response;
    const responseData = FormHandler.extractResponseData(formResponse);
    const hash = Hashing.hashResponseData(responseData);
    
    const metadata = {
      formId: formResponse.getFormId(),
      responseId: formResponse.getId(),
      timestamp: new Date().toISOString()
    };
    
    console.log(`Generated hash: ${hash} for response ID: ${metadata.responseId}`);
    
    // Send hash to API
    const result = ApiClient.sendHashToApi(hash, metadata);
    
    if (result.error) {
      console.error(`API error: ${JSON.stringify(result)}`);
      // Don't throw error - we don't want to break form submission
      return { success: false, error: result.error };
    }
    
    console.log(`Response processed successfully: ${metadata.responseId}`);
    return { success: true, hash: hash };
  } catch (error) {
    // Log error but don't break form submission
    console.error(`Error processing submission: ${error.toString()}`);
    return { success: false, error: error.toString() };
  }
}

/**
 * Processes the latest response for testing.
 * @return {Object} Processing result
 */
function processLatestResponse() {
  try {
    const form = FormApp.getActiveForm();
    const formResponses = form.getResponses();
    
    if (formResponses.length === 0) {
      return { 
        success: false,
        error: "No responses found. Submit a test response first." 
      };
    }
    
    // Get the most recent response
    const latestResponse = formResponses[formResponses.length - 1];
    
    console.log(`Processing latest response (ID: ${latestResponse.getId()})`);
    
    const responseData = FormHandler.extractResponseData(latestResponse);
    const hash = Hashing.hashResponseData(responseData);
    const metadata = {
      formId: form.getId(),
      responseId: latestResponse.getId(),
      timestamp: latestResponse.getTimestamp().toISOString()
    };
    
    // Send hash to API
    const result = ApiClient.sendHashToApi(hash, metadata);
    
    if (result.error) {
      console.error(`API error: ${JSON.stringify(result)}`);
      return { 
        success: false, 
        error: result.error 
      };
    }
    
    return {
      success: true,
      hash: hash,
      responseId: metadata.responseId
    };
  } catch (error) {
    console.error(`Error processing response: ${error.toString()}`);
    return {
      success: false,
      error: 'Unable to process response. Please try again.'
    };
  }
}