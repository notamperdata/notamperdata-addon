# AdaForms Google Forms Add-on

This add-on provides blockchain-based verification for Google Forms responses by hashing response data and storing it in the AdaForms verification system.

## Features

- Automatic hashing of form responses
- Secure transmission of hashes to the AdaForms API
- Privacy-preserving design (only hashes, not actual form data, are sent)
- Configurable automatic verification

## Development Setup

### Prerequisites

1. [Node.js](https://nodejs.org/) (for clasp CLI)
2. [Google clasp CLI](https://developers.google.com/apps-script/guides/clasp)
3. Google account with access to Google Forms

### Setting Up the Development Environment

1. Install clasp globally:

```bash
npm install -g @google/clasp
```

2. Login to Google:

```bash
clasp login
```

3. Create a new Google Apps Script project:

```bash
clasp create --title "AdaForms Add-on" --type forms-addon
```

4. Clone this repository or create the files as shown in the project structure.

5. Update the `.clasp.json` file with your script ID (created in step 3).

6. Push the code to Google Apps Script:

```bash
clasp push
```

### Configuration

Before deploying, update the API endpoint in `ApiService.gs`:

```javascript
const API_BASE_URL = 'https://your-actual-api-domain.com/api';
```

## Deployment

### Testing in Development Mode

1. Open the script editor:

```bash
clasp open
```

2. Test the add-on using the "Test as add-on" feature in the Apps Script editor.

### Publishing to Google Workspace Marketplace

For a production deployment, follow these steps:

1. Create a deployment:

```bash
clasp deploy --description "Initial deployment"
```

2. Configure OAuth consent screen in the Google Cloud Console.

3. Submit the add-on for review through the Google Workspace Marketplace SDK.

## Usage

1. Install the add-on in Google Forms.
2. Open a form and access the add-on from the Add-ons menu.
3. Click "Enable Automatic Verification" to set up automatic hashing of responses.
4. Form responses will now be automatically hashed and sent to the AdaForms API.

## Project Structure

- `Code.gs`: Main entry point for the add-on
- `FormHandler.gs`: Logic for processing form responses
- `HashService.gs`: Implementation of hashing functionality
- `ApiService.gs`: API communication with the backend
- `UI.gs`: User interface components

## How It Works

1. When a form submission occurs, the `onFormSubmit` trigger activates.
2. The form response is processed and standardized by `FormHandler`.
3. The standardized data is hashed using `HashService`.
4. The hash and metadata are sent to the AdaForms API via `ApiService`.
5. The API stores the hash for future verification.

## Security Considerations

- Only cryptographic hashes of form responses are sent to the external API, not the actual response data
- Communication with the API is done over HTTPS
- The add-on requires minimal permissions to function

## License

[MIT License](LICENSE)