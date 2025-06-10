import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      '/api/claude': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/claude/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Forward x-api-key header if present (correct for Anthropic API)
            const apiKeyHeader = req.headers['x-api-key']
            if (apiKeyHeader) {
              proxyReq.setHeader('x-api-key', apiKeyHeader)
            }
            
            // Remove any Authorization header (not used by Anthropic)
            proxyReq.removeHeader('authorization')
            
            // Ensure anthropic-version header is present
            const versionHeader = req.headers['anthropic-version']
            if (versionHeader) {
              proxyReq.setHeader('anthropic-version', versionHeader)
            }
            
            // Forward the dangerous direct browser access header
            const dangerousHeader = req.headers['anthropic-dangerous-direct-browser-access']
            if (dangerousHeader) {
              proxyReq.setHeader('anthropic-dangerous-direct-browser-access', dangerousHeader)
            }
          })
        },
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access'
        }
      },
      '/api/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openai/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Forward Authorization header for OpenAI (check both cases)
            const authHeader = req.headers['authorization'] || req.headers['Authorization']
            if (authHeader) {
              proxyReq.setHeader('Authorization', authHeader)
            }
            
            // Ensure Content-Type is set
            const contentType = req.headers['content-type'] || req.headers['Content-Type']
            if (contentType) {
              proxyReq.setHeader('Content-Type', contentType)
            }
          })
        },
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      }
    }
  },
  esbuild: {
    loader: 'ts',
    include: /src\/.*\.js$/,
    exclude: []
  }
})
