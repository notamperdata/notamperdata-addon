/**
 * UI.gs
 * 
 * Handles user interface components for the add-on.
 */

var UI = (function() {
  /**
   * Creates a configuration page for the add-on.
   * 
   * @return {HtmlOutput} HTML content for the configuration page
   */
  function createConfigPage() {
    // Get current form information
    const form = FormApp.getActiveForm();
    const formId = form.getId();
    const formTitle = form.getTitle();
    
    // Check if a trigger is already set up
    const hasTrigger = ScriptApp.getUserTriggers(form)
      .some(function(trigger) {
        return trigger.getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT;
      });
    
    // Create HTML content
    let htmlContent = '<div style="font-family: Arial, sans-serif; padding: 16px;">';
    htmlContent += '<h2>AdaForms Verification Setup</h2>';
    htmlContent += '<p>This add-on will hash your form responses and send them to the AdaForms verification system.</p>';
    
    // Form information
    htmlContent += '<div style="margin: 16px 0; padding: 12px; background-color: #f5f5f5; border-radius: 4px;">';
    htmlContent += '<p><strong>Form:</strong> ' + formTitle + '</p>';
    htmlContent += '<p><strong>Form ID:</strong> ' + formId + '</p>';
    htmlContent += '</div>';
    
    // Trigger status
    htmlContent += '<div style="margin: 16px 0;">';
    if (hasTrigger) {
      htmlContent += '<p style="color: green;">✅ Automatic verification is enabled for this form.</p>';
    } else {
      htmlContent += '<p style="color: red;">❌ Automatic verification is not enabled.</p>';
      htmlContent += '<button onclick="google.script.run.withSuccessHandler(updateStatus).createFormSubmitTrigger()">Enable Automatic Verification</button>';
    }
    htmlContent += '</div>';
    
    // API Settings section (simplified for demo)
    htmlContent += '<div style="margin: 16px 0;">';
    htmlContent += '<h3>API Settings</h3>';
    htmlContent += '<p>For the demo, the API endpoint is hardcoded in the ApiService.gs file.</p>';
    htmlContent += '<p>In a production version, this would be configurable.</p>';
    htmlContent += '</div>';
    
    // Add JavaScript for status updates
    htmlContent += '<script>';
    htmlContent += 'function updateStatus(success) {';
    htmlContent += '  if (success) {';
    htmlContent += '    window.location.reload();';
    htmlContent += '  }';
    htmlContent += '}';
    htmlContent += '</script>';
    
    htmlContent += '</div>';
    
    return HtmlService.createHtmlOutput(htmlContent)
      .setTitle('AdaForms Configuration')
      .setWidth(400)
      .setHeight(500);
  }
  
  /**
   * Displays a configuration sidebar in the form editor.
   */
  function showConfigSidebar() {
    const ui = FormApp.getUi();
    ui.showSidebar(createConfigPage());
  }
  
  // Public API
  return {
    showConfigSidebar: showConfigSidebar
  };
})();

/**
 * Shows the configuration sidebar when called from the menu.
 */
function showConfigPage() {
  UI.showConfigSidebar();
}