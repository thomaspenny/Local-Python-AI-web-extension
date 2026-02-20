# Local AI Webpage Analyzer

A browser extension that analyzes webpages using advanced NLP for text summarization and named entity recognition (NER). 

**Features:**
- Highlight important sentences directly on webpages
- Automatically categorize and highlight named entities (people, organizations, locations, events, properties, vehicles)
- No API keys required - everything runs locally on your machine

All analysis happens on your machine using Python. No data is sent to external services.

## Features

- **Local Processing**: All analysis happens on your machine using Python
- **Privacy-Focused**: No data sent to external services  
- **Smart Highlighting**: Highlights key sentences using LexRank and Edmundson algorithms
- **Entity Categorization** ⭐ NEW: Automatically categorize and highlight entities:
  - **Person** (Red #FF6B6B)
  - **Organization** (Teal #4ECDC4)
  - **Address/Location** (Yellow #FFE66D)
  - **Event** (Mint #95E1D3)
  - **Property** (Lavender #C7CEEA)
  - **Vehicle** (Peach #FFDAC1)
- **Automatic NER**: Uses NLTK's Named Entity Recognition for automatic entity detection - no manual word lists needed
- **Visual Analysis**: Color-coded highlighting with legend
- **Clear Highlights**: Remove all highlights with one click
- **No API Keys**: No cloud services or API costs

## Installation

### Prerequisites
- A modern web browser (Chrome, Edge, or any Chromium-based browser)
- Python 3.8 or higher (Python 3.14 tested and working)

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
   - NLTK for natural language processing and Named Entity Recognition

3. **Download required NLTK data**
   ```bash
   python -c "import nltk; nltk.download('punkt_tab'); nltk.download('averaged_perceptron_tagger'); nltk.download('maxent_ne_chunker'); nltk.download('words')"
   ```
   These NLTK models provide tokenization and Named Entity Recognition capabilities required for entity categorization.

4. **Start the Python server**
   ```bash
   python run_server.py
   ```
   Keep this terminal window open while using the extension. The server will run at http://127.0.0.1:8000

5. **Load the extension in your browser**
   - Open your browser and navigate to:
     - Chrome: `chrome://extensions/`
     - Edge: `edge://extensions/`
   - Enable "Developer mode" (toggle in the top right)
   - Click "Load unpacked"
   - Select this folder

## Usage

### Highlighting Important Sentences

1. Make sure the Python server is running
2. Navigate to any webpage you want to analyze
3. Click the extension icon in your browser toolbar
4. Click **"Highlight Main Points"** to identify and highlight important sentences
5. The extension will:
   - Extract and clean the page content
   - Analyze it using LexRank and Edmundson algorithms
   - Highlight key sentences in yellow
   - Show you a list of the highlighted sentences in the popup

### Categorizing Entities

1. Make sure the Python server is running
2. Navigate to any webpage with text content
3. Click the extension icon in your browser toolbar
4. Click **"Categorize Entities"** to extract and highlight entities by category
5. The extension will:
   - Extract page content
   - Use spaCy NER to automatically identify and categorize entities
   - Highlight each entity with color-coding based on its category
   - Display a legend showing which color represents which category
   - Show statistics on found entities

6. Hover over highlighted entities to see their category
7. Click **"Clear Highlights"** to remove all highlights from the page

### Entity Categories & Colors

- **Person** (Red #FF6B6B): Names of people and individuals
- **Organization** (Teal #4ECDC4): Companies, institutions, and groups
- **Address/Location** (Yellow #FFE66D): Geographic locations, cities, countries
- **Event** (Mint #95E1D3): Events, holidays, conferences
- **Property** (Lavender #C7CEEA): Facilities and property
- **Vehicle** (Peach #FFDAC1): Vehicles and transportation

## How It Works

### Text Summarization
The extension uses two complementary AI algorithms:
- **LexRank**: Graph-based ranking to identify representative sentences
- **Edmundson**: Extracts important facts using linguistic analysis

### Entity Recognition & Categorization
The extension uses **NLTK's Named Entity Recognition (NER)** to automatically identify and categorize entities without manual word lists. The system recognizes:
- Named entities (PERSON, ORGANIZATION, LOCATION, etc.)
- Geopolitical entities
- Facilities and products
- Events and dates

This approach is:
- **Automatic**: No need to maintain word lists or update categorization rules
- **Accurate**: Trained on large corpora of English text
- **Fast**: Processes text in milliseconds
- **Contextual**: Understanding entity types based on linguistic features

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