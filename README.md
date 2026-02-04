# Local AI Webpage Analyzer

A browser extension that analyzes webpages and highlights the most important sentences directly on the page using a local Python AI server. No API keys required - everything runs on your machine!

## Features

- **Local Processing**: All analysis happens on your machine using Python
- **Privacy-Focused**: No data sent to external services
- **Smart Highlighting**: Highlights key sentences directly on webpages using advanced NLP algorithms
- **Dual AI Algorithms**: Combines LexRank and Edmundson summarizers for better accuracy
- **Visual Analysis**: Instantly see the most important content on any webpage
- **Clear Highlights**: Remove highlights with one click
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
   
   The extension uses:
   - FastAPI for the server
   - Sumy for text summarization (LexRank and Edmundson algorithms)
   - NLTK for natural language processing

3. **Download NLTK data** (required for text processing)
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

1. **Make sure the Python server is running** (see installation step 4 above)
2. Navigate to any webpage you want to analyze
3. Click the extension icon in your browser toolbar
4. Click **"Analyze & Highlight"** to identify and highlight the most important sentences
5. The extension will:
   - Extract and clean the page content
   - Analyze it using LexRank and Edmundson algorithms
   - Highlight key sentences directly on the page with yellow highlighting
   - Show you a list of the highlighted sentences in the popup
6. Click **"Clear Highlights"** to remove all highlights from the page

### What Gets Highlighted

The extension uses two complementary AI algorithms:
- **LexRank**: Identifies the most representative sentences based on graph-based ranking
- **Edmundson**: Extracts main facts using bonus/stigma/null word analysis

This dual approach ensures both summary-quality sentences and fact-rich content are highlighted.

## Privacy & Security

- **100% Local**: All processing happens on your machine
- **No Cloud Services**: No data sent to external APIs
- **No API Keys**: No registration or API keys required
- **Open Source**: Fully transparent code you can audit

## Technical Details

- **Manifest Version**: 3 (latest Chrome extension standard)
- **Backend**: FastAPI + Sumy library
- **Algorithms**: 
  - LexRank (graph-based summarization)
  - Edmundson (bonus/stigma/null word-based extraction)
- **Content Extraction**: Intelligently filters and processes webpage content
  - Removes navigation, ads, and UI elements
  - Filters image captions and metadata
  - Processes up to 10,000 characters
- **Permissions**: `activeTab`, `scripting`
- **Highlighting**: Injects CSS and uses DOM manipulation to highlight sentences
- **Content Cleaning**: Advanced regex-based text preprocessing

## Files Structure

```
Local-Python-AI-web-extension/
├── manifest.json       # Extension configuration
├── popup.html         # Extension popup UI
├── popup.js          # Popup logic, content extraction, and API calls
├── content.js        # Content script for highlighting text on pages
├── server.py         # FastAPI backend with LexRank & Edmundson summarizers
├── requirements.txt  # Python dependencies
├── icons/            # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md        # This file
```

## How It Works

1. **Content Extraction**: The extension extracts visible text from the current webpage, filtering out navigation, ads, scripts, and other non-content elements
2. **Text Cleaning**: The Python server cleans the text by removing URLs, email addresses, image captions, author bylines, and other metadata
3. **AI Analysis**: Two algorithms analyze the cleaned text:
   - **LexRank** creates a graph of sentence relationships and ranks them by importance
   - **Edmundson** uses linguistic analysis to identify fact-rich sentences
4. **Highlighting**: Key sentences are highlighted directly on the webpage with yellow highlighting
5. **Visual Feedback**: The popup shows which sentences were highlighted and scrolls the page to the first highlight

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

### No Text Gets Highlighted
- The algorithms filter out very short sentences (< 30 characters)
- Pages with minimal content may not have enough text to analyze
- Try a page with more substantial text content (articles, blog posts, etc.)

## Customization

### Adjust Number of Highlighted Sentences

Edit [server.py](server.py#L138-L162) and change the numbers:

```python
# Change number of sentences in summary (default: 2)
summary_sentences = lexrank_summarizer(parser.document, 2)

# Change number of fact sentences (default: 3-5 based on content length)
num_fact_sentences = min(5, max(3, len(cleaned_text) // 600))
fact_sentences = edmundson_summarizer(parser.document, num_fact_sentences)
```

### Use Different Summarization Algorithms

The server currently uses LexRank and Edmundson. The Sumy library supports other algorithms you can try:

- `TextRankSummarizer` (similar to LexRank but uses different graph algorithm)
- `LuhnSummarizer` (frequency-based summarization)
- `KLSummarizer` (Kullback-Leibler divergence)
- `ReductionSummarizer` (removes least important sentences)

Example:

```python
from sumy.summarizers.text_rank import TextRankSummarizer
summarizer = TextRankSummarizer()
```

### Change Highlight Color

Edit [popup.js](popup.js#L335-L341) or [content.js](content.js#L27-L35):

```css
.ai-highlight {
  background-color: #ffeb3b !important;  /* Change to any color */
  /* Examples: #90EE90 (light green), #87CEEB (light blue), #FFB6C1 (light pink) */
}
```

## Development

This extension uses vanilla JavaScript and follows Chrome Extension Manifest V3 specifications. The backend is a FastAPI server using the Sumy NLP library with LexRank and Edmundson algorithms.

### Key Components
- **Content Extraction** ([popup.js](popup.js#L46-L139)): Extracts and filters webpage content
- **AI Analysis** ([server.py](server.py#L115-L175)): Processes text with dual algorithms
- **Highlighting** ([popup.js](popup.js#L319-L438) & [content.js](content.js#L19-L217)): Injects highlights into the DOM

### Making Changes
1. Edit the source files as needed
2. For extension changes: Reload the extension in `chrome://extensions/`
3. For server changes: Restart `python server.py`

### API Endpoints

- `POST /summarize` - Analyzes text and returns key sentences for highlighting
  - Request: `{ "text": "webpage content" }`
  - Response: `{ "summary": "formatted text with summary and main facts" }`
  - Used by the extension to identify which sentences to highlight

## License

MIT License - feel free to use and modify as needed.

## Contributing

Contributions are welcome! Areas for improvement:
- Support for additional languages beyond English
- Better handling of JavaScript-heavy sites
- Options to customize highlighting colors and styles
- Export functionality for highlighted sentences
- Integration with note-taking apps

## Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/)
- Powered by [Sumy](https://github.com/miso-belica/sumy) NLP library (LexRank and Edmundson algorithms)
- Uses [NLTK](https://www.nltk.org/) for tokenization and text processing