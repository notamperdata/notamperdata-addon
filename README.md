# Adaverc Google Forms Add-on

## Overview

Adaverc provides blockchain-based verification for Google Forms responses by generating cryptographic hashes of form submissions and storing them for future verification. This ensures data integrity without compromising privacy - only hashes are stored, never the actual form data.

## Features

- **Privacy-Preserving**: Only SHA-256 hashes leave Google's ecosystem
- **Automatic Processing**: Enable once, verify always
- **Simple Interface**: Clean, intuitive sidebar UI
- **Instant Verification**: Test with existing responses immediately

## Installation

### For Users
1. Open your Google Form
2. Click Add-ons → Get add-ons
3. Search for "Adaverc"
4. Click Install and follow the authorization prompts

### For Developers

1. Install Google Apps Script CLI:
```bash
npm install -g @google/clasp
```

2. Login to Google:
```bash
clasp login
```

3. Clone and push the code:
```bash
clasp clone --scriptId [YOUR_SCRIPT_ID]
# Copy the add-on files to your local directory
clasp push
```

## Usage

1. Open your Google Form
2. Click Add-ons → Adaverc → Open
3. Click "Enable Automatic Verification"
4. Submit a test response to verify the system is working

## File Structure

```
├── Code.js           # Main entry point and core functions
├── FormHandler.js    # Form response processing logic
├── Hashing.js        # SHA-256 hash generation
├── ApiClient.js      # API communication layer
├── Sidebar.html      # User interface
├── appsscript.json   # Add-on configuration
└── README.md         # This file
```

## API Endpoints

The add-on communicates with the following endpoints:

- `POST /api/storehash` - Store hash and metadata
- `GET /api/health` - Check API availability (optional)

## Privacy & Security

- **No Data Storage**: The add-on never stores form response data
- **Hashing Only**: Uses SHA-256 to create one-way hashes
- **Minimal Permissions**: Only requests necessary OAuth scopes
- **Open Source**: All code is transparent and auditable

## Testing

1. Create a test form with various question types
2. Install the add-on
3. Submit test responses
4. Use the "Test With Latest Response" button to verify

## Deployment Checklist

Before submitting to Google Workspace Marketplace:

- [ ] Update API endpoint in `Code.js` to production URL
- [ ] Ensure privacy policy is accessible at `https://adaverc.com/privacy`
- [ ] Ensure terms of service is accessible at `https://adaverc.com/terms`
- [ ] Test all functionality with production API
- [ ] Create app listing assets (screenshots, descriptions)
- [ ] Complete OAuth consent screen configuration

## Support

- Documentation: https://adaverc.com/docs
- Support: https://adaverc.com/support
- Issues: https://github.com/adaverc/forms-addon/issues

## License

MIT License - See LICENSE file for details