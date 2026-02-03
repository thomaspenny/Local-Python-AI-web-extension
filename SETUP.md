# Local Python AI Web Extension

A Chrome/Edge extension that analyzes and summarizes webpages using a local Python AI server powered by the Sumy library.

## Features

- **Summarize**: Automatically generates a 3-sentence summary of any webpage
- **Ask Questions**: Get answers based on webpage content (uses summarization technique)
- **Privacy-Focused**: All processing happens locally on your machine
- **No API Keys**: No cloud services or API keys required

## Setup Instructions

### 1. Install Python Dependencies

First, make sure you have Python 3.8+ installed. Then install the required packages:

```bash
pip install -r requirements.txt
```

After installing, you'll also need to download the NLTK punkt_tab tokenizer data:

```bash
python -c "import nltk; nltk.download('punkt_tab')"
```

### 2. Start the Python Server

Run the FastAPI server:

```bash
python server.py
```

Or using uvicorn directly:

```bash
uvicorn server:app --host 127.0.0.1 --port 8000
```

The server will start on `http://127.0.0.1:8000`

Keep this terminal window open while using the extension.

### 3. Install the Browser Extension

1. Open Chrome or Edge browser
2. Go to `chrome://extensions/` (or `edge://extensions/`)
3. Enable "Developer mode" (toggle in top right corner)
4. Click "Load unpacked"
5. Select the folder containing this extension

The extension icon should now appear in your browser toolbar.

## Usage

1. **Make sure the Python server is running** (see step 2 above)
2. Navigate to any webpage you want to analyze
3. Click the extension icon in your browser toolbar
4. Either:
   - Click **"Summarize"** to get a quick 3-sentence summary
   - Type a question and click **"Ask Question"** to get an answer based on the page content

## How It Works

The extension extracts text content from the current webpage and sends it to your local Python server. The server uses the LSA (Latent Semantic Analysis) summarization algorithm from the Sumy library to generate summaries.

### API Endpoints

- `POST /summarize` - Returns a 3-sentence summary
  - Request: `{ "text": "webpage content" }`
  - Response: `{ "summary": "summarized text" }`

- `POST /answer` - Returns context-based answer (currently uses summarization)
  - Request: `{ "text": "webpage content", "question": "user question" }`
  - Response: `{ "answer": "response text" }`

## Customization

### Adjust Summary Length

Edit `server.py` and change the number in:

```python
summary = summarizer(parser.document, 3)  # Change 3 to desired sentence count
```

### Use a Different Summarizer

The Sumy library supports multiple algorithms. You can replace `LsaSummarizer` with:

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

For better question-answering, you could integrate a local LLM like:

- **llama.cpp** with Python bindings
- **GPT4All**
- **Ollama** (with API calls)
- **Transformers** library with models like BERT or T5

## Troubleshooting

### "Cannot connect to local server"

- Make sure the Python server is running (`python server.py`)
- Check that it's running on `http://127.0.0.1:8000`
- Check for firewall or antivirus blocking the connection

### Import Errors

Make sure all dependencies are installed:

```bash
pip install -r requirements.txt
python -c "import nltk; nltk.download('punkt_tab')"
```

### CORS Errors

The server is configured to allow all origins for development. In production, you should restrict this in `server.py`:

```python
allow_origins=["chrome-extension://YOUR_EXTENSION_ID"]
```

## License

MIT License - Feel free to modify and distribute.
