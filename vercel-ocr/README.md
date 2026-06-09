# Vercel OCR proxy

This Vercel project exposes the OCR endpoint used by the main static site:

```text
POST /api/ocr/image
```

It accepts multipart form data with an `image` file field, calls PaddleOCR
Official API through `@paddleocr/api-sdk`, and returns:

```json
{
  "markdown": "...",
  "blocks": [],
  "assets": [],
  "engine": "paddleocr-api"
}
```

## Deploy

```powershell
cd E:\MDtoWord\vercel-ocr
npm install
npx vercel login
npx vercel env add PADDLEOCR_ACCESS_TOKEN production
npx vercel --prod
```

After deployment, set the main site's `dist/config.js`:

```js
window.MD_TO_WORD_CONFIG = {
  imageProxyUrl: 'https://your-cloudflare-image-proxy.workers.dev',
  localOcrUrl: 'https://your-vercel-ocr.vercel.app',
};
```

The frontend will call:

```text
https://your-vercel-ocr.vercel.app/api/ocr/image
```
