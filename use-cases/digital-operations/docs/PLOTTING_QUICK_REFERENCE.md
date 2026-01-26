# Plotting Quick Reference

Quick reference for common plotting tasks and troubleshooting.

## Quick Start

### Basic Plotly Chart

```html
<iframe srcdoc="<!DOCTYPE html>
<html>
<head>
<script src='https://cdn.plot.ly/plotly-2.27.0.min.js'></script>
<style>body { margin: 0; padding: 10px; }</style>
</head>
<body>
<div id='chart' style='width:100%; height:400px;'></div>
<script>
Plotly.newPlot('chart', [{
  x: [1, 2, 3, 4, 5],
  y: [10, 15, 13, 17, 20],
  type: 'scatter'
}], {title: 'My Chart'}, {responsive: true});
</script>
</body>
</html>" style="width:100%; border:none;"></iframe>
```

## Common Chart Types

### Line Chart
```javascript
Plotly.newPlot('chart', [{
  x: [1, 2, 3, 4],
  y: [10, 15, 13, 17],
  type: 'scatter',
  mode: 'lines+markers'
}], {title: 'Line Chart'}, {responsive: true});
```

### Bar Chart
```javascript
Plotly.newPlot('chart', [{
  x: ['A', 'B', 'C', 'D'],
  y: [20, 14, 23, 18],
  type: 'bar'
}], {title: 'Bar Chart'}, {responsive: true});
```

### Pie Chart
```javascript
Plotly.newPlot('chart', [{
  values: [30, 40, 30],
  labels: ['Category A', 'Category B', 'Category C'],
  type: 'pie'
}], {title: 'Pie Chart'}, {responsive: true});
```

### Gauge Chart
```javascript
Plotly.newPlot('chart', [{
  type: 'indicator',
  mode: 'gauge+number',
  value: 75,
  gauge: {
    axis: {range: [null, 100]},
    bar: {color: '#3498db'}
  }
}], {title: 'Gauge'});
```

## Testing Commands

```bash
# Run preprocessing tests
npx tsx scripts/testHtmlPreprocessing.ts

# Expected output: 🎉 All tests passed!
```

## Troubleshooting Checklist

### Chart Not Showing
- [ ] CDN script URL correct?
- [ ] Chart container has ID?
- [ ] Plotly.newPlot called?
- [ ] Check browser console for errors

### Height Issues
- [ ] Don't set height on iframe tag
- [ ] Set height on chart container div
- [ ] Use responsive: true
- [ ] Check auto-resize is working

### Variable Conflicts
- [ ] Scripts wrapped in IIFE? (automatic)
- [ ] Using const/let not var?
- [ ] Unique variable names?

### Streaming Issues
- [ ] Loading indicator showing? (expected)
- [ ] Wait for complete iframe
- [ ] Check closing </iframe> tag

## What Gets Processed Automatically

✅ Newlines removed from srcdoc  
✅ Scripts wrapped in IIFE  
✅ Auto-resize script injected  
✅ Sandbox attribute added  
✅ Height attribute removed  
✅ Horizontal scroll enabled  

## Don't Do This

❌ Set height on iframe tag  
❌ Use global variables  
❌ Forget responsive: true  
❌ Use var instead of const/let  
❌ Load untrusted scripts  

## File Locations

- **Preprocessing:** `src/lib/htmlPreprocessing.ts`
- **Response Component:** `src/components/ai-elements/response.tsx`
- **Tests:** `scripts/testHtmlPreprocessing.ts`
- **Examples:** `tmp/sample_message.md`
- **Full Guide:** `docs/PLOTTING_AND_VISUALIZATION_GUIDE.md`

## Common Patterns

### Multiple Charts in Grid
```html
<style>
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
</style>
<div class='grid'>
  <div id='chart1' style='height:300px;'></div>
  <div id='chart2' style='height:300px;'></div>
</div>
```

### Responsive Layout
```javascript
const layout = {
  autosize: true,
  margin: {l: 50, r: 50, t: 50, b: 50}
};
Plotly.newPlot('chart', data, layout, {responsive: true});
```

### Custom Colors
```javascript
const trace = {
  x: [1, 2, 3],
  y: [4, 5, 6],
  marker: {
    color: ['#e74c3c', '#3498db', '#2ecc71']
  }
};
```

## Performance Tips

- Limit data points (< 1000 for smooth interaction)
- Use data sampling for large datasets
- Minimize animations
- Use CDN for libraries
- Cache processed content

## Security Notes

- Sandbox attribute added automatically
- Only allow-scripts and allow-same-origin
- Don't disable sandbox without reason
- Validate data before rendering
- Use HTTPS for CDN resources

## Need More Help?

See full guide: `docs/PLOTTING_AND_VISUALIZATION_GUIDE.md`
