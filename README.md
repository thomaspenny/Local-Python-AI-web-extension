# Gemini-Extension

A simple browser extension that allows you to ask Google Gemini AI questions about any webpage by analyzing its content.

## Features

- **AI-Powered Analysis**: Uses Google's Gemini AI to understand and answer questions about webpage content
- **Smart Content Extraction**: Automatically extracts and analyzes visible text from any webpage
- **Interactive Interface**: Clean, user-friendly popup interface for asking questions
- **Secure API Key Storage**: Safely stores your Gemini API key locally in the browser
- **Fast & Lightweight**: Minimal performance impact on browsing

## Installation

### Prerequisites
- A modern web browser (Chrome, Edge, or any Chromium-based browser)
- A Google Gemini API key (get one free from [Google AI Studio](https://makersuite.google.com/app/apikey))

### Steps

1. **Clone or download this repository**
   ```bash
   git clone https://github.com/thomaspenny/Gemini-Extension.git
   ```

2. **Load the extension in your browser**
   - Open your browser and navigate to the extensions page:
     - Chrome: `chrome://extensions/`
     - Edge: `edge://extensions/`
   - Enable "Developer mode" (toggle in the top right)
   - Click "Load unpacked"
   - Select the `Gemini-Extension` folder

3. **Get your Gemini API key**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Sign in with your Google account
   - Click "Get API Key" or "Create API Key"
   - Copy the generated API key

4. **Configure the extension**
   - Click the extension icon in your browser toolbar
   - Paste your API key in the "Gemini API Key" field
   - Click "Save API Key"

## Usage

1. Navigate to any webpage you want to analyze
2. Click the Gemini Extension icon in your browser toolbar
3. Type your question in the text area (e.g., "What is the main topic of this page?" or "Can you summarize the key points?")
4. Click "Ask Gemini"
5. Wait for the AI to analyze the page and provide an answer

### Example Questions

- "What is this webpage about?"
- "Can you summarize the main points?"
- "What are the key takeaways from this article?"
- "Is there any pricing information on this page?"
- "What products or services are mentioned?"
- "Can you extract the contact information?"

## Privacy & Security

- Your API key is stored locally in your browser using Chrome's storage API
- Webpage content is sent directly to Google's Gemini API
- No data is stored on external servers (except Google's API)
- The extension only accesses the active tab when you click "Ask Gemini"

## Technical Details

- **Manifest Version**: 3 (latest Chrome extension standard)
- **API**: Google Gemini Pro API
- **Content Extraction**: Processes up to 10,000 characters of visible text
- **Permissions**: `activeTab`, `storage`

## Files Structure

```
Gemini-Extension/
├── manifest.json       # Extension configuration
├── popup.html         # Extension popup UI
├── popup.js          # Popup logic and API calls
├── content.js        # Content script for page analysis
├── background.js     # Background service worker
├── icons/            # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md         # This file
```

## Troubleshooting

### "Please enter and save your Gemini API key first"
- Make sure you've entered your API key and clicked "Save API Key"

### "API request failed"
- Verify your API key is correct
- Check your internet connection
- Ensure you haven't exceeded your API quota

### "Could not extract page content"
- Try refreshing the page
- Some pages may block content extraction
- JavaScript-heavy sites may require a few seconds to load

## Development

This extension is built using vanilla JavaScript and follows Chrome Extension Manifest V3 specifications.

### Making Changes
1. Edit the source files as needed
2. Reload the extension in `chrome://extensions/`
3. Test your changes

## License

MIT License - feel free to use and modify as needed.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- Built with [Google Gemini API](https://ai.google.dev/)