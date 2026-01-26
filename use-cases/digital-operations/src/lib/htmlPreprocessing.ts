/**
 * HTML Preprocessing Utilities
 * 
 * This module provides utilities for preprocessing HTML content,
 * particularly for cleaning and validating iframe srcdoc attributes.
 */

/**
 * Validates if a string is valid HTML
 */
function isValidHtml(html: string): boolean {
  if (!html || html.trim().length === 0) {
    return false;
  }
  
  // Check for basic HTML structure
  const hasOpeningTag = /<[a-zA-Z][^>]*>/i.test(html);
  
  // If it doesn't have basic HTML tags, it's not valid
  if (!hasOpeningTag) {
    return false;
  }
  
  // Try parsing with DOMParser (browser-side validation)
  if (typeof window !== 'undefined' && window.DOMParser) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      // Check if there are parser errors
      const parserErrors = doc.getElementsByTagName('parsererror');
      if (parserErrors.length > 0) {
        return false;
      }
    } catch {
      return false;
    }
  }
  
  return true;
}

/**
 * Removes JavaScript comments from code
 * Handles both single-line (//) and multi-line (/* *\/) comments
 * Preserves comments inside strings
 */
function removeJavaScriptComments(code: string): string {
  let result = '';
  let i = 0;
  let inString = false;
  let stringChar = '';
  let inSingleLineComment = false;
  let inMultiLineComment = false;
  
  while (i < code.length) {
    const char = code[i];
    const nextChar = code[i + 1];
    
    // Handle string boundaries
    if (!inSingleLineComment && !inMultiLineComment) {
      if ((char === '"' || char === "'" || char === '`') && (i === 0 || code[i - 1] !== '\\')) {
        if (!inString) {
          inString = true;
          stringChar = char;
          result += char;
          i++;
          continue;
        } else if (char === stringChar) {
          inString = false;
          stringChar = '';
          result += char;
          i++;
          continue;
        }
      }
    }
    
    // If we're in a string, just append and continue
    if (inString) {
      result += char;
      i++;
      continue;
    }
    
    // Handle multi-line comment start
    if (!inSingleLineComment && !inMultiLineComment && char === '/' && nextChar === '*') {
      inMultiLineComment = true;
      i += 2;
      continue;
    }
    
    // Handle multi-line comment end
    if (inMultiLineComment && char === '*' && nextChar === '/') {
      inMultiLineComment = false;
      i += 2;
      continue;
    }
    
    // Handle single-line comment start
    if (!inSingleLineComment && !inMultiLineComment && char === '/' && nextChar === '/') {
      inSingleLineComment = true;
      i += 2;
      continue;
    }
    
    // Handle single-line comment end (newline)
    if (inSingleLineComment && (char === '\n' || char === '\r')) {
      inSingleLineComment = false;
      result += char; // Keep the newline
      i++;
      continue;
    }
    
    // Skip characters that are part of comments
    if (inSingleLineComment || inMultiLineComment) {
      i++;
      continue;
    }
    
    // Regular character - append it
    result += char;
    i++;
  }
  
  return result;
}

/**
 * Wraps script content in an IIFE if not already wrapped
 */
function wrapScriptInIIFE(scriptContent: string): string {
  const trimmed = scriptContent.trim();
  
  // Skip if empty or just whitespace
  if (!trimmed) {
    return scriptContent;
  }
  
  // More flexible IIFE detection patterns
  // Pattern 1: Standard IIFE - (function() { ... })();
  // Pattern 2: IIFE with parameters - (function(param) { ... })(arg);
  // Pattern 3: Named IIFE - (function name() { ... })();
  
  // Check if starts with IIFE pattern
  const startsWithIIFE = /^\s*\(function\s*[a-zA-Z0-9_]*\s*\([^)]*\)\s*\{/i.test(trimmed);
  
  // Check if ends with IIFE closing pattern
  const endsWithIIFE = /\}\s*\)\s*\([^)]*\)\s*;?\s*$/i.test(trimmed);
  
  // If both conditions are met, it's already wrapped
  if (startsWithIIFE && endsWithIIFE) {
    return scriptContent;
  }
  
  // Additional check: Look for arrow function IIFE
  // (() => { ... })();
  const startsWithArrowIIFE = /^\s*\(\s*\([^)]*\)\s*=>\s*\{/i.test(trimmed);
  const endsWithArrowIIFE = /\}\s*\)\s*\([^)]*\)\s*;?\s*$/i.test(trimmed);
  
  if (startsWithArrowIIFE && endsWithArrowIIFE) {
    return scriptContent;
  }
  
  // Wrap in IIFE
  return `(function() { ${scriptContent} })();`;
}

/**
 * Processes script tags in HTML content to wrap them in IIFEs
 */
function processScriptTags(html: string): string {
  // Match script tags without src attribute (inline scripts only)
  return html.replace(
    /<script([^>]*?)>([\s\S]*?)<\/script>/gi,
    (_match, attributes, content) => {
      // Skip if script has src attribute (external script)
      if (/\bsrc\s*=/i.test(attributes)) {
        return _match;
      }
      
      // Skip if script has type="module" (modules have their own scope)
      if (/\btype\s*=\s*["']module["']/i.test(attributes)) {
        return _match;
      }
      
      // Remove JavaScript comments first (before IIFE wrapping)
      const contentWithoutComments = removeJavaScriptComments(content);
      
      // Wrap the content in an IIFE
      const wrappedContent = wrapScriptInIIFE(contentWithoutComments);
      return `<script${attributes}>${wrappedContent}</script>`;
    }
  );
}

/**
 * Injects auto-resize script into HTML content for iframes
 * This script calculates the content height and sets it on the parent iframe element
 * Each iframe's script runs independently and only modifies its own container
 * Also wraps content in a container with 300px minimum width for horizontal scrolling
 * Includes a loading indicator that shows until content is ready
 */
function injectAutoResizeScript(html: string): string {
  // Use a minified version with escaped quotes for srcdoc compatibility
  // All double quotes are escaped as &quot; and single quotes as &#39;
  // Force body to not expand to viewport height, then measure actual content height
  // Added safeguards to prevent infinite resize loops
  // Preserves width when updating height to prevent layout issues
  const resizeScript = `<script>(function(){document.documentElement.style.height=&quot;auto&quot;;document.body.style.height=&quot;auto&quot;;var lastHeight=0;var resizeCount=0;var maxResizes=20;var ro=null;function resize(){if(resizeCount>=maxResizes){if(ro){ro.disconnect();ro=null;}return;}var h=Math.max(document.body.scrollHeight,document.body.offsetHeight,document.documentElement.scrollHeight,document.documentElement.offsetHeight);var diff=Math.abs(h-lastHeight);if(diff>5&&window.frameElement){resizeCount++;lastHeight=h;var w=window.frameElement.style.width||window.frameElement.getAttribute(&quot;width&quot;)||&quot;100%&quot;;window.frameElement.setAttribute(&quot;style&quot;,&quot;width:&quot;+w+&quot;;height:&quot;+h+&quot;px&quot;);console.log(&quot;Iframe resized to:&quot;,w,&quot;x&quot;,h+&quot;px&quot;,&quot;(count:&quot;+resizeCount+&quot;)&quot;);if(resizeCount>=maxResizes&&ro){console.warn(&quot;Max resizes reached, disconnecting observer&quot;);ro.disconnect();ro=null;}}}if(document.readyState===&quot;loading&quot;){document.addEventListener(&quot;DOMContentLoaded&quot;,resize);}else{resize();}window.addEventListener(&quot;load&quot;,function(){resize();setTimeout(function(){if(ro){ro.disconnect();ro=null;}},2000);});if(typeof ResizeObserver!==&quot;undefined&quot;){ro=new ResizeObserver(function(){setTimeout(resize,100);});ro.observe(document.body);}var c=0;var i=setInterval(function(){resize();c++;if(c>5){clearInterval(i);}},150);})();</script>`;
  
  // Inject styles for minimum width and horizontal scrolling
  // Use character codes to avoid markdown parser interpreting the asterisk
  // String.fromCharCode(42) = '*'
  const scrollStylesScript = `<script>(function(){var s=document.createElement(&quot;style&quot;);s.textContent=&quot;body{overflow-x:auto;margin:0;}body&gt;&quot;+String.fromCharCode(42)+&quot;{min-width:300px;}&quot;;document.head.appendChild(s);})();</script>`;
  
  let result = html;
  
  // Insert style script in the head if it exists, otherwise before body
  if (/<\/head>/i.test(result)) {
    result = result.replace(/<\/head>/i, `${scrollStylesScript}</head>`);
  } else if (/<body/i.test(result)) {
    result = result.replace(/<body/i, `${scrollStylesScript}<body`);
  } else {
    result = scrollStylesScript + result;
  }
  
  // Insert the resize script before the closing </body> tag, or at the end if no body tag
  if (/<\/body>/i.test(result)) {
    return result.replace(/<\/body>/i, `${resizeScript}</body>`);
  } else if (/<\/html>/i.test(result)) {
    return result.replace(/<\/html>/i, `${resizeScript}</html>`);
  } else {
    return result + resizeScript;
  }
}

/**
 * Preprocesses text content to clean iframe srcdoc attributes.
 * Removes all formatting (newlines, extra spaces) from srcdoc strings.
 * Validates HTML content and replaces invalid HTML with a dummy value.
 * During streaming, replaces incomplete iframes with a loading indicator.
 * Wraps inline script tags in IIFEs for proper execution in iframe context.
 * Injects auto-resize script to make iframes flex to their content height.
 * Injects chat session ID into map iframe src attributes.
 * 
 * @param content - The HTML content to preprocess
 * @param chatSessionId - The chat session ID to inject into map iframes
 */
export function preprocessContent(content: string, chatSessionId: string): string {

  if (typeof content !== 'string') {
    return content;
  }
  
  const dummyHtml = '<html><body><p>Invalid HTML content</p></body></html>';
  const loadingHtml = "<html><body style='display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;'><div style='text-align:center;'><div style='border:3px solid #f3f3f3;border-top:3px solid #3498db;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite;margin:0 auto 10px;'></div><p style='color:#666;'>Loading...</p></div><style>@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}</style></body></html>";
  
  let result = '';
  let position = 0;
  
  // Find all <iframe tags
  const iframeStartRegex = /<iframe/gi;
  let match;
  
  while ((match = iframeStartRegex.exec(content)) !== null) {
    const iframeStart = match.index;
    
    // Add content before this iframe
    result += content.substring(position, iframeStart);
    
    // Find the end of the opening tag, respecting quoted attributes
    let searchPos = iframeStart + 7; // length of "<iframe"
    let tagEnd = -1;
    let isSelfClosing = false;
    let inQuote = false;
    let quoteChar = '';
    
    // Parse through the tag, respecting quotes
    for (let i = searchPos; i < content.length; i++) {
      const char = content[i];
      
      // Handle quotes
      if ((char === '"' || char === "'") && (i === 0 || content[i - 1] !== '\\')) {
        if (!inQuote) {
          inQuote = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuote = false;
          quoteChar = '';
        }
      }
      
      // Only look for tag end when not inside quotes
      if (!inQuote && char === '>') {
        tagEnd = i + 1;
        // Check if it's self-closing
        if (i > 0 && content[i - 1] === '/') {
          isSelfClosing = true;
        }
        break;
      }
    }
    
    // If we couldn't find the end of the tag, treat as incomplete
    if (tagEnd === -1) {
      console.log('Detected incomplete iframe during streaming, replacing with loading indicator');
      result += `<iframe width="100%" srcdoc="${loadingHtml}"/>`;
      position = content.length;
      break;
    }
    
    // Handle self-closing iframe
    if (isSelfClosing) {
      const iframeContent = content.substring(iframeStart, tagEnd);
      
      // Process self-closing iframe
      const processed = iframeContent.replace(
        /^(<iframe)([\s\S]*?)(srcdoc=(["']))([\s\S]*?)(\4)([\s\S]*?)(\/?>)$/i,
        (_match, iframeTag, beforeSrcdoc, srcdocStart, _quote, srcdocContent, srcdocEnd, afterSrcdoc, closeTag) => {
          // Process script tags BEFORE removing newlines
          const processedSrcdoc = processScriptTags(srcdocContent);
          
          // Inject auto-resize script
          const withAutoResize = injectAutoResizeScript(processedSrcdoc);
          console.log('Injected auto-resize script into self-closing iframe srcdoc');
          
          // Clean whitespace and compress
          const cleanedSrcdoc = withAutoResize
            .replace(/\n/g, '')
            .replace(/\r/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          
          // Validate HTML
          if (!isValidHtml(cleanedSrcdoc)) {
            console.warn('Invalid HTML detected in self-closing iframe srcdoc, replacing with dummy value');
            return `${iframeTag}${beforeSrcdoc}${srcdocStart}${dummyHtml}${srcdocEnd}${afterSrcdoc}/>`;
          }
          
          // Remove height attribute and clean styles
          const cleanAttributes = (attrs: string) => {
            return attrs
              .replace(/\s+height\s*=\s*["'][^"']*["']/gi, '')
              .replace(/\s+style\s*=\s*["']([^"']*)["']/gi, (_match, styleContent) => {
                const cleanedStyle = styleContent.replace(/height\s*:\s*[^;]+;?/gi, '').trim();
                return cleanedStyle ? ` style="${cleanedStyle}"` : '';
              });
          };
          
          const attributesBefore = cleanAttributes(beforeSrcdoc);
          let attributesAfter = cleanAttributes(afterSrcdoc);
          
          // Add sandbox attribute if not present
          const allAttributes = attributesBefore + attributesAfter;
          if (!/sandbox=/i.test(allAttributes)) {
            attributesAfter += ' sandbox="allow-scripts allow-same-origin"';
          }
          
          return `${iframeTag}${attributesBefore}${srcdocStart}${cleanedSrcdoc}${srcdocEnd}${attributesAfter}/>`;
        }
      );
      
      result += processed;
      position = tagEnd;
      continue;
    }
    
    // Not self-closing, find the closing </iframe> tag
    let depth = 1;
    let iframeEnd = -1;
    
    // Start searching after the opening tag
    searchPos = tagEnd;
    
    // Look for the matching closing tag, handling nested iframes
    while (searchPos < content.length && depth > 0) {
      const nextOpen = content.indexOf('<iframe', searchPos);
      const nextClose = content.indexOf('</iframe>', searchPos);
      
      if (nextClose === -1) {
        // No closing tag found - incomplete iframe
        break;
      }
      
      if (nextOpen !== -1 && nextOpen < nextClose) {
        // Found a nested opening tag
        depth++;
        searchPos = nextOpen + 7;
      } else {
        // Found a closing tag
        depth--;
        if (depth === 0) {
          iframeEnd = nextClose + 9; // Include the </iframe> tag
        }
        searchPos = nextClose + 9;
      }
    }
    
    // Extract the iframe content
    const iframeContent = iframeEnd === -1 
      ? content.substring(iframeStart) 
      : content.substring(iframeStart, iframeEnd);
    
    // Check if iframe is complete
    const isComplete = iframeEnd !== -1;
    
    if (!isComplete) {
      console.log('Detected incomplete iframe during streaming, replacing with loading indicator');
      result += `<iframe width="100%" srcdoc="${loadingHtml}"/>`;
      position = iframeStart + iframeContent.length;
      break; // Stop processing, rest of content is incomplete
    }
    
    // Process complete iframe
    const processed = iframeContent.replace(
      /^(<iframe)([\s\S]*?)(srcdoc=(["']))([\s\S]*?)(\4)([\s\S]*?)(>)([\s\S]*?)(<\/iframe>)$/i,
      (_match, iframeTag, beforeSrcdoc, srcdocStart, _quote, srcdocContent, srcdocEnd, afterSrcdoc, openClose, innerContent, closeTag) => {
        // IMPORTANT: Process script tags BEFORE removing newlines
        // This allows comment removal to work correctly (single-line comments end at newlines)
        const processedSrcdoc = processScriptTags(srcdocContent);
        
        // Inject auto-resize script
        const withAutoResize = injectAutoResizeScript(processedSrcdoc);
        console.log('Injected auto-resize script into iframe srcdoc');
        
        // Now clean whitespace and compress
        const cleanedSrcdoc = withAutoResize
          .replace(/\n/g, '')
          .replace(/\r/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Validate HTML
        if (!isValidHtml(cleanedSrcdoc)) {
          console.warn('Invalid HTML detected in srcdoc, replacing with dummy value');
          return `${iframeTag}${beforeSrcdoc}${srcdocStart}${dummyHtml}${srcdocEnd}${afterSrcdoc}${openClose}${closeTag}`;
        }
        
        // Remove height attribute from both before and after srcdoc
        // Also remove any inline height styles
        const cleanAttributes = (attrs: string) => {
          return attrs
            .replace(/\s+height\s*=\s*["'][^"']*["']/gi, '')
            .replace(/\s+style\s*=\s*["']([^"']*)["']/gi, (_match, styleContent) => {
              // Remove height from inline styles
              const cleanedStyle = styleContent.replace(/height\s*:\s*[^;]+;?/gi, '').trim();
              return cleanedStyle ? ` style="${cleanedStyle}"` : '';
            });
        };
        
        const attributesBefore = cleanAttributes(beforeSrcdoc);
        let attributesAfter = cleanAttributes(afterSrcdoc);
        
        // Add sandbox attribute with allow-scripts and allow-same-origin if not present
        const allAttributes = attributesBefore + attributesAfter;
        if (!/sandbox=/i.test(allAttributes)) {
          attributesAfter += ' sandbox="allow-scripts allow-same-origin"';
        }
        
        return `${iframeTag}${attributesBefore}${srcdocStart}${cleanedSrcdoc}${srcdocEnd}${attributesAfter}${openClose}${closeTag}`;
      }
    );
    
    result += processed;
    position = iframeEnd;
  }
  
  // Add any remaining content after the last iframe
  result += content.substring(position);
  
  // Inject chat session ID into map iframe src attributes
  // Match iframes with src="/map" (with or without query parameters)
  result = result.replace(
    /<iframe([^>]*)\ssrc=(["'])\/map(\?[^"']*)?(\2)([^>]*)>/gi,
    (_match, beforeSrc, quote, existingQuery, _closeQuote, afterSrc) => {
      // Check if chatSessionId is already in the query string
      if (existingQuery && existingQuery.includes('chatSessionId=')) {
        return _match; // Already has chatSessionId, don't modify
      }
      
      // Build the new src with chatSessionId
      const separator = existingQuery ? '&' : '?';
      const newSrc = `/map${existingQuery || ''}${separator}chatSessionId=${encodeURIComponent(chatSessionId)}`;
      
      return `<iframe${beforeSrc} src=${quote}${newSrc}${quote}${afterSrc}>`;
    }
  );
  
  return result;
}
