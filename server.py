from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.lex_rank import LexRankSummarizer
from sumy.summarizers.edmundson import EdmundsonSummarizer
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
    
    # Remove image references and captions
    text = re.sub(r'Image source,?\s*[^.!?]*?(?:Getty Images?|Reuters|AP|AFP|EPA)', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Image caption,?\s*[^.!?]*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Media caption,?\s*[^.!?]*', '', text, flags=re.IGNORECASE)
    
    # Remove "By [Author]" and "Published X ago" patterns
    text = re.sub(r'By\s*[A-Z][a-zA-Z\s,]+(?:Published|Report|Technology|correspondent|reporter)', '', text)
    text = re.sub(r'Published\s*\d+\s*(hours?|minutes?|days?|weeks?|months?)\s*ago', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Published\d+\s*[A-Z][a-z]+\s*\d{4},\s*\d{2}:\d{2}', '', text)  # Published4 February 2026, 06:03
    text = re.sub(r'\d{1,2}\s+[A-Z][a-z]+\s+\d{4},\s+\d{2}:\d{2}\s+[A-Z]{3,4}', '', text)  # 4 February 2026, 06:03 GMT
    
    # Split into sentences more carefully
    # First, protect abbreviations
    text = re.sub(r'\bMr\.', 'Mr', text)
    text = re.sub(r'\bMrs\.', 'Mrs', text)
    text = re.sub(r'\bMs\.', 'Ms', text)
    text = re.sub(r'\bDr\.', 'Dr', text)
    text = re.sub(r'\bU\.S\.', 'US', text)
    text = re.sub(r'\bU\.K\.', 'UK', text)
    
    # Split on actual sentence boundaries
    sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', text)
    
    # Also split on period followed immediately by capital letter (no space)
    refined_sentences = []
    for sent in sentences:
        # Split sentences that are run together like "sentence1.Sentence2"
        parts = re.split(r'\.(?=[A-Z])', sent)
        for part in parts:
            if part and not part.endswith('.'):
                part += '.'
            refined_sentences.append(part)
    
    sentences = refined_sentences
    
    # Filter out short sentences and UI elements
    filtered_sentences = []
    for sentence in sentences:
        sentence = sentence.strip()
        
        # Skip very short sentences
        if len(sentence) < 30:
            continue
        
        # Skip common UI patterns and metadata
        if re.search(r'^(Posted|Attribution|Comments?|Live\.|Watch:|Listen:|Gallery:|Video:|Related topics?|More on this story|Media caption|Image caption|Image source|By[A-Z])', sentence, re.IGNORECASE):
            continue
        
        # Skip timestamp patterns
        if re.search(r'^\d+\s*(hour|minute|day|week|month)s?\s*ago', sentence, re.IGNORECASE):
            continue
        
        # Skip sentences that contain "Media caption" or "Image caption" anywhere
        if re.search(r'Media caption|Image caption', sentence, re.IGNORECASE):
            continue
        
        # Skip lines that are mostly links/navigation
        if sentence.count('Published') > 1:
            continue
            
        filtered_sentences.append(sentence)
    
    # Remove duplicate sentences
    seen = set()
    unique_sentences = []
    for sentence in filtered_sentences:
        sentence_lower = sentence.lower()
        if sentence_lower not in seen:
            seen.add(sentence_lower)
            unique_sentences.append(sentence)
    
    # Join with proper spacing
    text = ' '.join(unique_sentences)
    
    # Clean up punctuation
    text = re.sub(r'\.\.+', '.', text)
    text = re.sub(r'\s+([.!?,;:])', r'\1', text)
    
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    
    return text.strip()

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
        
        # Parse the text
        parser = PlaintextParser.from_string(cleaned_text, Tokenizer("english"))
        
        # Use LexRank for the 2-sentence summary
        lexrank_summarizer = LexRankSummarizer()
        summary_sentences = lexrank_summarizer(parser.document, 2)
        
        # Ensure we only get exactly 2 sentences
        summary_list = list(summary_sentences)[:2]
        summary_text = " ".join([str(s).strip() for s in summary_list])
        
        # If the summary is too long or contains multiple sentences run together, truncate
        if len(summary_text) > 500:
            # Split and take only first 2 actual sentences
            sent_parts = re.split(r'(?<=[.!?])\s+', summary_text)
            summary_text = " ".join(sent_parts[:2])
        
        # Use Edmundson for extracting main facts
        edmundson_summarizer = EdmundsonSummarizer()
        
        # Edmundson uses bonus/stigma/null words for better fact extraction
        # Set bonus words (important terms) and stigma words (less important)
        edmundson_summarizer.bonus_words = ["important", "significant", "key", "major", "critical", "essential"]
        edmundson_summarizer.stigma_words = ["maybe", "perhaps", "possibly", "might", "could"]
        # Set null words (common stopwords to ignore)
        edmundson_summarizer.null_words = ["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", 
                                          "of", "with", "by", "from", "up", "about", "into", "through", "during",
                                          "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
                                          "do", "does", "did", "will", "would", "should", "could", "may", "might",
                                          "can", "this", "that", "these", "those", "i", "you", "he", "she", "it",
                                          "we", "they", "them", "their", "what", "which", "who", "when", "where",
                                          "why", "how", "all", "each", "every", "both", "few", "more", "most",
                                          "other", "some", "such", "no", "nor", "not", "only", "own", "same",
                                          "so", "than", "too", "very", "s", "t", "just", "don", "now"]
        
        # Get additional sentences for main facts (3-5 sentences)
        num_fact_sentences = min(5, max(3, len(cleaned_text) // 600))
        fact_sentences = edmundson_summarizer(parser.document, num_fact_sentences)
        
        if not summary_text:
            return {"summary": "Unable to generate a meaningful summary from this content."}
        
        # Format the output with summary and main facts
        output = f"**Summary:**\n\n{summary_text}\n\n"
        
        if fact_sentences:
            facts_text = "\n\n• ".join([str(s) for s in fact_sentences])
            output += f"**Main Facts:**\n\n• {facts_text}"
        
        return {"summary": output}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
