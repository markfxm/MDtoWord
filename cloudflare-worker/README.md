# Cloudflare Worker image proxy

Use this when Tencent CloudBase free package does not allow HTTP access service.

## Option A: deploy with Wrangler

Run these commands from this folder:

```powershell
cd E:\MDtoWord\cloudflare-worker
npx wrangler login
npx wrangler deploy
```

After deployment, copy the Worker URL, for example:

```text
https://md-word-image-proxy.your-name.workers.dev
```

Put that URL into `dist/config.js` before uploading the static site:

```js
window.MD_TO_WORD_CONFIG = {
  imageProxyUrl: 'https://md-word-image-proxy.your-name.workers.dev',
};
```

Test it in the browser:

```text
https://md-word-image-proxy.your-name.workers.dev?url=https%3A%2F%2Fexample.com%2Ftest.jpg
```

Cloudflare Workers free plan is enough for light personal use. Check current
limits in Cloudflare's official Workers limits page before public or heavy use.

## Option B: dashboard editor

If you do not want to use Wrangler, do not use "upload project". Instead create
a Worker in the dashboard, open its code editor, paste the contents of
`image-proxy.js`, and deploy from the editor.
