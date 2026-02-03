from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.text_rank import TextRankSummarizer
import re

app = FastAPI()

# Enable CORS for the browser extension to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your extension's origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def clean_text(text):
    """Clean and preprocess text for better summarization"""
    # Remove URLs
    text = re.sub(r'http\S+|www\S+', '', text)
    
    # Remove email addresses
    text = re.sub(r'\S+@\S+', '', text)
    
    # Split into sentences/lines
    lines = text.split('\n')
    
    # Filter out short lines and UI elements
    filtered_lines = []
    for line in lines:
        line = line.strip()
        
        # Skip short lines
        if len(line) < 40:
            continue
        
        # Skip lines with common UI patterns
        if re.search(r'^(Posted|Attribution|Comments?|Live\.|Watch:|Listen:|Gallery:|Video:)', line, re.IGNORECASE):
            continue
        
        # Skip lines that are mostly numbers/timestamps
        if re.search(r'^\d+\s*(hour|minute|day|week|month)s?\s*ago', line, re.IGNORECASE):
            continue
            
        filtered_lines.append(line)
    
    # Remove duplicate lines
    seen = set()
    unique_lines = []
    for line in filtered_lines:
        line_lower = line.lower()
        if line_lower not in seen:
            seen.add(line_lower)
            unique_lines.append(line)
    
    # Join with proper sentence spacing
    text = '. '.join(unique_lines)
    
    # Fix double periods and ensure proper punctuation
    text = re.sub(r'\.\.+', '.', text)
    text = re.sub(r'([.!?])\s*\.\s*', r'\1 ', text)
    
    # Ensure text ends with punctuation
    if text and text[-1] not in '.!?':
        text += '.'
    
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    
    return text.strip()

def detect_title_lines(lines):
    """Detect which lines are likely titles/headers vs descriptions"""
    titles = []
    descriptions = []
    
    for i, line in enumerate(lines):
        line = line.strip()
        if len(line) < 20:
            continue
            
        # Characteristics of titles:
        # - Shorter (< 80 chars)
        # - Often capitalized words
        # - No lowercase conjunctions at start
        # - May contain location/date info
        is_title = False
        
        # Check for location/date pattern (likely metadata, not title)
        if re.search(r'(Washington|Portland|Sydney|Berlin|Zagreb|Copenhagen|Wellington|Düsseldorf|Philadelphia|Berkeley|London|Dublin),.*\d{4}', line):
            is_title = False  # This is metadata, treat as description
        # Short line with capitalized words = likely a title
        elif len(line) < 80 and sum(1 for c in line if c.isupper()) >= 3:
            is_title = True
        # Title-like patterns
        elif re.search(r'^[A-Z][^.]+[A-Z]', line) and len(line) < 100 and line.count(',') <= 1:
            is_title = True
        
        if is_title:
            titles.append((i, line))
        else:
            descriptions.append((i, line))
    
    return titles, descriptions

@app.post("/summarize")
async def summarize(data: dict):
    text = data.get("text", "")
    
    if not text:
        return {"error": "No text provided"}
    
    try:
        # Clean the text first
        cleaned_text = clean_text(text)
        
        if len(cleaned_text) < 100:
            return {"summary": "Not enough content to summarize."}
        
        # Check if this is already condensed content (list/index page)
        lines = cleaned_text.split('. ')
        word_count = len(cleaned_text.split())
        
        # Calculate average line/sentence length
        avg_length = word_count / max(len(lines), 1)
        
        # If already condensed (likely a list of items), format with structure
        if (avg_length < 25 and len(lines) >= 3 and len(lines) <= 20) or (word_count < 2000 and len(lines) >= 3):
            # Detect potential titles
            titles, descriptions = detect_title_lines(lines)
            
            # If we found titles, create structured output
            if len(titles) >= 2:
                formatted_sections = []
                
                for i, (idx, title) in enumerate(titles):
                    # Get descriptions between this title and the next
                    next_idx = titles[i + 1][0] if i + 1 < len(titles) else len(lines)
                    section_lines = [lines[j].strip() for j in range(idx + 1, next_idx) 
                                    if j < len(lines) and len(lines[j].strip()) > 30]
                    
                    if section_lines:
                        formatted_sections.append(f"**{title}**\n\n" + "\n\n".join(section_lines))
                
                if formatted_sections:
                    return {"summary": "\n\n---\n\n".join(formatted_sections)}
            
            # Fallback: format as bullet points
            formatted_items = []
            for line in lines:
                line = line.strip()
                if line and len(line) > 30:
                    if not line.endswith('.'):
                        line += '.'
                    formatted_items.append(line)
            
            if formatted_items:
                formatted = "**Key Points:**\n\n• " + "\n\n• ".join(formatted_items)
                return {"summary": formatted}
        
        # For longer content, use TextRank summarization
        parser = PlaintextParser.from_string(cleaned_text, Tokenizer("english"))
        summarizer = TextRankSummarizer()
        
        # Determine number of sentences based on content length
        num_sentences = min(6, max(3, len(cleaned_text) // 500))
        summary = summarizer(parser.document, num_sentences)
        
        summary_text = " ".join([str(s) for s in summary])
        
        if not summary_text:
            return {"summary": "Unable to generate a meaningful summary from this content."}
        
        return {"summary": summary_text}
    except Exception as e:
        return {"error": str(e)}

@app.post("/answer")
async def answer_question(data: dict):
    text = data.get("text", "")
    question = data.get("question", "")
    
    if not text:
        return {"error": "No text provided"}
    
    try:
        # Clean the text first
        cleaned_text = clean_text(text)
        
        if len(cleaned_text) < 100:
            return {"answer": "Not enough content to analyze."}
        
        parser = PlaintextParser.from_string(cleaned_text, Tokenizer("english"))
        summarizer = TextRankSummarizer()
        
        # Get more sentences for Q&A context
        num_sentences = min(7, max(5, len(cleaned_text) // 400))
        summary = summarizer(parser.document, num_sentences)
        
        summary_text = " ".join([str(s) for s in summary])
        
        if not summary_text:
            return {"answer": "Unable to extract relevant information from this content."}
        
        response = f"Based on the webpage content:\n\n{summary_text}\n\n(Note: This is an extractive summary. For more precise answers to specific questions, consider integrating a language model.)"
        
        return {"answer": response}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
