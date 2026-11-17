import react from '@vitejs/plugin-react'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { config } from './server/config.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// The DCV SDK vendored inside bedrock-agentcore, relative to the project root
const dcvSdkDir = 'node_modules/bedrock-agentcore/dist/src/tools/browser/live-view/nice-dcv-web-client-sdk'

export default defineConfig({
  resolve: {
    alias: {
      // DCV SDK bare specifier aliases — required for BrowserLiveView
      dcv: resolve(__dirname, dcvSdkDir, 'dcvjs-esm/dcv.js'),
      'dcv-ui': resolve(__dirname, dcvSdkDir, 'dcv-ui/dcv-ui.js'),
    },
    // Force shared deps to resolve from this project's node_modules,
    // not from the vendored SDK path
    dedupe: [
      'react',
      'react-dom',
      'prop-types',
      '@cloudscape-design/components',
      '@cloudscape-design/global-styles',
      '@cloudscape-design/design-tokens',
      '@babel/runtime',
    ],
  },
  plugins: [
    react(),
    viteStaticCopy({
      // BrowserLiveView loads the DCV workers and decoders from /nice-dcv-web-client-sdk/dcvjs-esm at runtime
      targets: [
        {
          src: `${dcvSdkDir}/dcvjs-esm/**/*`,
          dest: 'nice-dcv-web-client-sdk',
          rename: { stripBase: dcvSdkDir.split('/').length },
        },
      ],
    }),
  ],
  // The browser talks only to Vite; /api is proxied to the local agent server
  server: {
    port: config.clientPort,
    strictPort: true,
    proxy: {
      // Keep the browser's Host header, so the server's own Host check applies to proxied requests too
      '/api': { target: `http://127.0.0.1:${config.serverPort}`, changeOrigin: false },
    },
  },
})
