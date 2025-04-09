// HARDCODED API ENDPOINT - REPLACE WITH YOUR ACTUAL ENDPOINT
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
  const ui = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('AdaForms Demo');
  FormApp.getUi().showSidebar(ui);
}

/**
 * Handler for form homepage.
 */
function onFormsHomepage(e) {
  return createHomepageCard();
}

/**
 * Creates card for add-on homepage.
 */
function createHomepageCard() {
  const builder = CardService.newCardBuilder();
  
  const section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph()
      .setText("AdaForms helps you verify the integrity of form responses using blockchain technology."));
  
  const setupButton = CardService.newTextButton()
    .setText("Open AdaForms")
    .setOnClickAction(CardService.newAction().setFunctionName("openAdaFormsSidebar"));
  
  section.addWidget(setupButton);
  builder.addSection(section);
  
  return builder.build();
}

/**
 * Opens the sidebar
 */
function openAdaFormsSidebar() {
  return CardService.newActionResponseBuilder()
    .setOpenByName("Sidebar")
    .build();
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
 * Handles form submission trigger.
 */
function onFormSubmit(e) {
  try {
    const formResponse = e.response;
    const responseData = FormHandler.extractResponseData(formResponse);
    const hash = Hashing.hashResponseData(responseData);
    
    const metadata = {
      formId: formResponse.getFormId(),
      responseId: formResponse.getId(),
      timestamp: new Date().toISOString()
    };
    
    // Log key information for troubleshooting
    console.log(`Processing response ${metadata.responseId} with hash: ${hash}`);
    
    // Send hash to API
    const result = ApiClient.sendHashToApi(hash, metadata);
    
    if (result.error) {
      console.error(`API error: ${result.error}`);
      return { success: false, error: result.error };
    }
    
    console.log(`Response processed successfully: ${metadata.responseId}`);
    return { success: true, hash: hash };
  } catch (error) {
    console.error(`Error processing submission: ${error.toString()}`);
    return { success: false, error: error.toString() };
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
    const responseData = FormHandler.extractResponseData(latestResponse);
    const hash = Hashing.hashResponseData(responseData);
    const metadata = {
      formId: latestResponse.getFormId(),
      responseId: latestResponse.getId(),
      timestamp: latestResponse.getTimestamp().toISOString()
    };
    
    // Send hash to API
    const result = ApiClient.sendHashToApi(hash, metadata);
    
    return {
      success: true,
      hash: hash,
      responseId: metadata.responseId,
      apiResult: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}