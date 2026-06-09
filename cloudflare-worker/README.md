# Cloudflare Worker image proxy

Use Tencent Cloud static website hosting for the built `dist` files, and use
this Cloudflare Worker only for `imageProxyUrl`.

The OCR endpoint is deployed separately in `vercel-ocr`.

## Deploy image proxy

```powershell
cd E:\MDtoWord\cloudflare-worker
npx wrangler login
npx wrangler deploy --config wrangler.toml
```

Copy the deployed URL, for example:

```text
https://md-word-image-proxy.your-name.workers.dev
```

Quick test:

```text
https://md-word-image-proxy.your-name.workers.dev?url=https%3A%2F%2Fexample.com%2Ftest.jpg
```

## Static site config

After running `npm run build`, edit `E:\MDtoWord\dist\config.js` before
uploading `dist` to Tencent Cloud static website hosting:

```js
window.MD_TO_WORD_CONFIG = {
  imageProxyUrl: 'https://md-word-image-proxy.your-name.workers.dev',
  localOcrUrl: 'https://your-vercel-ocr.vercel.app',
};
```
