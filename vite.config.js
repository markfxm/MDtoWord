import { createRequire } from 'node:module'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

const imageProxyPath = '/api/image-proxy'
const ocrProxyPath = '/api/ocr/image'
const require = createRequire(import.meta.url)

const sendImageProxyResponse = async (req, res) => {
  try {
    const requestUrl = new URL(req.url, 'http://localhost')
    const target = requestUrl.searchParams.get('url')

    if (!target || !/^https?:\/\//i.test(target)) {
      res.statusCode = 400
      res.end('Missing or invalid image url')
      return
    }

    const response = await fetch(target, {
      headers: {
        'user-agent': 'Mozilla/5.0 Markdown-to-Word image proxy',
        accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    })

    if (!response.ok) {
      res.statusCode = response.status
      res.end(`Image request failed: ${response.status}`)
      return
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const arrayBuffer = await response.arrayBuffer()

    res.statusCode = 200
    res.setHeader('content-type', contentType)
    res.setHeader('cache-control', 'no-store')
    res.end(Buffer.from(arrayBuffer))
  } catch (error) {
    res.statusCode = 502
    res.end(error instanceof Error ? error.message : 'Image proxy failed')
  }
}

const imageProxyPlugin = () => ({
  name: 'local-image-proxy',
  configureServer(server) {
    server.middlewares.use(imageProxyPath, sendImageProxyResponse)
  },
  configurePreviewServer(server) {
    server.middlewares.use(imageProxyPath, sendImageProxyResponse)
  },
})

const createVercelLikeResponse = (res) => {
  res.status = (statusCode) => {
    res.statusCode = statusCode
    return res
  }
  res.json = (data) => {
    if (!res.headersSent) {
      res.setHeader('content-type', 'application/json; charset=utf-8')
    }
    res.end(JSON.stringify(data))
  }
  return res
}

const sendOcrProxyResponse = async (req, res) => {
  try {
    const handler = require('./vercel-ocr/api/ocr/image.js')
    await handler(req, createVercelLikeResponse(res))
  } catch (error) {
    const missingDependency = error?.code === 'MODULE_NOT_FOUND'

    res.statusCode = 500
    res.setHeader('content-type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({
      detail: missingDependency
        ? 'Missing OCR proxy dependencies. Run: npm install --prefix vercel-ocr'
        : error?.message || 'Local PaddleOCR proxy failed',
      name: error?.name || 'LocalOcrProxyError',
    }))
  }
}

const ocrProxyPlugin = () => ({
  name: 'local-paddle-ocr-proxy',
  configureServer(server) {
    server.middlewares.use(ocrProxyPath, sendOcrProxyResponse)
  },
  configurePreviewServer(server) {
    server.middlewares.use(ocrProxyPath, sendOcrProxyResponse)
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  process.env.PADDLEOCR_ACCESS_TOKEN ||= env.PADDLEOCR_ACCESS_TOKEN

  return {
    plugins: [vue(), imageProxyPlugin(), ocrProxyPlugin()],
    server: {
      watch: {
        ignored: ['**/.venv-ocr/**'],
      },
    },
  }
})
