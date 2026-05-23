export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders('text/plain') });
    }

    const requestUrl = new URL(request.url);
    const target = requestUrl.searchParams.get('url');

    if (!target || !/^https?:\/\//i.test(target)) {
      return new Response('Missing or invalid image url', {
        status: 400,
        headers: corsHeaders('text/plain; charset=utf-8'),
      });
    }

    try {
      const response = await fetch(target, {
        headers: {
          'user-agent': 'Mozilla/5.0 Markdown-to-Word image proxy',
          accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        return new Response(`Image request failed: ${response.status}`, {
          status: response.status,
          headers: corsHeaders('text/plain; charset=utf-8'),
        });
      }

      const headers = corsHeaders(response.headers.get('content-type') || inferImageMimeType(target));
      return new Response(response.body, { status: 200, headers });
    } catch (error) {
      return new Response(error instanceof Error ? error.message : 'Image proxy failed', {
        status: 502,
        headers: corsHeaders('text/plain; charset=utf-8'),
      });
    }
  },
};

function corsHeaders(contentType) {
  return {
    'content-type': contentType,
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,OPTIONS',
    'cache-control': 'no-store',
  };
}

function inferImageMimeType(url) {
  const cleanUrl = url.split('?')[0].toLowerCase();
  if (cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg')) return 'image/jpeg';
  if (cleanUrl.endsWith('.gif')) return 'image/gif';
  if (cleanUrl.endsWith('.webp')) return 'image/webp';
  if (cleanUrl.endsWith('.svg')) return 'image/svg+xml';
  if (cleanUrl.endsWith('.bmp')) return 'image/bmp';
  return 'image/png';
}
