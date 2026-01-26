# Plotting and Visualization Developer Guide

## Overview

This application supports rich data visualizations through HTML iframes with embedded JavaScript charting libraries. The system automatically processes and optimizes these visualizations for proper rendering, security, and responsive behavior.

## Table of Contents

1. [How Plotting Works](#how-plotting-works)
2. [Supported Visualization Libraries](#supported-visualization-libraries)
3. [Creating Visualizations](#creating-visualizations)
4. [HTML Preprocessing Pipeline](#html-preprocessing-pipeline)
5. [Troubleshooting](#troubleshooting)
6. [Testing](#testing)
7. [Best Practices](#best-practices)
8. [Common Issues and Solutions](#common-issues-and-solutions)

---

## How Plotting Works

### Architecture

```
AI Response (Markdown + HTML)
    ↓
Response Component (src/components/ai-elements/response.tsx)
    ↓
preprocessContent() (src/lib/htmlPreprocessing.ts)
    ↓
Processed HTML with optimized iframes
    ↓
Streamdown Renderer
    ↓
Browser renders interactive charts
```

### Key Components

1. **Response Component** (`src/components/ai-elements/response.tsx`)
   - Receives AI-generated content (text + HTML)
   - Calls `preprocessContent()` on string content
   - Passes processed content to Streamdown renderer

2. **HTML Preprocessing** (`src/lib/htmlPreprocessing.ts`)
   - Detects and processes iframe tags
   - Compresses HTML content
   - Injects security and functionality scripts
   - Handles incomplete iframes during streaming

3. **Streamdown Renderer**
   - Renders markdown and HTML content
   - Supports streaming updates
   - Displays processed iframes

---

## Supported Visualization Libraries

### Plotly.js (Recommended)

**Why Plotly?**
- Rich interactive charts (line, bar, scatter, pie, gauge, etc.)
- Responsive by default
- No external dependencies beyond the CDN script
- Excellent for scientific and business visualizations

**CDN Link:**
```html
<script src='https://cdn.plot.ly/plotly-2.27.0.min.js'></script>
```

**Example Usage:**
```javascript
Plotly.newPlot('chart', [trace1, trace2], layout, {responsive: true});
```

### Other Libraries

The system supports any JavaScript visualization library that can run in an iframe:
- Chart.js
- D3.js
- ECharts
- Highcharts
- Custom canvas/SVG visualizations

---

## Creating Visualizations

### Basic Template

```html
<iframe srcdoc="<!DOCTYPE html>
<html>
<head>
<script src='https://cdn.plot.ly/plotly-2.27.0.min.js'></script>
<style>
  body { margin: 0; padding: 10px; font-family: Arial; }
</style>
</head>
<body>
<div id='chart' style='width:100%; height:400px;'></div>
<script>
// Your chart code here
const data = [{
  x: [1, 2, 3, 4, 5],
  y: [10, 15, 13, 17, 20],
  type: 'scatter',
  mode: 'lines+markers',
  name: 'Series 1'
}];

const layout = {
  title: 'My Chart',
  xaxis: { title: 'X Axis' },
  yaxis: { title: 'Y Axis' }
};

Plotly.newPlot('chart', data, layout, {responsive: true});
</script>
</body>
</html>" style="width:100%; height:450px; border:none;"></iframe>
```

### Important Notes

1. **Don't specify iframe height in the tag** - The preprocessing system removes it and adds auto-resize functionality
2. **Use single quotes** for HTML attributes inside srcdoc to avoid escaping issues
3. **Keep scripts inline** - External script sources are fine, but chart code should be inline
4. **Use responsive: true** - For Plotly charts to adapt to container size

### Multi-Chart Dashboard Example

```html
<iframe srcdoc="<!DOCTYPE html>
<html>
<head>
<script src='https://cdn.plot.ly/plotly-2.27.0.min.js'></script>
<style>
  body { margin: 0; padding: 10px; font-family: Arial; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
  .chart { background: white; border-radius: 8px; padding: 10px; }
</style>
</head>
<body>
<div class='grid'>
  <div id='chart1' class='chart' style='height:300px;'></div>
  <div id='chart2' class='chart' style='height:300px;'></div>
</div>
<script>
// Chart 1
Plotly.newPlot('chart1', [{
  x: ['A', 'B', 'C'],
  y: [10, 20, 15],
  type: 'bar'
}], {title: 'Chart 1'}, {responsive: true});

// Chart 2
Plotly.newPlot('chart2', [{
  values: [30, 40, 30],
  labels: ['X', 'Y', 'Z'],
  type: 'pie'
}], {title: 'Chart 2'}, {responsive: true});
</script>
</body>
</html>" style="width:100%; border:none;"></iframe>
```

---

## HTML Preprocessing Pipeline

### What Happens to Your Iframe

When you create an iframe with srcdoc content, the `preprocessContent()` function automatically:

#### 1. **Detects Complete vs Incomplete Iframes**
- Complete: Has closing `</iframe>` tag
- Incomplete: Missing closing tag (during streaming)

#### 2. **For Complete Iframes:**

**a. Script Processing**
- Removes JavaScript comments (single-line `//` and multi-line `/* */`)
- Wraps inline scripts in IIFEs to prevent variable conflicts
- Preserves external script sources

**Before:**
```javascript
<script>
const data = [1, 2, 3];
Plotly.newPlot('chart', data);
</script>
```

**After:**
```javascript
<script>(function() { const data = [1, 2, 3]; Plotly.newPlot('chart', data); })();</script>
```

**b. Auto-Resize Injection**
- Injects a script that measures content height
- Automatically adjusts iframe height to fit content
- Prevents scrollbars and layout issues
- Uses ResizeObserver for dynamic content

**c. Horizontal Scroll Support**
- Adds minimum width constraint (300px)
- Enables horizontal scrolling for wide content
- Prevents content from being cut off

**d. Whitespace Compression**
- Removes all newlines (`\n`, `\r`)
- Compresses multiple spaces to single space
- Reduces payload size significantly

**e. Security Hardening**
- Adds `sandbox="allow-scripts allow-same-origin"` attribute
- Removes height attributes from iframe tag
- Validates HTML structure

#### 3. **For Incomplete Iframes:**
- Replaces with loading indicator
- Shows animated spinner
- Prevents broken HTML from displaying

### Processing Example

**Input (Original):**
```html
<iframe srcdoc="<!DOCTYPE html>
<html>
<head>
<script src='https://cdn.plot.ly/plotly-2.27.0.min.js'></script>
<style>body { margin: 0; }</style>
</head>
<body>
<div id='chart'></div>
<script>
// Create chart
Plotly.newPlot('chart', [{x: [1,2,3], y: [4,5,6]}]);
</script>
</body>
</html>" style="width:100%; height:400px; border:none;"></iframe>
```

**Output (Processed):**
```html
<iframe srcdoc="<!DOCTYPE html><html><head><script src='https://cdn.plot.ly/plotly-2.27.0.min.js'></script><style>body { margin: 0; }</style><script>(function(){var s=document.createElement(&quot;style&quot;);s.textContent=&quot;body{overflow-x:auto;margin:0;}body&gt;*{min-width:300px;}&quot;;document.head.appendChild(s);})();</script></head><body><div id='chart'></div><script>(function() { Plotly.newPlot('chart', [{x: [1,2,3], y: [4,5,6]}]); })();</script><script>(function(){document.documentElement.style.height=&quot;auto&quot;;...auto-resize code...})();</script></body></html>" style="width:100%; border:none;" sandbox="allow-scripts allow-same-origin"></iframe>
```

**Changes Applied:**
- ✅ Newlines removed
- ✅ Whitespace compressed
- ✅ Height attribute removed
- ✅ Sandbox attribute added
- ✅ Auto-resize script injected
- ✅ Horizontal scroll support added
- ✅ Chart script wrapped in IIFE

---

## Troubleshooting

### Common Issues

#### 1. Chart Not Displaying

**Symptoms:**
- Blank iframe
- Console errors about undefined variables
- "Loading..." indicator stuck

**Diagnosis:**
```bash
# Check browser console for errors
# Look for:
# - Script loading failures
# - Plotly undefined errors
# - CORS issues
```

**Solutions:**
- Verify CDN script URL is correct and accessible
- Check that chart container div has an ID
- Ensure Plotly.newPlot is called after DOM is ready
- Verify data format matches Plotly expectations

#### 2. Iframe Height Issues

**Symptoms:**
- Content cut off
- Excessive white space
- Scrollbars appearing

**Diagnosis:**
```bash
# Check processed HTML
npx tsx scripts/testHtmlPreprocessing.ts
```

**Solutions:**
- Don't specify height in iframe tag (it's removed automatically)
- Let auto-resize handle height
- Check that content has measurable height
- Verify ResizeObserver is working (check console logs)

#### 3. Variable Conflicts

**Symptoms:**
- Charts overwriting each other
- Unexpected behavior with multiple charts
- Console errors about redeclared variables

**Diagnosis:**
- Check if variables are declared with `const`/`let` (good) or `var` (problematic)
- Look for global variable pollution

**Solutions:**
- The IIFE wrapping should prevent this automatically
- If issues persist, use unique variable names
- Verify preprocessing is working correctly

#### 4. Incomplete Iframe During Streaming

**Symptoms:**
- Loading indicator appears
- Chart doesn't render
- Content seems truncated

**Diagnosis:**
- This is expected during streaming
- Check if closing `</iframe>` tag is present

**Solutions:**
- Wait for streaming to complete
- The loading indicator will be replaced automatically
- If stuck, check network tab for streaming issues

#### 5. Sandbox Security Errors

**Symptoms:**
- Console errors about blocked scripts
- Features not working (localStorage, etc.)

**Diagnosis:**
- Check sandbox attribute value
- Look for security-related console errors

**Solutions:**
- The default `sandbox="allow-scripts allow-same-origin"` should work for most cases
- If you need additional permissions, modify the preprocessing logic
- Be cautious about security implications

---

## Testing

### Automated Testing

The project includes a comprehensive test suite for the preprocessing functionality.

#### Running Tests

```bash
# Run the HTML preprocessing test
npx tsx scripts/testHtmlPreprocessing.ts
```

#### Test Coverage

The test validates:
1. ✅ Iframe count preservation
2. ✅ Complete iframe processing
3. ✅ Incomplete iframe replacement
4. ✅ Height attribute removal
5. ✅ Sandbox attribute addition
6. ✅ Newline removal from srcdoc
7. ✅ Auto-resize script injection
8. ✅ Script IIFE wrapping

#### Expected Output

```
================================================================================
HTML Preprocessing Test
================================================================================

📄 Reading sample file: tmp/sample_message.md

📊 Original content stats:
   - Total length: 14515 characters
   - Iframe count: 6

...

================================================================================
Test Results Summary
================================================================================

✓ PASS - Iframe count preserved
✓ PASS - Complete iframes processed correctly
✓ PASS - Incomplete iframes replaced with loading
✓ PASS - No height attributes on processed iframes
✓ PASS - Complete iframes have sandbox attribute
✓ PASS - Newlines removed from complete iframe srcdoc
✓ PASS - Auto-resize script injected in complete iframes
✓ PASS - Scripts wrapped in IIFE in complete iframes

────────────────────────────────────────────────────────────────────────────────
Final Score: 8/8 tests passed

🎉 All tests passed!
```

### Manual Testing

#### 1. Create Test Content

Create a file `tmp/test_chart.md`:

```markdown
Here's a test chart:

<iframe srcdoc="<!DOCTYPE html>
<html>
<head>
<script src='https://cdn.plot.ly/plotly-2.27.0.min.js'></script>
</head>
<body>
<div id='chart' style='width:100%; height:300px;'></div>
<script>
Plotly.newPlot('chart', [{
  x: [1, 2, 3, 4, 5],
  y: [1, 4, 9, 16, 25],
  type: 'scatter'
}], {title: 'Test Chart'}, {responsive: true});
</script>
</body>
</html>" style="width:100%; height:350px; border:none;"></iframe>
```

#### 2. Test Preprocessing

```typescript
import { preprocessContent } from './src/lib/htmlPreprocessing';
import * as fs from 'fs';

const content = fs.readFileSync('tmp/test_chart.md', 'utf-8');
const processed = preprocessContent(content);

console.log('Original length:', content.length);
console.log('Processed length:', processed.length);
console.log('Has sandbox:', processed.includes('sandbox='));
console.log('Has auto-resize:', processed.includes('frameElement'));
```

#### 3. Visual Testing

1. Copy processed content to a test page
2. Open in browser
3. Verify:
   - Chart renders correctly
   - No scrollbars (unless content is wide)
   - Iframe height matches content
   - Responsive behavior works

### Testing New Visualizations

When adding new chart types or libraries:

1. **Create sample content** in `tmp/` directory
2. **Run preprocessing test** to verify processing
3. **Check browser console** for errors
4. **Verify responsive behavior** by resizing window
5. **Test on multiple browsers** (Chrome, Firefox, Safari)
6. **Check mobile rendering** if applicable

---

## Best Practices

### 1. Chart Design

✅ **DO:**
- Use responsive: true for Plotly charts
- Set explicit width/height on chart containers (not iframe)
- Use relative units (%, vh, vw) for flexibility
- Test with different data sizes
- Include loading states for async data

❌ **DON'T:**
- Set fixed pixel widths that don't scale
- Use height attribute on iframe tag
- Rely on global variables
- Include sensitive data in client-side code
- Use external scripts that might be blocked

### 2. Performance

✅ **DO:**
- Minimize data points for large datasets
- Use data aggregation/sampling for performance
- Lazy load charts when possible
- Cache processed content when appropriate
- Use CDN for libraries

❌ **DON'T:**
- Render thousands of data points without optimization
- Include large inline data (use external sources)
- Create too many charts on one page
- Use heavy animations unnecessarily

### 3. Code Organization

✅ **DO:**
- Keep chart code modular and reusable
- Use consistent naming conventions
- Comment complex calculations
- Separate data from presentation
- Use TypeScript types when possible

❌ **DON'T:**
- Mix data processing with rendering
- Use magic numbers without explanation
- Create deeply nested structures
- Duplicate chart configurations

### 4. Security

✅ **DO:**
- Trust the sandbox attribute
- Validate data before rendering
- Use HTTPS for CDN resources
- Keep libraries up to date
- Test for XSS vulnerabilities

❌ **DON'T:**
- Disable sandbox without good reason
- Include user input without sanitization
- Use eval() or similar dangerous functions
- Load scripts from untrusted sources

---

## Common Issues and Solutions

### Issue: Chart Renders But Doesn't Resize

**Cause:** Auto-resize script not working properly

**Solution:**
```javascript
// Ensure chart has measurable dimensions
<div id='chart' style='width:100%; height:400px;'></div>

// Use responsive mode
Plotly.newPlot('chart', data, layout, {responsive: true});
```

### Issue: Multiple Charts Interfere With Each Other

**Cause:** Variable name conflicts

**Solution:**
The IIFE wrapping should prevent this, but if issues persist:
```javascript
// Use unique IDs for each chart
<div id='chart1'></div>
<div id='chart2'></div>

// Use unique variable names
const data1 = [...];
const data2 = [...];
```

### Issue: Chart Doesn't Update During Streaming

**Cause:** Incomplete iframe being processed

**Solution:**
This is expected behavior. The loading indicator will show until the complete iframe is received. Ensure your streaming implementation sends complete iframe tags.

### Issue: Console Shows "Plotly is not defined"

**Cause:** CDN script not loaded before chart code runs

**Solution:**
```html
<!-- Ensure script is in <head> -->
<head>
<script src='https://cdn.plot.ly/plotly-2.27.0.min.js'></script>
</head>

<!-- Chart code in <body> runs after -->
<body>
<script>
// This runs after Plotly is loaded
Plotly.newPlot(...);
</script>
</body>
```

### Issue: Iframe Shows Scrollbars

**Cause:** Content wider than container or height mismatch

**Solution:**
```css
/* In iframe srcdoc styles */
body {
  margin: 0;
  overflow-x: auto; /* Allow horizontal scroll if needed */
}

/* Ensure chart container doesn't exceed bounds */
#chart {
  width: 100%;
  max-width: 100%;
}
```

### Issue: Chart Looks Different in Production

**Cause:** CDN version mismatch or caching issues

**Solution:**
- Use specific version in CDN URL (not "latest")
- Clear browser cache
- Check network tab for 404s or CORS errors
- Verify CDN is accessible in production environment

---

## Advanced Topics

### Custom Preprocessing

If you need to modify the preprocessing behavior:

**File:** `src/lib/htmlPreprocessing.ts`

```typescript
// Example: Add custom attribute
const attributesAfter = cleanAttributes(afterSrcdoc);
attributesAfter += ' data-chart-version="1.0"';
```

### Debugging Preprocessed Content

```typescript
// Add logging to see processed output
export function preprocessContent(content: string): string {
  // ... processing ...
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Processed iframe:', result);
  }
  
  return result;
}
```

### Performance Monitoring

```typescript
// Track preprocessing time
const startTime = performance.now();
const processed = preprocessContent(content);
const endTime = performance.now();
console.log(`Preprocessing took ${endTime - startTime}ms`);
```

---

## Resources

### Documentation
- [Plotly.js Documentation](https://plotly.com/javascript/)
- [MDN: iframe element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe)
- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

### Internal Files
- `src/lib/htmlPreprocessing.ts` - Preprocessing implementation
- `src/components/ai-elements/response.tsx` - Response component
- `scripts/testHtmlPreprocessing.ts` - Test suite
- `scripts/FIX_SUMMARY.md` - Recent bug fix details
- `tmp/sample_message.md` - Example visualizations

### Testing
- Run tests: `npx tsx scripts/testHtmlPreprocessing.ts`
- Sample data: `tmp/sample_message.md`
- Test results: `tmp/sample_message_processed.md`

---

## Support

For issues or questions:
1. Check this guide first
2. Run the test suite to verify preprocessing
3. Check browser console for errors
4. Review recent changes in `scripts/FIX_SUMMARY.md`
5. Create a minimal reproduction case
6. Document the issue with screenshots and console output

---

## Changelog

### Recent Updates

**2024-01-23: Fixed Critical Preprocessing Bug**
- Fixed iframe detection logic that was treating all iframes as incomplete
- Improved nested iframe handling
- Added comprehensive test suite
- See `scripts/FIX_SUMMARY.md` for details

**Features:**
- Auto-resize functionality for dynamic height
- IIFE wrapping for script isolation
- Sandbox security attributes
- Horizontal scroll support
- Loading indicators for incomplete iframes
