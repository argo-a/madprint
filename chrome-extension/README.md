# Google Drive CORS Bypass Chrome Extension

This Chrome extension solves the CORS (Cross-Origin Resource Sharing) issues when trying to display Google Drive images and PDFs directly in web applications.

## What it does

- Bypasses CORS restrictions for Google Drive files
- Downloads Google Drive images and PDFs directly through the extension
- Converts files to base64 data URLs for inline display
- Works with your existing web application without server deployment

## Installation Instructions

### Method 1: Load as Unpacked Extension (Recommended for Development)

1. **Open Chrome Extensions Page**
   - Open Google Chrome
   - Navigate to `chrome://extensions/`
   - Or go to Chrome menu → More tools → Extensions

2. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

3. **Load the Extension**
   - Click "Load unpacked" button
   - Navigate to and select the `chrome-extension` folder
   - The extension should now appear in your extensions list

4. **Verify Installation**
   - You should see "Google Drive CORS Bypass" in your extensions
   - The extension icon should appear in your Chrome toolbar
   - Badge should show "ON" indicating it's active

### Method 2: Pack and Install (For Distribution)

1. **Pack the Extension**
   - Go to `chrome://extensions/`
   - Click "Pack extension"
   - Select the `chrome-extension` folder as the root directory
   - Click "Pack Extension"

2. **Install the Packed Extension**
   - A `.crx` file will be created
   - Drag and drop the `.crx` file onto the Chrome extensions page
   - Click "Add extension" when prompted

## How to Use

1. **Install the Extension** (follow instructions above)

2. **Open Your Web Application**
   - Navigate to your tracking number matcher web app
   - You should see a green banner indicating the extension is active

3. **Use Normally**
   - Upload your CSV file as usual
   - Search for tracking numbers
   - Google Drive images/PDFs will now load automatically through the extension

## Features

- **Automatic Detection**: Extension automatically detects Google Drive URLs
- **Multiple Format Support**: Handles images (JPEG, PNG, GIF, WebP) and PDFs
- **Fallback Handling**: Graceful error handling with fallback options
- **Status Indicators**: Visual feedback showing when extension is working
- **File Size Display**: Shows downloaded file sizes
- **Download Options**: Provides download links for files

## Troubleshooting

### Extension Not Working
- Make sure the extension is enabled in `chrome://extensions/`
- Check that the badge shows "ON"
- Refresh your web page after installing the extension

### Files Still Not Loading
- Ensure Google Drive files are set to "Anyone with the link can view"
- Check browser console for error messages
- Try opening the Google Drive file directly in a new tab to verify access

### Permission Issues
- The extension requests minimal permissions:
  - `activeTab`: To interact with the current webpage
  - `storage`: To save extension settings
  - `https://drive.google.com/*`: To access Google Drive files

## Technical Details

### File Processing
- Extension intercepts Google Drive URLs from your web page
- Downloads files using Chrome's privileged context (no CORS restrictions)
- Converts files to base64 data URLs
- Returns processed files to your web application

### Security
- Extension only processes Google Drive URLs
- No data is stored or transmitted to external servers
- All processing happens locally in your browser

### Browser Compatibility
- Chrome 88+ (Manifest V3 support required)
- Chromium-based browsers (Edge, Brave, etc.)

## Files Included

- `manifest.json` - Extension configuration
- `background.js` - Service worker for file processing
- `content.js` - Content script for web page communication
- `popup.html/css/js` - Extension popup interface
- `icons/` - Extension icons (16x16, 48x48, 128x128)

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify Google Drive file permissions
3. Ensure extension is properly installed and enabled
4. Try refreshing the web page

## Privacy

This extension:
- Does not collect any personal data
- Does not transmit data to external servers
- Only processes Google Drive URLs when requested
- Stores minimal settings locally in your browser
