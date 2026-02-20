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

// Categorize button handler
document.getElementById('categorizeBtn').addEventListener('click', async () => {
  await highlightEntityCategories();
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
    
    // If we got very little text, try from original document (not clone)
    if (!text || text.trim().length < 100) {
      // Try article from original
      const article = document.querySelector('article, [role="main"], main');
      if (article) {
        text = article.innerText || article.textContent || '';
      }
    }
    
    // If still not enough, get from body
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

// Convert markdown to HTML
// Helper function to display response
function showResponse(message, isLoading = false) {
  const responseBox = document.getElementById('response');
  
  if (isLoading) {
    responseBox.textContent = message;
    responseBox.className = 'response-box loading';
  } else {
    responseBox.innerHTML = message;
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

// Categorize and highlight entities on the page
async function highlightEntityCategories() {
  try {
    const btn = document.getElementById('categorizeBtn');
    const clearBtn = document.getElementById('clearBtn');
    btn.disabled = true;
    clearBtn.disabled = true;
    
    showResponse('Extracting page content...', true);
    
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Extract page content
    const extractResult = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractPageContent
    });
    
    if (!extractResult || !extractResult[0] || !extractResult[0].result) {
      showError('Failed to extract page content');
      btn.disabled = false;
      clearBtn.disabled = false;
      return;
    }
    
    const pageData = extractResult[0].result;
    if (!pageData.text || pageData.text.length < 50) {
      console.log('[DEBUG] Insufficient content:', pageData);
      showError(pageData.error || 'Not enough content on page. Need at least 50 characters.');
      btn.disabled = false;
      clearBtn.disabled = false;
      return;
    }
    
    console.log('[DEBUG] Extracted text length:', pageData.text.length);
    console.log('[DEBUG] Extracted text preview:', pageData.text.substring(0, 200));
    console.log('[DEBUG] Extracted text last 200:', pageData.text.substring(Math.max(0, pageData.text.length - 200)));
    
    showResponse('Categorizing entities...', true);
    
    // Send to server for categorization
    const response = await fetch('http://127.0.0.1:8000/categorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: pageData.text })
    });
    
    if (!response.ok) {
      throw new Error(`Server request failed: ${response.status}`);
    }
    
    const categorizeResult = await response.json();
    console.log('[DEBUG] Categorize response:', categorizeResult);
    
    if (categorizeResult.error) {
      showError(`Server error: ${categorizeResult.error}`);
      btn.disabled = false;
      clearBtn.disabled = false;
      return;
    }
    
    if (!categorizeResult.entities || categorizeResult.entities.length === 0) {
      console.log('[DEBUG] No entities found. Response:', categorizeResult);
      console.log('[DEBUG] Server received text_length:', categorizeResult.text_length, 'sentences:', categorizeResult.sentences);
      showResponse('No entities found on this page. Try a different page with more proper nouns (names, companies, locations).', false);
      btn.disabled = false;
      clearBtn.disabled = false;
      return;
    }
    
    showResponse(`Found ${categorizeResult.entities.length} entities. Highlighting...`, true);
    
    // Inject highlighting function into content
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: highlightEntitiesOnPage,
      args: [categorizeResult.entities]
    });
    
    // Display results
    const categoryCount = {};
    categorizeResult.entities.forEach(entity => {
      categoryCount[entity.category] = (categoryCount[entity.category] || 0) + 1;
    });

    const categoryDisplayNames = {
      'person': 'Person',
      'organization': 'Organization',
      'address/location': 'Address/Location',
      'event': 'Event',
      'property': 'Property',
      'vehicle': 'Vehicle'
    };
    
    let resultHTML = `<strong>Found ${categorizeResult.entities.length} entities:</strong><br><br>`;
    Object.entries(categoryCount).sort().forEach(([category, count]) => {
      const displayName = categoryDisplayNames[category] || category;
      resultHTML += `<strong>${displayName}:</strong> ${count} entities<br>`;
    });
    
    showResponse(resultHTML, false);
    btn.disabled = false;
    clearBtn.disabled = false;
  } catch (error) {
    console.error('[ERROR] Categorization error:', error);
    console.error('[ERROR] Full error:', error.message);
    console.error('[ERROR] Stack:', error.stack);
    showError(`Error: ${error.message}`);
    const btn = document.getElementById('categorizeBtn');
    const clearBtn = document.getElementById('clearBtn');
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
// Function to highlight entities by category (runs in page context)
function highlightEntitiesOnPage(entities) {
  const categoryColors = {
    'person': '#FF6B6B',
    'organization': '#4ECDC4',
    'address/location': '#FFE66D',
    'event': '#95E1D3',
    'property': '#C7CEEA',
    'vehicle': '#FFDAC1'
  };

  const categoryDisplayNames = {
    'person': 'Person',
    'organization': 'Organization',
    'address/location': 'Address/Location',
    'event': 'Event',
    'property': 'Property',
    'vehicle': 'Vehicle'
  };
  
  // Remove existing highlights first
  const existingHighlights = document.querySelectorAll('.ai-highlight');
  existingHighlights.forEach(el => {
    const parent = el.parentNode;
    parent.replaceChild(document.createTextNode(el.textContent), el);
    parent.normalize();
  });
  
  // Remove existing legend
  const existingLegend = document.querySelector('.entity-legend');
  if (existingLegend) {
    existingLegend.remove();
  }
  
  // Add styles for entity highlighting
  if (!document.getElementById('ai-highlight-styles')) {
    const style = document.createElement('style');
    style.id = 'ai-highlight-styles';
    style.textContent = `
      .ai-highlight {
        padding: 2px 4px !important;
        border-radius: 3px !important;
        transition: all 0.2s ease !important;
        font-weight: 500 !important;
        cursor: pointer !important;
      }
      .ai-highlight:hover {
        opacity: 0.85 !important;
        box-shadow: 0 0 4px rgba(0,0,0,0.2) !important;
      }
      .ai-highlight[data-category="person"] {
        background-color: #FF6B6B !important;
        color: white !important;
      }
      .ai-highlight[data-category="organization"] {
        background-color: #4ECDC4 !important;
        color: white !important;
      }
      .ai-highlight[data-category="address/location"] {
        background-color: #FFE66D !important;
        color: black !important;
      }
      .ai-highlight[data-category="event"] {
        background-color: #95E1D3 !important;
        color: black !important;
      }
      .ai-highlight[data-category="property"] {
        background-color: #C7CEEA !important;
        color: black !important;
      }
      .ai-highlight[data-category="vehicle"] {
        background-color: #FFDAC1 !important;
        color: black !important;
      }
      .entity-legend {
        position: fixed !important;
        bottom: 20px !important;
        right: 20px !important;
        background: white !important;
        border: 2px solid #333 !important;
        border-radius: 8px !important;
        padding: 12px !important;
        font-size: 12px !important;
        z-index: 10000 !important;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;
      }
      .entity-legend-item {
        display: flex !important;
        align-items: center !important;
        margin-bottom: 6px !important;
      }
      .entity-legend-color {
        width: 12px !important;
        height: 12px !important;
        border-radius: 2px !important;
        margin-right: 6px !important;
      }
    `;
    document.head.appendChild(style);
  }
  
  let highlightCount = 0;
  
  // Sort entities by length (longest first) to avoid overlapping highlights
  const sortedEntities = [...entities].sort((a, b) => b.text.length - a.text.length);
  
  // Highlight each entity
  sortedEntities.forEach(entity => {
    const entityText = entity.text.trim();
    const category = entity.category;
    
    // Find all text nodes in the document
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          const tagName = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript', 'iframe'].includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          if (parent.classList.contains('ai-highlight') || parent.classList.contains('entity-legend')) {
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
    
    // Search for the entity in text nodes (case insensitive)
    textNodes.forEach(textNode => {
      const text = textNode.textContent;
      const textLower = text.toLowerCase();
      const entityLower = entityText.toLowerCase();
      
      let searchIndex = 0;
      let matchIndex;
      
      while ((matchIndex = textLower.indexOf(entityLower, searchIndex)) !== -1) {
        // Check if this is a word boundary (not part of a larger word)
        const charBefore = matchIndex > 0 ? text[matchIndex - 1] : ' ';
        const charAfter = matchIndex + entityText.length < text.length ? text[matchIndex + entityText.length] : ' ';
        
        // Check if surrounded by word boundaries
        const isWordBoundary = /[\s\-.,;:\()\[\]!?]|^|$/.test(charBefore) && /[\s\-.,;:\()\[\]!?]|^|$/.test(charAfter);
        
        if (isWordBoundary) {
          // Create highlight
          const beforeNode = document.createTextNode(text.substring(0, matchIndex));
          const highlightedText = text.substring(matchIndex, matchIndex + entityText.length);
          const afterNode = document.createTextNode(text.substring(matchIndex + entityText.length));
          
          const highlight = document.createElement('span');
          highlight.className = 'ai-highlight';
          highlight.setAttribute('data-category', category);
          highlight.textContent = highlightedText;
          highlight.title = `${category}: ${entityText}`;
          
          const parent = textNode.parentNode;
          parent.insertBefore(beforeNode, textNode);
          parent.insertBefore(highlight, textNode);
          parent.insertBefore(afterNode, textNode);
          parent.removeChild(textNode);
          
          highlightCount++;
          searchIndex = matchIndex + entityText.length;
          
          // Return early to avoid modifying the same node again
          return;
        } else {
          searchIndex = matchIndex + 1;
        }
      }
    });
  });
  
  // Add legend
  const legend = document.createElement('div');
  legend.className = 'entity-legend';
  let legendHTML = '<strong>Entity Categories:</strong><br>';
  
  Object.entries(categoryColors).forEach(([category, color]) => {
    const displayName = categoryDisplayNames[category] || category;
    legendHTML += `<div class="entity-legend-item"><div class="entity-legend-color" style="background-color: ${color}"></div>${displayName}</div>`;
  });
  
  legend.innerHTML = legendHTML;
  document.body.appendChild(legend);
  
  return highlightCount;
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
