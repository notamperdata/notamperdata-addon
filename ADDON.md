# NoTamperData Google Forms Add-on

## Overview

The NoTamperData Google Forms Add-on generates cryptographic hashes of form responses and stores them on the Cardano blockchain for verification. Only hash values (not actual form data) leave Google's secure environment.

## Features

- **Privacy-Preserving**: Only SHA-256 hashes transmitted, never form data
- **Batch automatic options**: Prosess responses daily, weekly, or after N hours
- **Manual Processing**: Process responses on-demand
- **Simple Interface**: Clean sidebar UI for easy operation
- **Blockchain Verification**: Immutable proof of response integrity

## Installation

### From Google Workspace Marketplace
1. Open your Google Form
2. Click **Add-ons** → **Get add-ons**
3. Search for "NoTamperData" and install

### Test Mode Installation
1. Create a new Google Form
2. Click **Options** → **Apps Script**
3. Copy the add-on code files into the Apps Script editor
4. Save the project
5. Return to your Google Form
6. Click **Add-ons** → **NoTamperData** → **Install**
7. Open the add-on to run the script

## Usage

1. **Open the Add-on**
   - Click **Add-ons** → **NoTamperData** → **Open**

2. **Process Responses**
   - Click the "Process Responses" button to hash existing responses
   - Submit new responses and process them manually as needed

3. **Verify Responses**
   - Export your form responses as CSV from Google Forms
   - Upload the CSV file to the NoTamperData platform for verification

## How It Works

1. **Form Submission**: User submits response to Google Form
2. **Manual Processing**: Form owner clicks "Process Responses" 
3. **Hash Generation**: SHA-256 hash created from response data
4. **Blockchain Storage**: Hash stored on Cardano blockchain via API
5. **Verification**: Export CSV from Google Forms and upload to NoTamperData platform for verification

## File Structure

```
├── Code.js              # Main logic and hash generation
├── ApiClient.js         # Blockchain API communication  
├── Sidebar.html         # User interface
└── appsscript.json      # Configuration
```

## API Integration

**Store Hash Request**:
```javascript
POST /api/storehash
{
  "hash": "sha256_hash_string",
  "metadata": {
    "formId": "google_form_id",
    "timestamp": "2024-01-15T12:34:56.000Z"
  }
}
```

## Privacy & Security

- **No Data Storage**: Add-on never stores actual form responses
- **Hash-Only Transmission**: Only cryptographic hashes leave Google
- **Minimal Permissions**: Only necessary OAuth scopes requested
- **Secure Communication**: All API calls use HTTPS encryption

## Troubleshooting

**Hash Generation Issues**
- Verify form has responses to process
- Check Apps Script execution logs

**API Communication Failures**  
- Verify network connectivity
- Check API endpoint configuration

## Support

- **Source Code**: https://github.com/NoTamperData/NoTamperData-addon
- **Issues**: https://github.com/NoTamperData/NoTamperData-addon/issues