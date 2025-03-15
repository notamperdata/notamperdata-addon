/**
 * AdaForms Google Forms Add-on
 * 
 * This add-on hashes form responses and sends them to the AdaForms API for verification
 * and eventual blockchain storage.
 */

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
      .addItem('Open AdaForms', 'showSidebar')
      .addToUi();
}

/**
 * Opens the add-on sidebar.
 */
function showSidebar() {
  const ui = HtmlService.createHtmlOutput('<h3>AdaForms</h3><p>Your form responses will be automatically hashed and sent to the AdaForms API for verification.</p>')
      .setTitle('AdaForms')
      .setWidth(300);
  FormApp.getUi().showSidebar(ui);
}

/**
 * Handles form submit trigger.
 * This is the main function that processes form submissions.
 */
function onFormSubmit(e) {
  try {
    // Get form and response information
    const form = FormApp.getActiveForm();
    const formId = form.getId();
    const formTitle = form.getTitle();
    
    // Process the submitted response
    const formResponse = e.response;
    const responseId = formResponse.getId();
    const timestamp = formResponse.getTimestamp();
    
    // Get response data for hashing
    const responseData = FormHandler.getResponseData(formResponse);
    
    // Generate hash of the response data
    const hash = HashService.hashObject(responseData);
    
    // Prepare metadata
    const metadata = {
      formId: formId,
      responseId: responseId,
      timestamp: timestamp.toISOString(),
      formTitle: formTitle
    };
    
    // Send to API
    const result = ApiService.sendHash(hash, metadata);
    
    // Log result
    console.log('Hash sent to API. Result:', JSON.stringify(result));
    
    return result;
  } catch (error) {
    console.error('Error in onFormSubmit:', error);
    return { error: error.toString() };
  }
}

/**
 * Callback for rendering the homepage card.
 * @return {CardService.Card} The card to show to the user.
 */
function onHomepage() {
  // Simple UI for the homepage
  const form = FormApp.getActiveForm();
  const formId = form.getId();
  const formTitle = form.getTitle();
  
  // Check if the trigger is already installed
  const triggerExists = ScriptApp.getUserTriggers(form).some(function(trigger) {
    return trigger.getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT;
  });
  
  let statusText = triggerExists ? 
    "✅ Form responses are being automatically hashed and verified." : 
    "❌ Automatic verification is not enabled for this form.";
  
  // Build a simple HTML UI
  const html = '<h3>AdaForms Verification</h3>' +
               '<p><b>Form:</b> ' + formTitle + '</p>' +
               '<p><b>Form ID:</b> ' + formId + '</p>' +
               '<p><b>Status:</b> ' + statusText + '</p>' +
               (!triggerExists ? '<button onclick="google.script.run.createFormSubmitTrigger()">Enable Automatic Verification</button>' : '') +
               '<hr>' +
               '<p><small>AdaForms secures your form responses on the blockchain for verification.</small></p>';
               
  return HtmlService.createHtmlOutput(html)
    .setTitle('AdaForms');
}

/**
 * Creates a form submit trigger programmatically.
 */
function createFormSubmitTrigger() {
  const form = FormApp.getActiveForm();
  
  // Check if the trigger already exists
  const triggers = ScriptApp.getUserTriggers(form);
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT) {
      return; // Trigger already exists
    }
  }
  
  // Create the trigger
  ScriptApp.newTrigger('onFormSubmit')
    .forForm(form)
    .onFormSubmit()
    .create();
    
  return true;
}