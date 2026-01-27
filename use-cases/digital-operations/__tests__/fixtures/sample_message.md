Perfect! Now let me create comprehensive operational dashboards with multiple visualizations:

<iframe srcdoc="<!DOCTYPE html>
<html>
<head>
<script src='https://cdn.plot.ly/plotly-2.27.0.min.js'></script>
<style>body { margin: 0; padding: 10px; font-family: Arial; background: #f8f9fa; }</style>
</head>
<body>
<div style='display: grid; grid-template-columns: 1fr 1fr; gap: 15px;'>
  <div id='chart1' style='height:350px; background:white; border-radius:8px; padding:10px;'></div>
  <div id='chart2' style='height:350px; background:white; border-radius:8px; padding:10px;'></div>
</div>
<script>
// Chart 1: Production Rate Distribution (Current State - Dec 2024)
const rateBins = ['0-50', '50-100', '100-250', '250-500', '500-1000', '1000-2500', '2500-5000', '5000+'];
const wellCounts = [15745, 5036, 1960, 278, 33, 7, 13, 15];
const totalRates = [351000.8, 346800.8, 282116.5, 90568.0, 21147.6, 14189.2, 47386.8, 254188.6];

const trace1 = {
x: rateBins,
y: wellCounts,
type: 'bar',
name: 'Well Count',
marker: {
color: ['#e74c3c', '#e67e22', '#f39c12', '#f1c40f', '#2ecc71', '#1abc9c', '#3498db', '#9b59b6'],
line: {color: '#2c3e50', width: 1.5}
},
text: wellCounts.map(v => v.toLocaleString()),
textposition: 'outside',
hovertemplate: '<b>%{x} MCF/D</b><br>Wells: %{y:,}<extra></extra>'
};

const layout1 = {
title: {text: 'Well Count Distribution by Production Rate', font: {size: 14, weight: 'bold'}},
xaxis: {title: 'Daily Gas Rate (MCF/D)', titlefont: {size: 11}},
yaxis: {title: 'Number of Wells', titlefont: {size: 11}},
showlegend: false,
margin: {l: 60, r: 20, t: 50, b: 60},
plot_bgcolor: '#fafafa',
paper_bgcolor: 'white'
};

Plotly.newPlot('chart1', [trace1], layout1, {responsive: true});

// Chart 2: Production Contribution by Rate Category
const trace2 = {
labels: rateBins,
values: totalRates,
type: 'pie',
hole: 0.4,
marker: {
colors: ['#e74c3c', '#e67e22', '#f39c12', '#f1c40f', '#2ecc71', '#1abc9c', '#3498db', '#9b59b6']
},
textinfo: 'label+percent',
textposition: 'outside',
hovertemplate: '<b>%{label}</b><br>Rate: %{value:,.0f} MCF/D<br>%{percent}<extra></extra>'
};

const layout2 = {
title: {text: 'Production Contribution by Rate Category', font: {size: 14, weight: 'bold'}},
annotations: [{
text: '1.41<br>MMCF/D',
font: {size: 20, weight: 'bold', color: '#2c3e50'},
showarrow: false
}],
showlegend: true,
legend: {x: 1.1, y: 0.5, font: {size: 10}},
margin: {l: 20, r: 120, t: 50, b: 20},
paper_bgcolor: 'white'
};

Plotly.newPlot('chart2', [trace2], layout2, {responsive: true});
</script>

</body>
</html>" style="width:100%; height:400px; border:none;"></iframe>

<iframe srcdoc="<!DOCTYPE html>
<html>
<head>
<script src='https://cdn.plot.ly/plotly-2.27.0.min.js'></script>
<style>body { margin: 0; padding: 10px; font-family: Arial; }</style>
</head>
<body>
<div id='chart' style='width:100%;height:450px;'></div>
<script>
const dates = ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06', '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12'];
const totalRate = [1299909, 1230800, 1291259, 1224379, 1253322, 1170946, 1243921, 1238756, 1192838, 1240379, 1281753, 1407398];
const wellCount = [17415, 17401, 17393, 17456, 17219, 16601, 17225, 17212, 17161, 17186, 17284, 17443];
const avgRate = [56.63, 53.66, 56.33, 53.23, 55.11, 52.95, 54.63, 54.37, 52.48, 54.49, 56.11, 60.96];

const trace1 = {
x: dates,
y: totalRate.map(v => v / 1000),
type: 'scatter',
mode: 'lines+markers',
name: 'Total Rate (MMCF/D)',
line: {color: '#e74c3c', width: 3},
marker: {size: 8, color: '#e74c3c', line: {color: 'white', width: 2}},
yaxis: 'y',
hovertemplate: '<b>%{x}</b><br>Total: %{y:.1f} MMCF/D<extra></extra>'
};

const trace2 = {
x: dates,
y: wellCount,
type: 'scatter',
mode: 'lines+markers',
name: 'Active Wells',
line: {color: '#3498db', width: 2, dash: 'dash'},
marker: {size: 6, color: '#3498db'},
yaxis: 'y2',
hovertemplate: '<b>%{x}</b><br>Wells: %{y:,}<extra></extra>'
};

const trace3 = {
x: dates,
y: avgRate,
type: 'scatter',
mode: 'lines+markers',
name: 'Avg Rate (MCF/D/Well)',
line: {color: '#2ecc71', width: 2},
marker: {size: 6, color: '#2ecc71'},
yaxis: 'y3',
hovertemplate: '<b>%{x}</b><br>Avg: %{y:.1f} MCF/D<extra></extra>'
};

const layout = {
title: {text: '2024 Basin-Wide Production Performance', font: {size: 16, weight: 'bold'}},
xaxis: {title: 'Month', showgrid: true, gridcolor: '#e0e0e0'},
yaxis: {
title: 'Total Rate (MMCF/D)',
titlefont: {color: '#e74c3c'},
tickfont: {color: '#e74c3c'},
showgrid: true,
gridcolor: '#e0e0e0'
},
yaxis2: {
title: 'Active Well Count',
titlefont: {color: '#3498db'},
tickfont: {color: '#3498db'},
overlaying: 'y',
side: 'right',
showgrid: false
},
yaxis3: {
title: 'Avg Rate per Well',
titlefont: {color: '#2ecc71'},
tickfont: {color: '#2ecc71'},
anchor: 'free',
overlaying: 'y',
side: 'right',
position: 1,
showgrid: false
},
showlegend: true,
legend: {x: 0.02, y: 0.98, bgcolor: 'rgba(255,255,255,0.9)'},
plot_bgcolor: '#fafafa',
paper_bgcolor: 'white',
margin: {l: 60, r: 120, t: 60, b: 60}
};

Plotly.newPlot('chart', [trace1, trace2, trace3], layout, {responsive: true});
</script>

</body>
</html>" style="width:100%; height:500px; border:none;"></iframe>

<iframe srcdoc="<!DOCTYPE html>
<html>
<head>
<script src='https://cdn.plot.ly/plotly-2.27.0.min.js'></script>
<style>body { margin: 0; padding: 10px; font-family: Arial; }</style>
</head>
<body>
<div id='chart' style='width:100%;height:420px;'></div>
<script>
const townships = ['07-31N-05W', '26-32N-07W', '22-31N-06W', '23-31N-06W', '25-31N-06W', '30-31N-05W', '33-31N-05W', '19-31N-05W', '10-32N-06W', '11-31N-07W', '21-27N-06W', '12-31N-07W', '14-32N-08W', '33-30N-07W', '08-29N-07W'];
const wells = [13, 16, 15, 16, 17, 16, 17, 16, 6, 12, 13, 6, 9, 12, 13];
const totalGas = [110058, 79711, 33661, 32739, 16693, 13297, 12793, 7193, 4616, 3755, 2565, 2440, 2211, 2121, 2053];
const avgGas = [7337, 3986, 1772, 1723, 726, 700, 582, 379, 769, 268, 122, 305, 158, 106, 98];

const trace1 = {
x: townships.slice(0, 15),
y: totalGas.slice(0, 15),
type: 'bar',
name: 'Total Production',
marker: {
color: totalGas.slice(0, 15).map(v => {
if (v > 50000) return '#8B0000';
if (v > 30000) return '#DC143C';
if (v > 10000) return '#FF6347';
if (v > 5000) return '#FFA500';
return '#FFD700';
}),
line: {color: '#2c3e50', width: 1}
},
text: totalGas.slice(0, 15).map(v => (v/1000).toFixed(1) + 'k'),
textposition: 'outside',
hovertemplate: '<b>%{x}</b><br>Total: %{y:,.0f} MCF/D<br>Wells: ' + wells.slice(0, 15).map(String) + '<extra></extra>'
};

const layout = {
title: {text: 'Top 15 Township-Ranges by Total Production (Dec 2024)', font: {size: 16, weight: 'bold'}},
xaxis: {
title: 'Township-Range',
tickangle: -45,
tickfont: {size: 10}
},
yaxis: {
title: 'Total Daily Gas Rate (MCF/D)',
showgrid: true,
gridcolor: '#e0e0e0'
},
showlegend: false,
plot_bgcolor: '#fafafa',
paper_bgcolor: 'white',
margin: {l: 70, r: 30, t: 60, b: 120}
};

Plotly.newPlot('chart', [trace1], layout, {responsive: true});
</script>

</body>
</html>" style="width:100%; height:470px; border:none;"></iframe>

<iframe srcdoc="<!DOCTYPE html>
<html>
<head>
<script src='https://cdn.plot.ly/plotly-2.27.0.min.js'></script>
<style>body { margin: 0; padding: 10px; font-family: Arial; }</style>
</head>
<body>
<div style='display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;'>
  <div id='gauge1' style='height:280px;'></div>
  <div id='gauge2' style='height:280px;'></div>
  <div id='gauge3' style='height:280px;'></div>
</div>
<script>
// Gauge 1: Current Production Rate
const trace1 = {
  type: 'indicator',
  mode: 'gauge+number+delta',
  value: 1407,
  delta: {reference: 1282, increasing: {color: '#2ecc71'}},
  gauge: {
    axis: {range: [null, 1600], ticksuffix: ' MMCF/D'},
    bar: {color: '#e74c3c', thickness: 0.75},
    bgcolor: 'white',
    borderwidth: 2,
    bordercolor: '#34495e',
    steps: [
      {range: [0, 800], color: '#ecf0f1'},
      {range: [800, 1200], color: '#bdc3c7'},
      {range: [1200, 1600], color: '#95a5a6'}
    ],
    threshold: {
      line: {color: '#2c3e50', width: 4},
      thickness: 0.75,
      value: 1300
    }
  },
  title: {text: '<b>Current Production</b><br><span style=\"font-size:0.8em\">Dec 2024</span>'},
  number: {suffix: ' MMCF/D', font: {size: 40}}
};

Plotly.newPlot('gauge1', [trace1], {margin: {t: 80, b: 20, l: 20, r: 20}, paper_bgcolor: 'white'});

// Gauge 2: Active Wells
const trace2 = {
type: 'indicator',
mode: 'gauge+number+delta',
value: 17443,
delta: {reference: 17284, increasing: {color: '#2ecc71'}},
gauge: {
axis: {range: [null, 20000], ticksuffix: ''},
bar: {color: '#3498db', thickness: 0.75},
bgcolor: 'white',
borderwidth: 2,
bordercolor: '#34495e',
steps: [
{range: [0, 10000], color: '#ecf0f1'},
{range: [10000, 15000], color: '#bdc3c7'},
{range: [15000, 20000], color: '#95a5a6'}
],
threshold: {
line: {color: '#2c3e50', width: 4},
thickness: 0.75,
value: 17000
}
},
title: {text: '<b>Active Wells</b><br><span style=\"font-size:0.8em\">Producing Assets</span>'},
number: {font: {size: 40}}
};

Plotly.newPlot('gauge2', [trace2], {margin: {t: 80, b: 20, l: 20, r: 20}, paper_bgcolor: 'white'});

// Gauge 3: Average Well Rate
const trace3 = {
type: 'indicator',
mode: 'gauge+number+delta',
value: 60.96,
delta: {reference: 56.11, increasing: {color: '#2ecc71'}},
gauge: {
axis: {range: [null, 80], ticksuffix: ' MCF/D'},
bar: {color: '#2ecc71', thickness: 0.75},
bgcolor: 'white',
borderwidth: 2,
bordercolor: '#34495e',
steps: [
{range: [0, 40], color: '#ecf0f1'},
{range: [40, 60], color: '#bdc3c7'},
{range: [60, 80], color: '#95a5a6'}
],
threshold: {
line: {color: '#2c3e50', width: 4},
thickness: 0.75,
value: 55
}
},
title: {text: '<b>Avg Well Rate</b><br><span style=\"font-size:0.8em\">Per Well Performance</span>'},
number: {suffix: ' MCF/D', font: {size: 40}}
};

Plotly.newPlot('gauge3', [trace3], {margin: {t: 80, b: 20, l: 20, r: 20}, paper_bgcolor: 'white'});
</script>

</body>
</html>" style="width:100%; height:320px; border:none;"></iframe>

<iframe srcdoc="<!DOCTYPE html>
<html>
<head>
<script src='https://cdn.plot.ly/plotly-2.27.0.min.js'></script>
<style>body { margin: 0; padding: 10px; font-family: Arial; }</style>
</head>
<body>
<div id='chart' style='width:100%;height:500px;'></div>
<script>
// Sample wells with decline curves (12-month comparison)
const wells = [
  {name: 'ROSA UNIT #746H', current: 4434, m6: 9948, m12: 18018, cat: 'Declining'},
  {name: 'ROSA UNIT #744H', current: 3735, m6: 8977, m12: 18460, cat: 'Declining'},
  {name: 'ROSA UNIT #745H', current: 4185, m6: 7201, m12: 13650, cat: 'Declining'},
  {name: 'ROSA UNIT #647H', current: 2048, m6: 6970, m12: 8342, cat: 'Declining'},
  {name: 'ROSA UNIT #704H', current: 22180, m6: 0, m12: 0, cat: 'New'},
  {name: 'ROSA UNIT #706H', current: 21400, m6: 0, m12: 0, cat: 'New'},
  {name: 'ROSA UNIT #705H', current: 19538, m6: 0, m12: 0, cat: 'New'},
  {name: 'ROSA UNIT #604H', current: 18593, m6: 0, m12: 0, cat: 'New'},
  {name: 'SAN JUAN 32 7 603 #613H', current: 16139, m6: 0, m12: 0, cat: 'New'},
  {name: 'ROSA UNIT #652H', current: 3817, m6: 4943, m12: 9366, cat: 'Declining'},
  {name: 'ROSA UNIT #650H', current: 3785, m6: 5908, m12: 10999, cat: 'Declining'},
  {name: 'ROSA UNIT #662H', current: 4069, m6: 4723, m12: 7841, cat: 'Stable'}
];

const months = ['12mo ago', '6mo ago', 'Current'];

const traces = [];
const colors = {'New': '#2ecc71', 'Declining': '#e74c3c', 'Stable': '#f39c12'};

wells.forEach((well, i) => {
const values = [well.m12 || null, well.m6 || null, well.current];
traces.push({
x: months,
y: values,
type: 'scatter',
mode: 'lines+markers',
name: well.name,
line: {color: colors[well.cat], width: 2},
marker: {size: 8},
visible: i < 5 ? true : 'legendonly',
hovertemplate: '<b>' + well.name + '</b><br>%{x}: %{y:,.0f} MCF/D<extra></extra>'
});
});

const layout = {
title: {text: 'Well Performance Trends - 12 Month Comparison', font: {size: 16, weight: 'bold'}},
xaxis: {
title: 'Time Period',
showgrid: true,
gridcolor: '#e0e0e0'
},
yaxis: {
title: 'Daily Gas Rate (MCF/D)',
type: 'log',
showgrid: true,
gridcolor: '#e0e0e0'
},
showlegend: true,
legend: {
x: 1.02,
y: 1,
font: {size: 9},
bgcolor: 'rgba(255,255,255,0.9)'
},
hovermode: 'closest',
plot_bgcolor: '#fafafa',
paper_bgcolor: 'white',
margin: {l: 70, r: 150, t: 60, b: 60}
};

Plotly.newPlot('chart', traces, layout, {responsive: true});
</script>

</body>
</html>" style="width:100%; height:550px; border:none;"></iframe>

## Self-Closing Iframe Test

Here's a simple iframe for testing (using closing tag syntax since node-html-parser has issues with multiline attributes in self-closing tags):

<iframe width="100%" srcdoc="<!DOCTYPE html>
<html>
<head>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      padding: 20px; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .card {
      background: rgba(255,255,255,0.1);
      padding: 20px;
      border-radius: 10px;
      backdrop-filter: blur(10px);
    }
  </style>
</head>
<body>
  <div class="card">
    <h2>Self-Closing Iframe Test</h2>
    <p>This iframe tests proper processing</p>
    <script>
      // Test script that should be wrapped in IIFE
      const message = 'Hello from test iframe!';
      console.log(message);
      
      // Add some dynamic content
      const timestamp = new Date().toLocaleTimeString();
      document.body.innerHTML += '<p>Loaded at: ' + timestamp + '</p>';
    </script>
  </div>
</body>
</html>"></iframe>

This should be processed correctly with auto-resize and IIFE wrapping.

<iframe srcdoc="<!DOCTYPE html>
<html>
<head>
<script src='https://cdn.plot.ly/plotly-2.27.0.min.js'></script>
<style>body { margin: 0; padding: 10px; font-family: Arial; }</style>
</head>
<body>
<div id='chart' style='width:100%;height:420px;'></div>
<script>
// Economic tiers based on production
const categories = [
  'Marginal<br>(0-50 MCF/D)',
  'Low Tier<br>(50-100)',
  'Mid Tier<br>(100-250)',
  'Strong<br>(250-500)',
  'High<br>(500-1000)',
  'Very High<br>(1000-2500)',
  'Premium<br>(2500-5000)',
  'Exceptional<br>(5000+)'
];

const wellCounts = [15745, 5036, 1960, 278, 33, 7, 13, 15];
const totalRates = [351001, 346801, 282117, 90568, 21148, 14189, 47387, 254189];

// Calculate contribution percentages
const total = totalRates.reduce((a,b) => a+b, 0);
const pcts = totalRates.map(v => (v/total\*100).toFixed(1));

const trace1 = {
x: categories,
y: wellCounts,
type: 'bar',
name: 'Well Count',
yaxis: 'y',
marker: {
color: '#3498db',
line: {color: '#2c3e50', width: 1}
},
text: wellCounts.map((v, i) => v.toLocaleString() + '<br>(' + pcts[i] + '%)'),
textposition: 'outside',
textfont: {size: 9},
hovertemplate: '<b>%{x}</b><br>Wells: %{y:,}<br>Production: ' + totalRates.map(v => (v/1000).toFixed(0) + 'k MCF/D') + '<extra></extra>'
};

const trace2 = {
x: categories,
y: totalRates.map(v => v/1000),
type: 'scatter',
mode: 'lines+markers',
name: 'Production',
y
