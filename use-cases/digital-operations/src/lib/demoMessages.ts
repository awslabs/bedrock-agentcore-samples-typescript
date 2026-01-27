/**
 * Demo message templates and utilities for the refinery maintenance demo
 */

export interface DemoMessagePart {
  type: 'text'
  text: string
}

export interface DemoMessage {
  id: string
  role: 'assistant'
  parts: DemoMessagePart[]
  metadata: {
    createdAt: string
  }
}

/**
 * Creates the critical alert demo message with equipment performance chart
 */
export function createCriticalAlertMessage(): DemoMessage {
  const chartHtml = `<!DOCTYPE html>
<html>
<head>
<script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
<style>
  body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: #f8f9fa; }
  .chart-container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
  #chart { width: 100%; height: 350px; }
</style>
</head>
<body>
<div class="chart-container">
  <div id="chart"></div>
</div>
<script>
console.log("Rendering Plotly chart - auto-wrapped by preprocessContent");

var hours = [];
for (var i = 48; i >= 0; i -= 2) {
  hours.push(-i);
}

var pumpEfficiencyData = [92.5, 91.8, 91.2, 90.5, 89.8, 88.9, 87.5, 86.2, 84.8, 83.1, 81.5, 79.8, 77.9, 75.8, 73.5, 71.2, 68.7, 66.1, 63.4, 60.5, 57.8, 54.9, 52.1, 49.3, 46.5];

var trace = {
  x: hours,
  y: pumpEfficiencyData,
  type: "scatter",
  mode: "lines+markers",
  line: { color: "#ef4444", width: 3 },
  marker: { color: "#ef4444", size: 6 },
  name: "Pump Efficiency"
};

var thresholdTrace = {
  x: hours,
  y: Array(hours.length).fill(75.0),
  type: "scatter",
  mode: "lines",
  line: { color: "#fbbf24", width: 2, dash: "dash" },
  name: "Warning Threshold"
};

var layout = {
  title: { text: "Downhole Pump Efficiency - Last 48 Hours", font: { size: 16, weight: "bold", color: "#333" } },
  xaxis: { title: "Time (hours from now)", gridcolor: "#e5e7eb", zeroline: false },
  yaxis: { title: "Pump Efficiency (%)", gridcolor: "#e5e7eb", zeroline: false },
  showlegend: true,
  legend: { x: 0.02, y: 0.98, bgcolor: "rgba(255,255,255,0.8)", bordercolor: "#e5e7eb", borderwidth: 1 },
  margin: { t: 50, r: 30, b: 50, l: 60 },
  plot_bgcolor: "white",
  paper_bgcolor: "white"
};

var config = { responsive: true, displayModeBar: false };

Plotly.newPlot("chart", [trace, thresholdTrace], layout, config);
</script>
</body>
</html>`

  const messageText = `🚨 **CRITICAL ALERT DETECTED**

**Asset Health Alert: Downhole Pump Failure Predicted**

I've detected a critical failure prediction from the asset health monitoring system for a coalbed methane well. Here's what the system is reporting:

**Well Information:**
- **Well Name:** SAN JUAN 30 6 UNIT #457
- **API Number:** 30-039-24235
- **Well Type:** Coalbed Methane (CBM)

**Alert Details:**
- **Type:** FAILURE_PREDICTION
- **Severity:** CRITICAL
- **Status:** ACTIVE
- **Failure Probability:** 87%
- **Time to Failure:** 8 hours
- **Predicted Failure Time:** ${new Date(Date.now() + 8 * 3600000).toLocaleString()}

**Key Issues:**
- Asset health monitoring system predicts downhole pump failure in 8 hours based on current degradation trends
- Pump efficiency has dropped from 92.5% to 46.5% over the past 48 hours
- Accelerating performance degradation indicates imminent mechanical failure
- Likely causes: worn pump components, gas lock, or bearing failure

**Trend Analysis (Past 48 Hours):**

<iframe srcdoc='${chartHtml}' width="100%" height="500" style="border: none; border-radius: 8px; margin: 15px 0;"></iframe>

**Operational Impact:**
- Well production will cease completely upon pump failure
- Current production: ~150 Mcf/day (thousand cubic feet per day)
- Estimated downtime: 3-5 days for pump replacement
- Revenue impact: ~$15,000-25,000 in lost production

**Recommended Actions:**
1. Schedule immediate pump replacement before failure occurs
2. Mobilize workover rig and pump replacement equipment
3. Prepare well for pump pull operation
4. Order replacement pump assembly if not in inventory

The alert is now visible in the Maintenance Dashboard on the left. I recommend we create an emergency work order immediately to address this issue before the predicted failure occurs in 8 hours.

Would you like me to help you create a work order and coordinate the maintenance response?`

  return {
    id: `demo-${Date.now()}`,
    role: 'assistant',
    parts: [
      {
        type: 'text',
        text: messageText,
      },
    ],
    metadata: {
      createdAt: new Date().toISOString(),
    },
  }
}
