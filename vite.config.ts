import { fileURLToPath, URL } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, type ViteDevServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { handleExpandMapsRequest } from './src/server/expandGoogleMapsUrl.ts'

function queryParam(reqUrl: string | undefined, name: string): string | null {
  try {
    return new URL(reqUrl || '/', 'http://localhost').searchParams.get(name)
  } catch {
    return null
  }
}

async function expandMapsMiddleware(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const path = (req.url || '').split('?')[0]
  if (path !== '/api/expand-maps-url') {
    next()
    return
  }

  if (req.method !== 'GET') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  const result = await handleExpandMapsRequest(queryParam(req.url, 'url'))
  res.statusCode = result.status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(result.body))
}

function attachExpandMapsApi(server: ViteDevServer) {
  server.middlewares.use((req, res, next) => {
    void expandMapsMiddleware(req, res, next)
  })
}

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'expand-maps-url-api',
      configureServer: attachExpandMapsApi,
      configurePreviewServer: attachExpandMapsApi,
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
