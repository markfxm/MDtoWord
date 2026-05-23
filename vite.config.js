import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const imageProxyPath = '/api/image-proxy'

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

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), imageProxyPlugin()],
})
