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
      .addItem('Configure AdaForms', 'showSidebar')
      .addToUi();
  }
  
  /**
   * Shows a sidebar with configuration options.
   */
  function showSidebar() {
    const ui = HtmlService.createHtmlOutputFromFile('Sidebar')
      .setTitle('AdaForms Configuration');
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
        .setText("AdaForms helps you verify the integrity of form responses."));
    
    const setupButton = CardService.newTextButton()
      .setText("Setup Response Verification")
      .setOnClickAction(CardService.newAction().setFunctionName("showConfigurationCard"));
    
    section.addWidget(setupButton);
    builder.addSection(section);
    
    return builder.build();
  }
  
  /**
   * Shows configuration card.
   */
  function showConfigurationCard() {
    // Implementation details for configuration UI
    // This would include API endpoint configuration, etc.
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
      
      // Send hash to API
      ApiClient.sendHashToApi(hash, metadata);
      
      // Log for verification
      console.log(`Response processed: ${metadata.responseId}`);
    } catch (error) {
      console.error(`Error processing submission: ${error.toString()}`);
    }
  }



  /**
 * Saves user configuration to script properties.
 */
function saveConfiguration(apiEndpoint, apiKey) {
    const properties = PropertiesService.getUserProperties();
    properties.setProperty('API_ENDPOINT', apiEndpoint);
    properties.setProperty('API_KEY', apiKey);
    return true;
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