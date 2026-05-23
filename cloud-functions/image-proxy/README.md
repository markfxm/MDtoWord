# image-proxy

Static hosting cannot run the Vite `/api/image-proxy` development middleware.
Deploy this folder as a Tencent Cloud Function or CloudBase HTTP function, then
put the public function URL into `public/config.js`:

```js
window.MD_TO_WORD_CONFIG = {
  imageProxyUrl: 'https://your-function-url.example.com',
};
```

The frontend will call:

```text
https://your-function-url.example.com?url=<encoded-image-url>
```

The function downloads the image server-side and returns it with CORS enabled so
the browser can embed it into the generated Word file.
