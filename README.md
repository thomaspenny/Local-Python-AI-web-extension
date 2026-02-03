# pyAI Local Webpage Analyzer

A browser extension that analyzes and summarizes webpages using a local Python AI server. No API keys required - everything runs on your machine!

## Features

- **Local Processing**: All analysis happens on your machine using Python
- **Privacy-Focused**: No data sent to external services
- **Smart Summarization**: Uses LSA (Latent Semantic Analysis) for accurate summaries
- **Question Answering**: Ask questions about webpage content
- **Fast & Lightweight**: Minimal performance impact on browsing
- **No API Keys**: No cloud services or API costs

## Installation

### Prerequisites
- A modern web browser (Chrome, Edge, or any Chromium-based browser)
- Python 3.8 or higher

### Steps

1. **Clone or download this repository**
   ```bash
   git clone https://github.com/yourusername/Local-Python-AI-web-extension.git
   cd Local-Python-AI-web-extension
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Download NLTK data**
   ```bash
   python -c "import nltk; nltk.download('punkt_tab')"
   ```

4. **Start the Python server**
   ```bash
   python server.py
   ```
   Keep this terminal window open while using the extension.

5. **Load the extension in your browser**
   - Open your browser and navigate to:
     - Chrome: `chrome://extensions/`
     - Edge: `edge://extensions/`
   - Enable "Developer mode" (toggle in the top right)
   - Click "Load unpacked"
   - Select this folder

## Usage

1. **Make sure the Python server is running** (see step 4 above)
2. Navigate to any webpage you want to analyze
3. Click the pyAI extension icon in your browser toolbar
4. Either:
   - Click **"Summarize"** for a quick 3-sentence summary
   - Type a question and click **"Ask Question"**

### Example Questions

- "What is this webpage about?"
- "Can you summarize the main points?"
- "What are the key takeaways from this article?"
- "Is there any pricing information on this page?"
- "What products or services are mentioned?"

## Privacy & Security

- **100% Local**: All processing happens on your machine
- **No Cloud Services**: No data sent to external APIs
- **No API Keys**: No registration or API keys required
- **Open Source**: Fully transparent code you can audit

## Technical Details

- **Manifest Version**: 3 (latest Chrome extension standard)
- **Backend**: FastAPI + Sumy library
- **Algorithm**: LSA (Latent Semantic Analysis)
- **Content Extraction**: Processes up to 10,000 characters of visible text
- **Permissions**: `activeTab`, `scripting`

## Files Structure

```
Local-Python-AI-web-extension/
├── manifest.json       # Extension configuration
├── popup.html         # Extension popup UI
├── popup.js          # Popup logic and API calls
├── server.py         # FastAPI backend server
├── requirements.txt  # Python dependencies
├── generate_icons.py # Icon generator script
├── icons/            # Extension icons (pyAI branding)
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── SETUP.md         # Detailed setup guide
└── README.md        # This file
```

## Troubleshooting

### "Cannot connect to local server"
- Make sure the Python server is running (`python server.py`)
- Verify it's running on `http://127.0.0.1:8000`
- Check for firewall blocking the connection

### Import Errors
- Run: `pip install -r requirements.txt`
- Run: `python -c "import nltk; nltk.download('punkt_tab')"`

### "Could not extract page content"
- Try refreshing the page
- Some pages may block content extraction
- JavaScript-heavy sites may require a few seconds to load

## Customization

### Adjust Summary Length

Edit [server.py](server.py) and change the number in:

```python
summary = summarizer(parser.document, 3)  # Change 3 to desired sentence count
```

### Use a Different Summarizer

The Sumy library supports multiple algorithms. Replace `LsaSummarizer` with:

- `LexRankSummarizer`
- `TextRankSummarizer`
- `LuhnSummarizer`
- `EdmundsonSummarizer`

Example:

```python
from sumy.summarizers.text_rank import TextRankSummarizer
summarizer = TextRankSummarizer()
```

### Advanced: Integrate a Language Model

For better question-answering, you could integrate a local LLM:

- **llama.cpp** with Python bindings
- **GPT4All**
- **Ollama** (with API calls)
- **Transformers** library with models like BERT or T5

## Development

This extension uses vanilla JavaScript and follows Chrome Extension Manifest V3 specifications. The backend is a FastAPI server with the Sumy NLP library.

### Making Changes
1. Edit the source files as needed
2. Restart the Python server if you modified `server.py`
3. Reload the extension in `chrome://extensions/`
4. Test your changes

### API Endpoints

- `POST /summarize` - Returns a 3-sentence summary
  - Request: `{ "text": "webpage content" }`
  - Response: `{ "summary": "summarized text" }`

- `POST /answer` - Returns context-based answer
  - Request: `{ "text": "webpage content", "question": "user question" }`
  - Response: `{ "answer": "response text" }`

## License

MIT License - feel free to use and modify as needed.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/)
- Powered by [Sumy](https://github.com/miso-belica/sumy) NLP library