from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import re
import nltk
from nltk.tokenize import word_tokenize, sent_tokenize
from nltk.tag import pos_tag
from nltk.chunk import ne_chunk

app = FastAPI()

# Download required NLTK data on startup
try:
    sent_tokenize("test")  # This will trigger download if needed
except:
    nltk.download('punkt_tab')

try:
    pos_tag(["test"])  # This will trigger download if needed
except:
    nltk.download('averaged_perceptron_tagger')

try:
    ne_chunk(pos_tag(word_tokenize("test")))  # This will trigger download if needed
except:
    nltk.download('maxent_ne_chunker')
    
try:
    from nltk.corpus import words
    words.words()
except:
    nltk.download('words')

# Enable CORS for the browser extension to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your extension's origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/categorize")
async def categorize(data: dict):
    """Extract and categorize named entities from text using NLTK"""
    text = data.get("text", "")
    
    if not text:
        return {"error": "No text provided", "entities": []}
    
    try:
        # Tokenize into sentences
        sentences = sent_tokenize(text)
        
        categorized_entities = []
        seen_entities = set()  # Avoid duplicates
        
        for sentence in sentences:
            # Tokenize words and get POS tags
            tokens = word_tokenize(sentence)
            pos_tags = pos_tag(tokens)
            
            # Extract named entities using chunking
            chunks = ne_chunk(pos_tags)
            
            # Process each chunk
            for chunk in chunks:
                if hasattr(chunk, 'label'):
                    # This is a named entity
                    entity_type = chunk.label()
                    entity_text = " ".join([word for word, pos in chunk.leaves()])
                    
                    # Map NLTK entity types to our categories
                    category_map = {
                        'PERSON': 'person',
                        'ORGANIZATION': 'organization',
                        'GPE': 'address/location',  # Geopolitical Entity
                        'LOCATION': 'address/location',
                        'FACILITY': 'property',
                        'FAC': 'property',
                        'PRODUCT': 'vehicle',
                        'EVENT': 'event',
                    }
                    
                    category = category_map.get(entity_type)
                    
                    # Keep entities with valid categories - be more permissive
                    if category:
                        # Skip very short entities and pure punctuation
                        if len(entity_text) < 1 or entity_text in [".", ",", "!", "?", "-"]:
                            continue
                        # Skip all-digit entities
                        if entity_text.isdigit():
                            continue
                        # Skip single letter entities (unless they're abbreviated names like "Q")
                        if len(entity_text) == 1 and entity_text.lower() not in ['q']:
                            continue
                        
                        # Verify entity is not a substring within a larger word
                        # Use word boundary regex to ensure it's a complete word match
                        import re
                        word_boundary_pattern = r'\b' + re.escape(entity_text) + r'\b'
                        if not re.search(word_boundary_pattern, text, re.IGNORECASE):
                            continue
                        
                        entity_key = (entity_text.lower(), category)
                        if entity_key not in seen_entities:
                            seen_entities.add(entity_key)
                            categorized_entities.append({
                                "text": entity_text,
                                "category": category,
                                "type": entity_type,
                                "confidence": 0.85
                            })
        
        return {
            "success": True,
            "entities": categorized_entities,
            "count": len(categorized_entities),
            "text_length": len(text),
            "sentences": len(sentences)
        }
    
    except Exception as e:
        import traceback
        print(f"Error in categorize: {str(e)}")
        print(traceback.format_exc())
        return {"error": str(e), "entities": []}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
