import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      port: parseInt(env.FRONTEND_PORT ?? '3000'),
      // Cognito only redirects back to the registered callback URL, so never fall back to another port.
      strictPort: true,
      proxy: {
        '/api': {
          target: env.LOCAL_AGENT_URL ?? 'http://localhost:8080',
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
