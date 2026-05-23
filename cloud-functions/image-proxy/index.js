exports.main = async (event) => {
  const params = event.queryString || event.queryStringParameters || {};
  const target = params.url;

  if (!target || !/^https?:\/\//i.test(target)) {
    return {
      statusCode: 400,
      headers: corsHeaders('text/plain; charset=utf-8'),
      body: 'Missing or invalid image url',
    };
  }

  try {
    const response = await fetch(target, {
      headers: {
        'user-agent': 'Mozilla/5.0 Markdown-to-Word image proxy',
        accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: corsHeaders('text/plain; charset=utf-8'),
        body: `Image request failed: ${response.status}`,
      };
    }

    const contentType = response.headers.get('content-type') || inferImageMimeType(target);
    const buffer = Buffer.from(await response.arrayBuffer());

    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: corsHeaders(contentType),
      body: buffer.toString('base64'),
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: corsHeaders('text/plain; charset=utf-8'),
      body: error instanceof Error ? error.message : 'Image proxy failed',
    };
  }
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
