// Content script to highlight important text on the page

// Remove existing highlights
function removeHighlights() {
  const existingHighlights = document.querySelectorAll('.ai-highlight');
  existingHighlights.forEach(el => {
    const parent = el.parentNode;
    parent.replaceChild(document.createTextNode(el.textContent), el);
    parent.normalize();
  });
  
  // Remove highlight styles
  const styleEl = document.getElementById('ai-highlight-styles');
  if (styleEl) {
    styleEl.remove();
  }
}

// Highlight text on the page
function highlightText(sentences) {
  if (!sentences || sentences.length === 0) {
    return { success: false, message: 'No sentences to highlight' };
  }
  
  // Remove any existing highlights first
  removeHighlights();
  
  // Add styles for highlighting
  if (!document.getElementById('ai-highlight-styles')) {
    const style = document.createElement('style');
    style.id = 'ai-highlight-styles';
    style.textContent = `
      .ai-highlight {
        background-color: #ffeb3b !important;
        padding: 2px 0 !important;
        border-radius: 2px !important;
        box-shadow: 0 0 0 2px rgba(255, 235, 59, 0.3) !important;
        transition: background-color 0.3s ease !important;
      }
      .ai-highlight:hover {
        background-color: #fdd835 !important;
      }
    `;
    document.head.appendChild(style);
  }
  
  let highlightCount = 0;
  
  // Process each sentence
  sentences.forEach(sentence => {
    const cleanSentence = sentence.trim();
    if (cleanSentence.length < 20) return;
    
    // Find all text nodes in the document
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // Skip if parent is script, style, or already highlighted
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          const tagName = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript', 'iframe'].includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          if (parent.classList.contains('ai-highlight')) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Skip image captions and photo credits
          if (tagName === 'figcaption') {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Check parent classes for caption/image related terms
          const className = parent.className.toLowerCase();
          const parentId = parent.id.toLowerCase();
          
          if (className.includes('caption') || 
              className.includes('credit') || 
              className.includes('photo') ||
              className.includes('image') ||
              className.includes('getty') ||
              className.includes('figure') ||
              parentId.includes('caption') ||
              parentId.includes('credit')) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Check if parent is inside a figure tag
          let ancestor = parent;
          while (ancestor && ancestor !== document.body) {
            if (ancestor.tagName && ancestor.tagName.toLowerCase() === 'figure') {
              return NodeFilter.FILTER_REJECT;
            }
            ancestor = ancestor.parentElement;
          }
          
          // Skip very short text that might be captions (less than 50 chars alone)
          const text = node.textContent.trim();
          if (text.length < 50 && parent.textContent.trim().length < 100) {
            // Check if this looks like a caption pattern
            if (/^[A-Z][^.]+\s+(at|in|during|on)\s+/i.test(text)) {
              return NodeFilter.FILTER_REJECT;
            }
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
    
    // Search for the sentence in text nodes
    textNodes.forEach(textNode => {
      const text = textNode.textContent;
      
      // Try multiple matching strategies
      let found = false;
      
      // Strategy 1: Try exact match (case insensitive)
      const cleanSentenceLower = cleanSentence.toLowerCase();
      const textLower = text.toLowerCase();
      
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
        if (highlightCount === 1) {
          highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        found = true;
        return;
      }
      
      // Strategy 2: Try matching key phrases (first 50+ characters)
      if (!found && cleanSentence.length > 50) {
        const keyPhrase = cleanSentence.substring(0, 60).toLowerCase();
        const keyPhraseIndex = textLower.indexOf(keyPhrase);
        
        if (keyPhraseIndex !== -1) {
          // Find the full sentence in the original text
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
          if (highlightCount === 1) {
            highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          found = true;
        }
      }
    });
  });
  
  return { 
    success: true, 
    count: highlightCount,
    message: highlightCount > 0 
      ? `Highlighted ${highlightCount} key sentence${highlightCount !== 1 ? 's' : ''}`
      : 'Could not find matching text to highlight'
  };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'highlight') {
    const result = highlightText(request.sentences);
    sendResponse(result);
  } else if (request.action === 'removeHighlights') {
    removeHighlights();
    sendResponse({ success: true, message: 'Highlights removed' });
  }
  return true;
});
