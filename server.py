from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.lsa import LsaSummarizer

app = FastAPI()

# Enable CORS for the browser extension to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your extension's origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/summarize")
async def summarize(data: dict):
    text = data.get("text", "")
    
    if not text:
        return {"error": "No text provided"}
    
    try:
        parser = PlaintextParser.from_string(text, Tokenizer("english"))
        summarizer = LsaSummarizer()
        summary = summarizer(parser.document, 3)  # Summarize to 3 sentences
        
        return {"summary": " ".join([str(s) for s in summary])}
    except Exception as e:
        return {"error": str(e)}

@app.post("/answer")
async def answer_question(data: dict):
    text = data.get("text", "")
    question = data.get("question", "")
    
    if not text:
        return {"error": "No text provided"}
    
    # For now, return a summary with context about the question
    # You can enhance this with more sophisticated NLP if needed
    try:
        parser = PlaintextParser.from_string(text, Tokenizer("english"))
        summarizer = LsaSummarizer()
        summary = summarizer(parser.document, 5)  # Get more sentences for Q&A
        
        summary_text = " ".join([str(s) for s in summary])
        response = f"Based on the webpage content, here's a relevant summary:\n\n{summary_text}\n\n(Note: For specific questions, consider using a more advanced NLP model)"
        
        return {"answer": response}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
