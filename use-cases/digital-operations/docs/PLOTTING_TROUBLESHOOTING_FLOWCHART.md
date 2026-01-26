# Plotting Troubleshooting Flowchart

## Is Your Chart Not Displaying?

```
START: Chart not displaying
    ↓
    Is the iframe visible at all?
    ├─ NO → Check browser console for errors
    │        ├─ "Plotly is not defined"
    │        │   → CDN script not loaded
    │        │   → Solution: Verify script URL in <head>
    │        │
    │        ├─ "Cannot read property of undefined"
    │        │   → Data format issue
    │        │   → Solution: Check data structure matches Plotly docs
    │        │
    │        ├─ CORS error
    │        │   → CDN blocked
    │        │   → Solution: Check network tab, try different CDN
    │        │
    │        └─ No errors
    │            → Check if preprocessContent is running
    │            → Run: npx tsx scripts/testHtmlPreprocessing.ts
    │
    └─ YES → Is it showing "Loading..."?
             ├─ YES → Iframe incomplete during streaming
             │        → Wait for streaming to complete
             │        → Check closing </iframe> tag exists
             │
             └─ NO → Is iframe blank/white?
                     ├─ YES → Check chart container
                     │        ├─ Has ID? → Add id='chart'
                     │        ├─ Has height? → Add style='height:400px'
                     │        └─ Plotly.newPlot called? → Add chart code
                     │
                     └─ NO → Chart partially visible?
                             → See "Height Issues" section below
```

## Height Issues

```
START: Chart height problems
    ↓
    What's the symptom?
    ├─ Content cut off
    │   ├─ Check: Did you set height on iframe tag?
    │   │   └─ YES → Remove it (auto-resize handles this)
    │   │
    │   └─ Check: Does chart container have height?
    │       └─ NO → Add style='height:400px' to container div
    │
    ├─ Excessive white space
    │   ├─ Check: Is auto-resize working?
    │   │   └─ Look for console logs: "Iframe resized to..."
    │   │       ├─ NO logs → Preprocessing failed
    │   │       │   → Run test: npx tsx scripts/testHtmlPreprocessing.ts
    │   │       │
    │   │       └─ Has logs → Content has no measurable height
    │   │           → Ensure chart container has explicit height
    │   │
    │   └─ Check: Multiple resize attempts?
    │       └─ YES → Max resizes reached (20)
    │           → Content is dynamically changing
    │           → This is expected, final height should be correct
    │
    └─ Scrollbars appearing
        ├─ Vertical scrollbar
        │   → Auto-resize should prevent this
        │   → Check if content is taller than expected
        │   → Verify ResizeObserver is working
        │
        └─ Horizontal scrollbar
            → This is OK for wide content
            → Horizontal scroll is enabled by default
            → Ensure chart uses responsive: true
```

## Variable Conflicts

```
START: Charts interfering with each other
    ↓
    Symptom?
    ├─ Second chart overwrites first
    │   ├─ Check: Are IDs unique?
    │   │   └─ NO → Use unique IDs: chart1, chart2, etc.
    │   │
    │   └─ Check: Are scripts wrapped in IIFE?
    │       └─ NO → Preprocessing should do this automatically
    │           → Run test to verify
    │
    ├─ Console error: "variable already declared"
    │   ├─ Using var?
    │   │   └─ YES → Change to const or let
    │   │
    │   └─ Using const/let?
    │       → IIFE wrapping should prevent this
    │       → Check preprocessing is working
    │
    └─ Unexpected behavior
        → Check browser console for errors
        → Verify each chart has unique container ID
        → Ensure data variables have unique names
```

## Performance Issues

```
START: Chart is slow or laggy
    ↓
    How many data points?
    ├─ > 1000 points
    │   → Too many for smooth interaction
    │   → Solutions:
    │       ├─ Use data sampling/aggregation
    │       ├─ Implement pagination
    │       └─ Use server-side rendering
    │
    ├─ < 1000 points
    │   ↓
    │   How many charts on page?
    │   ├─ > 10 charts
    │   │   → Too many simultaneous renders
    │   │   → Solutions:
    │   │       ├─ Lazy load charts
    │   │       ├─ Use pagination
    │   │       └─ Reduce chart count
    │   │
    │   └─ < 10 charts
    │       ↓
    │       Check animations
    │       ├─ Heavy animations?
    │       │   → Reduce or disable
    │       │
    │       └─ Check browser DevTools
    │           → Profile performance
    │           → Look for memory leaks
    │           → Check network tab for slow CDN
```

## Streaming Issues

```
START: Chart doesn't update during streaming
    ↓
    Is "Loading..." showing?
    ├─ YES → This is expected
    │        → Iframe is incomplete
    │        → Will update when </iframe> received
    │        → No action needed
    │
    └─ NO → Is chart frozen/not updating?
            ├─ Check: Is streaming working?
            │   → Look at network tab
            │   → Should see chunked transfer
            │
            └─ Check: Is preprocessContent being called?
                → Add console.log to verify
                → Should process each chunk
```

## Security/Sandbox Issues

```
START: Console shows security errors
    ↓
    Error message?
    ├─ "Blocked by Content Security Policy"
    │   → Sandbox restrictions too strict
    │   → Default: allow-scripts allow-same-origin
    │   → Solution: Verify sandbox attribute is correct
    │
    ├─ "localStorage is not available"
    │   → Sandbox blocks storage
    │   → Solution: Don't use localStorage in charts
    │   → Alternative: Use parent window messaging
    │
    └─ "Cannot access parent"
        → Sandbox blocks parent access
        → This is expected and secure
        → Don't try to access parent window
```

## Quick Diagnostic Commands

```bash
# Test preprocessing
npx tsx scripts/testHtmlPreprocessing.ts

# Expected: 🎉 All tests passed!

# Check processed output
cat tmp/sample_message_processed.md | head -20

# Look for:
# - Compressed HTML (no newlines)
# - sandbox="allow-scripts allow-same-origin"
# - Auto-resize script present
# - Scripts wrapped in (function() { ... })();
```

## Common Error Messages

### "Plotly is not defined"
**Cause:** CDN script not loaded before chart code runs  
**Fix:** Ensure `<script src='https://cdn.plot.ly/...'></script>` is in `<head>`

### "Cannot read property 'newPlot' of undefined"
**Cause:** Same as above  
**Fix:** Same as above

### "Container is not defined"
**Cause:** Chart container div doesn't exist  
**Fix:** Add `<div id='chart'></div>` before script

### "Invalid data"
**Cause:** Data format doesn't match Plotly expectations  
**Fix:** Check Plotly docs for correct data structure

### "Blocked by CORS policy"
**Cause:** CDN or external resource blocked  
**Fix:** Check network tab, try different CDN, verify HTTPS

### "Maximum call stack size exceeded"
**Cause:** Infinite loop in auto-resize  
**Fix:** This shouldn't happen (max 20 resizes), report as bug

## Still Having Issues?

1. **Run the test suite:**
   ```bash
   npx tsx scripts/testHtmlPreprocessing.ts
   ```

2. **Check browser console** for specific error messages

3. **Create minimal reproduction:**
   - Start with basic example from docs
   - Add complexity incrementally
   - Identify what breaks it

4. **Review recent changes:**
   - See `scripts/FIX_SUMMARY.md`
   - Check if similar issue was fixed

5. **Consult full guide:**
   - `docs/PLOTTING_AND_VISUALIZATION_GUIDE.md`
   - Comprehensive troubleshooting section

6. **Check example files:**
   - `tmp/sample_message.md` - Working examples
   - `tmp/sample_message_processed.md` - Processed output
   - Compare your code to these

## Prevention Checklist

Before creating a new chart:

- [ ] Use the basic template from docs
- [ ] Include CDN script in `<head>`
- [ ] Give chart container a unique ID
- [ ] Set explicit height on container
- [ ] Use `responsive: true` for Plotly
- [ ] Don't set height on iframe tag
- [ ] Test with small dataset first
- [ ] Check browser console for errors
- [ ] Verify preprocessing with test suite

## Emergency Fixes

### Chart completely broken?
```html
<!-- Use this minimal working example -->
<iframe srcdoc="<!DOCTYPE html>
<html>
<head>
<script src='https://cdn.plot.ly/plotly-2.27.0.min.js'></script>
</head>
<body>
<div id='chart' style='width:100%;height:300px;'></div>
<script>
Plotly.newPlot('chart', [{x:[1,2,3],y:[4,5,6]}], {}, {responsive:true});
</script>
</body>
</html>" style="width:100%;border:none;"></iframe>
```

### Preprocessing broken?
```bash
# Verify preprocessing is working
npx tsx scripts/testHtmlPreprocessing.ts

# If tests fail, check:
# - src/lib/htmlPreprocessing.ts for changes
# - Recent commits that modified preprocessing
# - Restore from scripts/FIX_SUMMARY.md if needed
```

### Need to bypass preprocessing?
```typescript
// In src/components/ai-elements/response.tsx
// Temporarily disable preprocessing (NOT RECOMMENDED)
const processedChildren = children; // Skip preprocessContent()
```

**Warning:** Bypassing preprocessing removes:
- Auto-resize functionality
- Script isolation (IIFE wrapping)
- Security sandbox attributes
- Horizontal scroll support

Only use as last resort for debugging!
