window.MD_TO_WORD_CONFIG = {
  // Static hosting cannot run the local Vite image proxy.
  // After deploying the Tencent Cloud Function in cloud-functions/image-proxy,
  // set this to the function's public HTTP URL, for example:
  // imageProxyUrl: 'https://example.com/image-proxy',
  imageProxyUrl: '',
  localOcrUrl: '',
};
