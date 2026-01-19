import express from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT ?? 8080;

// Serve static files (index.html, etc.)
app.use(express.static(__dirname));

// Serve .bedrock_agentcore.yaml as bedrock_agentcore.yaml
app.get('/bedrock_agentcore.yaml', (req, res) => {
  try {
    const configPath = join(__dirname, '.bedrock_agentcore.yaml');
    const configContent = readFileSync(configPath, 'utf8');
    res.setHeader('Content-Type', 'text/yaml');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(configContent);
  } catch (error) {
    console.error('Error reading config file:', error);
    res.status(404).send('Configuration file not found');
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT}/index.html in your browser`);
});
