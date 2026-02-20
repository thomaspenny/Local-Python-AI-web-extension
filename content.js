// Content script to highlight important text on the page

// Color mapping for different entity categories
const categoryColors = {
  'person': '#FF6B6B',           // Red
  'organization': '#4ECDC4',     // Teal
  'address/location': '#FFE66D', // Yellow
  'event': '#95E1D3',            // Mint
  'property': '#C7CEEA',         // Lavender
  'vehicle': '#FFDAC1'           // Peach
};

// Display names for categories
const categoryDisplayNames = {
  'person': 'Person',
  'organization': 'Organization',
  'address/location': 'Address/Location',
  'event': 'Event',
  'property': 'Property',
  'vehicle': 'Vehicle'
};

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

// Highlight entities with color coding based on category
function highlightEntities(entities) {
  if (!entities || entities.length === 0) {
    return { success: false, message: 'No entities to highlight' };
  }
  
  // Remove any existing highlights first
  removeHighlights();
  
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
    const color = categoryColors[category] || '#CCCCCC';
    
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
  
  return { 
    success: true, 
    count: highlightCount,
    message: highlightCount > 0 
      ? `Highlighted ${highlightCount} entit${highlightCount !== 1 ? 'ies' : 'y'}`
      : 'Could not find matching entities to highlight'
  };
}

// Highlight text on the page (for sentence highlighting)
// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'highlightEntities') {
    const result = highlightEntities(request.entities);
    sendResponse(result);
  } else if (request.action === 'removeHighlights') {
    removeHighlights();
    sendResponse({ success: true, message: 'Highlights removed' });
  }
  return true;
});
