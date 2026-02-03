// No API key needed for local server
document.addEventListener('DOMContentLoaded', async () => {
  // Check if local server is running
  checkServerStatus();
});

// Check if the local Python server is accessible
async function checkServerStatus() {
  try {
    const response = await fetch('http://127.0.0.1:8000/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'test' })
    });
    
    if (!response.ok) {
      showError('Local server is not responding. Please start the Python server.');
    }
  } catch (error) {
    showError('Cannot connect to local server. Make sure it\'s running on http://127.0.0.1:8000');
  }
}

// Ask Gemini button handler
document.getElementById('askBtn').addEventListener('click', async () => {
  await processQuery('ask', 'askBtn');
});

// Summarize button handler
document.getElementById('summarizeBtn').addEventListener('click', async () => {
  await processQuery('summarize', 'summarizeBtn');
});

// Common function to process queries
async function processQuery(queryType, buttonId) {
  const question = queryType === 'ask' ? document.getElementById('question').value.trim() : null;
  
  if (queryType === 'ask' && !question) {
    showError('Please enter a question');
    return;
  }
  
  // Disable buttons and show loading
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
    
    // Send to local Python server
    let response;
    if (queryType === 'summarize') {
      response = await queryLocalServer('/summarize', { text: pageContent.text });
    } else {
      response = await queryLocalServer('/answer', { 
        text: pageContent.text,
        question: question
      });
    }
    
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

// Query Local Python Server
async function queryLocalServer(endpoint, data) {
  const apiUrl = `http://127.0.0.1:8000${endpoint}`;
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error(`Server request failed: ${response.status}. Make sure the Python server is running.`);
  }
  
  const result = await response.json();
  
  if (result.error) {
    throw new Error(result.error);
  }
  
  return result.summary || result.answer || 'No response from server';
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
