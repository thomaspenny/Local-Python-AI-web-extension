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

// Summarize button handler
document.getElementById('summarizeBtn').addEventListener('click', async () => {
  await highlightMainText();
});

// Clear highlights button handler
document.getElementById('clearBtn').addEventListener('click', async () => {
  await clearHighlights();
});

// Function to extract page content (runs in page context)
function extractPageContent() {
  try {
    const title = document.title;
    const url = window.location.href;
    
    // Remove script, style, and other non-content elements
    const clone = document.body.cloneNode(true);
    const elementsToRemove = clone.querySelectorAll(
      'script, style, noscript, nav, header, footer, aside, form, ' +
      '[role="navigation"], [role="banner"], [role="complementary"], [role="contentinfo"], ' +
      '.nav, .menu, .sidebar, .header, .footer, .advertisement, .ad, .promo, ' +
      '.cookie-banner, .popup, .modal, button, input, select, ' +
      '[class*="share"], [class*="social"], [class*="comment"], ' +
      '[id*="cookie"], [class*="cookie"], [class*="newsletter"], ' +
      '[class*="related"], [class*="recommend"], .breadcrumb, ' +
      'iframe, video, audio'
    );
    elementsToRemove.forEach(el => el.remove());
    
    // Prefer article/main content if available
    let contentElement = clone.querySelector('article, main, [role="main"], .content, .article, #content, #main, .post-content, .entry-content');
    if (!contentElement) {
      contentElement = clone;
    }
    
    // Get visible text
    let text = contentElement.innerText || contentElement.textContent;
    
    // If we got very little text, try without filtering
    if (!text || text.trim().length < 100) {
      text = document.body.innerText || document.body.textContent || '';
    }
    
    // Basic cleanup
    text = text.trim();
    
    // If still no text, return error indication
    if (!text || text.length < 50) {
      return {
        title,
        url,
        text: '',
        error: 'Page appears to have no readable content'
      };
    }
    
    // Split into lines and clean
    let lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => {
        // Must be substantial (more than 20 chars - reduced threshold)
        if (line.length < 20) return false;
        
        // Filter out common UI patterns
        const uiPatterns = [
          /^(Posted|Attribution|Comments?|Share|Follow|Subscribe|Live\.?|Close|Open|Show|Hide|More|Less|Read more|Continue reading|Sign up|Log in|Register)/i,
          /^\d+\s*(hour|minute|day|week|month|year)s?\s*ago/i,
          /^(Updated|Published):/i,
          /^\d+\s*Comments?$/i,
          /^(Watch|Listen|Gallery|Video|Audio):/i,
          /Change my nation|You are now seeing/i,
          /United Kingdom|England|Scotland|Wales|Northern Ireland$/,
          /^(Top Stories|Latest|Trending|Popular|Most Read)/i
        ];
        
        return !uiPatterns.some(pattern => pattern.test(line));
      });
  
  // Remove duplicate consecutive lines
  lines = lines.filter((line, index) => {
    if (index === 0) return true;
    return line !== lines[index - 1];
  });
  
  // Remove lines that appear more than twice (likely navigation)
  const lineCounts = {};
  lines.forEach(line => {
    lineCounts[line] = (lineCounts[line] || 0) + 1;
  });
  lines = lines.filter(line => lineCounts[line] <= 2);
  
  text = lines.join('\n').replace(/\n{3,}/g, '\n\n');
  
  // Limit content length to avoid token limits
  const maxLength = 10000;
  const truncatedText = text.substring(0, maxLength);
  
  return {
    title,
    url,
    text: truncatedText || text,
    truncated: text.length > maxLength
  };
  } catch (error) {
    console.error('Error extracting page content:', error);
    // Fallback: just get all body text
    return {
      title: document.title,
      url: window.location.href,
      text: document.body.innerText || document.body.textContent || '',
      error: error.message
    };
  }
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

// Highlight main text on the page
async function highlightMainText() {
  const btn = document.getElementById('summarizeBtn');
  const clearBtn = document.getElementById('clearBtn');
  
  btn.disabled = true;
  clearBtn.disabled = true;
  showResponse('Analyzing page and identifying key sentences...', true);
  
  try {
    console.log('[DEBUG] Starting highlight process...');
    
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('[DEBUG] Active tab:', tab.url);
    
    // Extract page content
    showResponse('Extracting page content...', true);
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractPageContent
    });
    
    const pageContent = results[0].result;
    console.log('[DEBUG] Page content length:', pageContent?.text?.length || 0);
    
    if (!pageContent || !pageContent.text) {
      throw new Error('Could not extract page content');
    }
    
    // Get key sentences from server
    showResponse('Analyzing with AI (LexRank + Edmundson)...', true);
    console.log('[DEBUG] Sending to server...');
    const response = await queryLocalServer('/summarize', { text: pageContent.text });
    console.log('[DEBUG] Server response:', response.substring(0, 200) + '...');
    
    // Parse the response to extract sentences
    const sentences = extractSentencesFromResponse(response);
    console.log('[DEBUG] Extracted sentences:', sentences.length);
    sentences.forEach((s, i) => console.log(`[DEBUG] Sentence ${i+1}:`, s.substring(0, 80) + '...'));
    
    if (sentences.length === 0) {
      throw new Error('No key sentences found');
    }
    
    // Inject and execute highlighting directly
    showResponse('Highlighting sentences on page...', true);
    console.log('[DEBUG] Injecting highlight function...');
    const [highlightResult] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: highlightTextOnPage,
      args: [sentences]
    });
    
    const result = highlightResult.result;
    console.log('[DEBUG] Highlight result:', result);
    
    if (result && result.success) {
      // Format output with highlighted sentences
      const highlightedSentences = result.highlightedSentences || sentences;
      let output = `✓ Highlighted ${highlightedSentences.length} key sentence${highlightedSentences.length !== 1 ? 's' : ''}\n\n**Highlighted Sentences:**\n\n`;
      highlightedSentences.forEach((sentence, i) => {
        output += `${i + 1}. ${sentence}\n\n`;
      });
      showResponse(output);
    } else {
      showError(result?.message || 'Failed to highlight text');
    }
    
  } catch (error) {
    console.error('[ERROR] Full error:', error);
    console.error('[ERROR] Stack:', error.stack);
    showError(`Error: ${error.message}\n\nCheck browser console (F12) for details.`);
  } finally {
    btn.disabled = false;
    clearBtn.disabled = false;
  }
}

// Clear highlights from the page
async function clearHighlights() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: removeHighlightsFromPage
    });
    
    showResponse('Highlights cleared');
  } catch (error) {
    console.error('Error:', error);
    showError(`Error: ${error.message}`);
  }
}

// Function to highlight text (runs in page context)
function highlightTextOnPage(sentences) {
  // Remove existing highlights
  const existingHighlights = document.querySelectorAll('.ai-highlight');
  existingHighlights.forEach(el => {
    const parent = el.parentNode;
    parent.replaceChild(document.createTextNode(el.textContent), el);
    parent.normalize();
  });
  
  // Add highlight styles
  if (!document.getElementById('ai-highlight-styles')) {
    const style = document.createElement('style');
    style.id = 'ai-highlight-styles';
    style.textContent = `
      .ai-highlight {
        background-color: #ffeb3b !important;
        padding: 2px 0 !important;
        border-radius: 2px !important;
        box-shadow: 0 0 0 2px rgba(255, 235, 59, 0.3) !important;
      }
    `;
    document.head.appendChild(style);
  }
  
  let highlightCount = 0;
  const highlightedSentences = [];
  
  sentences.forEach(sentence => {
    const cleanSentence = sentence.trim();
    if (cleanSentence.length < 20) return;
    
    let sentenceHighlighted = false;
    
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          const tagName = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript', 'iframe', 'figcaption'].includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          if (parent.classList.contains('ai-highlight')) return NodeFilter.FILTER_REJECT;
          
          const className = parent.className.toLowerCase();
          if (className.includes('caption') || className.includes('credit') || 
              className.includes('photo') || className.includes('image')) {
            return NodeFilter.FILTER_REJECT;
          }
          
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    
    textNodes.forEach(textNode => {
      const text = textNode.textContent;
      const textLower = text.toLowerCase();
      const cleanSentenceLower = cleanSentence.toLowerCase();
      
      // Try exact match
      if (textLower.includes(cleanSentenceLower)) {
        const matchIndex = textLower.indexOf(cleanSentenceLower);
        const beforeNode = document.createTextNode(text.substring(0, matchIndex));
        const highlightedText = text.substring(matchIndex, matchIndex + cleanSentence.length);
        const afterNode = document.createTextNode(text.substring(matchIndex + cleanSentence.length));
        
        const highlight = document.createElement('mark');
        highlight.className = 'ai-highlight';
        highlight.textContent = highlightedText;
        
        const parent = textNode.parentNode;
        parent.insertBefore(beforeNode, textNode);
        parent.insertBefore(highlight, textNode);
        parent.insertBefore(afterNode, textNode);
        parent.removeChild(textNode);
        
        highlightCount++;
        sentenceHighlighted = true;
        if (highlightCount === 1) {
          highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else if (cleanSentence.length > 50) {
        // Try key phrase match
        const keyPhrase = cleanSentence.substring(0, 60).toLowerCase();
        const keyPhraseIndex = textLower.indexOf(keyPhrase);
        
        if (keyPhraseIndex !== -1) {
          const beforeText = text.substring(0, keyPhraseIndex);
          const sentenceStart = Math.max(
            beforeText.lastIndexOf('. ') + 2,
            beforeText.lastIndexOf('! ') + 2,
            beforeText.lastIndexOf('? ') + 2,
            0
          );
          
          const afterStart = keyPhraseIndex + 60;
          const afterText = text.substring(afterStart);
          const sentenceEndMatch = afterText.match(/[.!?]/);
          const sentenceEnd = sentenceEndMatch 
            ? afterStart + afterText.indexOf(sentenceEndMatch[0]) + 1
            : Math.min(afterStart + 200, text.length);
          
          const beforeNode = document.createTextNode(text.substring(0, sentenceStart));
          const highlightedText = text.substring(sentenceStart, sentenceEnd);
          const afterNode = document.createTextNode(text.substring(sentenceEnd));
          
          const highlight = document.createElement('mark');
          highlight.className = 'ai-highlight';
          highlight.textContent = highlightedText;
          
          const parent = textNode.parentNode;
          parent.insertBefore(beforeNode, textNode);
          parent.insertBefore(highlight, textNode);
          parent.insertBefore(afterNode, textNode);
          parent.removeChild(textNode);
          
          highlightCount++;
          sentenceHighlighted = true;
          if (highlightCount === 1) {
            highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
    });
    
    if (sentenceHighlighted) {
      highlightedSentences.push(cleanSentence);
    }
  });
  
  return { 
    success: true, 
    count: highlightCount,
    highlightedSentences: highlightedSentences,
    message: highlightCount > 0 
      ? `Highlighted ${highlightCount} key sentence${highlightCount !== 1 ? 's' : ''}`
      : 'Could not find matching text to highlight'
  };
}

// Function to remove highlights (runs in page context)
function removeHighlightsFromPage() {
  const existingHighlights = document.querySelectorAll('.ai-highlight');
  existingHighlights.forEach(el => {
    const parent = el.parentNode;
    parent.replaceChild(document.createTextNode(el.textContent), el);
    parent.normalize();
  });
  
  const styleEl = document.getElementById('ai-highlight-styles');
  if (styleEl) {
    styleEl.remove();
  }
}

// Extract individual sentences from the server response
function extractSentencesFromResponse(response) {
  const sentences = [];
  
  // Remove markdown formatting
  let text = response.replace(/\*\*[^*]+\*\*:?/g, ''); // Remove **bold** headers
  text = text.replace(/^•\s*/gm, ''); // Remove bullet points
  text = text.replace(/^-\s*/gm, ''); // Remove dashes
  
  // Split by sentence boundaries
  const parts = text.split(/[.!?]\s+/);
  
  parts.forEach(part => {
    const cleaned = part.trim();
    if (cleaned.length > 30) { // Only keep substantial sentences
      sentences.push(cleaned);
    }
  });
  
  return sentences;
}
