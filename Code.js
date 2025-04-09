// HARDCODED API ENDPOINT - Change this to match your API server
const API_ENDPOINT = "https://adaforms-demo-api.vercel.app/api";

/**
 * Runs when the add-on is installed.
 */
function onInstall(e) {
  onOpen(e);
}

/**
 * Runs when the document is opened.
 */
function onOpen(e) {
  FormApp.getUi()
    .createAddonMenu()
    .addItem('AdaForms Demo', 'showSidebar')
    .addToUi();
}

/**
 * Shows a sidebar with configuration options.
 */
function showSidebar() {
  const ui = HtmlService.createHtmlOutputFromFile('SimpleSidebar')
    .setTitle('AdaForms Demo');
  FormApp.getUi().showSidebar(ui);
}

/**
 * Get information about the current form.
 */
function getFormInfo() {
  const form = FormApp.getActiveForm();
  return {
    title: form.getTitle(),
    id: form.getId()
  };
}

/**
 * Creates a form submit trigger.
 */
function createFormTrigger() {
  // Delete existing triggers
  const triggers = ScriptApp.getUserTriggers(FormApp.getActiveForm());
  triggers.forEach(function(trigger) {
    if (trigger.getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new trigger
  ScriptApp.newTrigger('onFormSubmit')
    .forForm(FormApp.getActiveForm())
    .onFormSubmit()
    .create();
  
  return true;
}

/**
 * Removes form submit trigger
 */
function removeTrigger() {
  const triggers = ScriptApp.getUserTriggers(FormApp.getActiveForm());
  let removed = false;
  
  triggers.forEach(function(trigger) {
    if (trigger.getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT) {
      ScriptApp.deleteTrigger(trigger);
      removed = true;
    }
  });
  
  return removed;
}

/**
 * Checks if trigger is enabled
 */
function isTriggerEnabled() {
  const triggers = ScriptApp.getUserTriggers(FormApp.getActiveForm());
  return triggers.some(function(trigger) {
    return trigger.getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT;
  });
}

/**
 * Handles form submission with simplified error handling
 */
function onFormSubmit(e) {
  try {
    // Log the start of processing
    console.log("Processing form submission");
    
    const formResponse = e.response;
    const responseData = FormHandler.extractResponseData(formResponse);
    const hash = Hashing.hashResponseData(responseData);
    
    const metadata = {
      formId: formResponse.getFormId(),
      responseId: formResponse.getId(),
      timestamp: new Date().toISOString()
    };
    
    // Log key information
    console.log(`Generated hash: ${hash} for response ID: ${metadata.responseId}`);
    
    // Send hash to API
    const result = ApiClient.sendHashToApi(hash, metadata);
    
    if (result.error) {
      console.error(`API error: ${JSON.stringify(result)}`);
      return { success: false, error: result.error };
    }
    
    console.log(`Response processed successfully: ${metadata.responseId}`);
    return { success: true, hash: hash, apiResult: result };
  } catch (error) {
    const errorMsg = `Error processing submission: ${error.toString()}`;
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Processes the latest response for testing.
 */
function processLatestResponse() {
  const form = FormApp.getActiveForm();
  const formResponses = form.getResponses();
  
  if (formResponses.length === 0) {
    return { error: "No responses found for this form." };
  }
  
  // Get the most recent response
  const latestResponse = formResponses[formResponses.length - 1];
  
  try {
    console.log(`Processing latest response (ID: ${latestResponse.getId()})`);
    
    const responseData = FormHandler.extractResponseData(latestResponse);
    const hash = Hashing.hashResponseData(responseData);
    const metadata = {
      formId: latestResponse.getFormId(),
      responseId: latestResponse.getId(),
      timestamp: latestResponse.getTimestamp().toISOString()
    };
    
    // Send hash to API
    const result = ApiClient.sendHashToApi(hash, metadata);
    
    if (result.error) {
      console.error(`API error: ${JSON.stringify(result)}`);
      return { success: false, error: result.error };
    }
    
    return {
      success: true,
      hash: hash,
      responseId: metadata.responseId,
      apiResult: result
    };
  } catch (error) {
    const errorMsg = `Error processing response: ${error.toString()}`;
    console.error(errorMsg);
    return {
      success: false,
      error: errorMsg
    };
  }
}