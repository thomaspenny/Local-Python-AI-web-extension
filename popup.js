// Load saved API key on popup open
document.addEventListener('DOMContentLoaded', async () => {
  const result = await chrome.storage.local.get(['geminiApiKey']);
  if (result.geminiApiKey) {
    document.getElementById('apiKey').value = result.geminiApiKey;
  }
});

// Configure button handler
document.getElementById('configBtn').addEventListener('click', () => {
  const apiKeySection = document.getElementById('apiKeySection');
  apiKeySection.classList.toggle('visible');
});

// Save API key
document.getElementById('saveKeyBtn').addEventListener('click', async () => {
  const apiKey = document.getElementById('apiKey').value.trim();
  if (!apiKey) {
    showError('Please enter an API key');
    return;
  }
  
  await chrome.storage.local.set({ geminiApiKey: apiKey });
  showResponse('API key saved successfully!');
  
  // Hide the config section after saving
  setTimeout(() => {
    document.getElementById('apiKeySection').classList.remove('visible');
  }, 1000);
});

// Ask Gemini button handler
document.getElementById('askBtn').addEventListener('click', async () => {
  const question = document.getElementById('question').value.trim();
  
  if (!question) {
    showError('Please enter a question');
    return;
  }
  
  await processQuery(question, 'askBtn');
});

// Summarize button handler
document.getElementById('summarizeBtn').addEventListener('click', async () => {
  await processQuery('Please provide a comprehensive summary of this webpage, including the main topic, key points, and any important details.', 'summarizeBtn');
});

// Common function to process queries
async function processQuery(question, buttonId) {
  // Get API key from storage
  const result = await chrome.storage.local.get(['geminiApiKey']);
  const apiKey = result.geminiApiKey;
  
  if (!apiKey) {
    showError('Please configure your Gemini API key first');
    return;
  }
  
  // Disable button and show loading
  const btn = document.getElementById(buttonId);
  const askBtn = document.getElementById('askBtn');
  const summarizeBtn = document.getElementById('summarizeBtn');
  
  btn.disabled = true;
  askBtn.disabled = true;
  summarizeBtn.disabled = true;
  showResponse('Analyzing webpage and generating response...', true);
  
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Extract page content using content script
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractPageContent
    });
    
    const pageContent = results[0].result;
    
    if (!pageContent || !pageContent.text) {
      throw new Error('Could not extract page content');
    }
    
    // Send to Gemini API
    const response = await queryGemini(apiKey, question, pageContent);
    showResponse(response);
    
  } catch (error) {
    console.error('Error:', error);
    showError(`Error: ${error.message}`);
  } finally {
    btn.disabled = false;
    askBtn.disabled = false;
    summarizeBtn.disabled = false;
  }
}

// Function to extract page content (runs in page context)
function extractPageContent() {
  const title = document.title;
  const url = window.location.href;
  
  // Remove script and style elements
  const clone = document.body.cloneNode(true);
  const scripts = clone.querySelectorAll('script, style, noscript');
  scripts.forEach(el => el.remove());
  
  // Get visible text
  const text = clone.innerText || clone.textContent;
  
  // Limit content length to avoid token limits
  const maxLength = 10000;
  const truncatedText = text.substring(0, maxLength);
  
  return {
    title,
    url,
    text: truncatedText,
    truncated: text.length > maxLength
  };
}

// Query Gemini API
async function queryGemini(apiKey, question, pageContent) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent`;
  
  // Sanitize title and URL to prevent prompt injection
  const sanitizedTitle = (pageContent.title || 'Untitled').substring(0, 200);
  const sanitizedUrl = (pageContent.url || 'Unknown URL').substring(0, 500);
  
  const prompt = `You are analyzing a webpage. Here are the details:

Title: ${sanitizedTitle}
URL: ${sanitizedUrl}
${pageContent.truncated ? '(Content truncated to fit limits)' : ''}

Page Content:
${pageContent.text}

User Question: ${question}

Please provide a helpful and accurate answer based on the webpage content above.`;
  
  const requestBody = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }]
  };
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    throw new Error('Unexpected API response format');
  }
  
  return data.candidates[0].content.parts[0].text;
}

// Convert markdown to HTML
function markdownToHtml(markdown) {
  let html = markdown;
  
  // Convert **bold** to <strong>
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Convert bullet points to <ul><li>
  // Handle multiple consecutive bullets as a list
  html = html.replace(/^(\s*\*\s+.+)(\n\s*\*\s+.+)*/gm, (match) => {
    const items = match.split('\n').map(line => {
      const content = line.replace(/^\s*\*\s+/, '');
      return content ? `<li>${content}</li>` : '';
    }).filter(item => item).join('');
    return `<ul>${items}</ul>`;
  });
  
  // Convert line breaks to paragraphs (avoid double spacing after lists)
  html = html.split('\n\n').map(para => {
    para = para.trim();
    if (!para) return '';
    if (para.startsWith('<ul>') || para.startsWith('<li>')) return para;
    return `<p>${para}</p>`;
  }).join('');
  
  // Clean up any remaining single line breaks within paragraphs
  html = html.replace(/<p>([^<]+)<\/p>/g, (match, content) => {
    return `<p>${content.replace(/\n/g, '<br>')}</p>`;
  });
  
  return html;
}

// Helper function to display response
function showResponse(message, isLoading = false) {
  const responseBox = document.getElementById('response');
  
  if (isLoading) {
    responseBox.textContent = message;
    responseBox.className = 'response-box loading';
  } else {
    // Convert markdown to HTML for formatted output
    const htmlContent = markdownToHtml(message);
    responseBox.innerHTML = htmlContent;
    responseBox.className = 'response-box';
  }
}

// Helper function to display errors
function showError(message) {
  const responseBox = document.getElementById('response');
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error';
  errorDiv.textContent = message; // Use textContent to prevent XSS
  responseBox.innerHTML = '';
  responseBox.appendChild(errorDiv);
  responseBox.className = 'response-box';
}
