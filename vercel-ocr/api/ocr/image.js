const fs = require('node:fs/promises');
const { formidable } = require('formidable');
const { Model, PaddleOCRClient } = require('@paddleocr/api-sdk');

const MAX_FILE_SIZE = 20 * 1024 * 1024;

module.exports.config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 300,
};

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ detail: 'Method not allowed' });
    return;
  }

  if (!process.env.PADDLEOCR_ACCESS_TOKEN) {
    res.status(500).json({ detail: 'Missing PADDLEOCR_ACCESS_TOKEN environment variable' });
    return;
  }

  let uploadPath = '';

  try {
    const { file } = await parseMultipart(req);
    uploadPath = file.filepath;

    const client = new PaddleOCRClient({
      token: process.env.PADDLEOCR_ACCESS_TOKEN,
      timeout: 240000,
      requestTimeout: 240000,
      pollTimeout: 240000,
    });

    const result = await client.parseDocument({
      model: Model.PPStructureV3,
      filePath: uploadPath,
      options: {
        useDocOrientationClassify: true,
        useDocUnwarping: false,
        useTextlineOrientation: true,
        useTableRecognition: true,
        useFormulaRecognition: true,
        useChartRecognition: false,
        prettifyMarkdown: true,
      },
    });

    const normalized = await normalizePaddleResult(result);
    res.status(200).json(normalized);
  } catch (error) {
    console.error('OCR proxy error:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      statusCode: error?.statusCode,
    });

    const status = error?.statusCode && Number.isInteger(error.statusCode) ? error.statusCode : 502;
    res.status(status).json({
      detail: error?.message || 'OCR request failed',
      name: error?.name || 'OCRProxyError',
    });
  } finally {
    if (uploadPath) {
      await fs.unlink(uploadPath).catch(() => {});
    }
  }
};

function parseMultipart(req) {
  const form = formidable({
    multiples: false,
    maxFileSize: MAX_FILE_SIZE,
    keepExtensions: true,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (error, fields, files) => {
      if (error) {
        reject(error);
        return;
      }

      const file = firstFile(files.image) || firstFile(files.file);
      if (!file) {
        reject(new Error('Missing image file field'));
        return;
      }

      resolve({ fields, file });
    });
  });
}

function firstFile(value) {
  if (Array.isArray(value)) return value[0];
  return value || null;
}

async function normalizePaddleResult(result) {
  const markdownParts = [];
  const assets = [];

  for (const page of result.pages || []) {
    const imageMap = await normalizeImageMap(page.markdownImages || page.outputImages || {});
    markdownParts.push(rewriteMarkdownImages(page.markdownText || '', imageMap));

    for (const [name, dataUrl] of Object.entries(imageMap)) {
      assets.push({
        id: name,
        type: 'image',
        dataUrl,
      });
    }
  }

  const markdown = markdownParts.join('\n\n').trim();

  return {
    markdown,
    blocks: markdown ? [{ type: 'markdown', markdown, bbox: null, confidence: null }] : [],
    assets,
    engine: 'paddleocr-api',
    raw: {
      jobId: result.jobId,
      pageCount: result.pages?.length || 0,
    },
  };
}

async function normalizeImageMap(images) {
  if (!images || typeof images !== 'object') return {};

  const entries = await Promise.all(Object.entries(images).map(async ([name, value]) => {
    if (typeof value !== 'string') return [name, ''];
    if (value.startsWith('data:image/')) return [name, value];
    if (/^https?:\/\//i.test(value)) return [name, await fetchImageAsDataUrl(value, name)];

    return [name, `data:${inferImageMimeType(name)};base64,${value}`];
  }));

  return Object.fromEntries(entries.filter(([, value]) => Boolean(value)));
}

async function fetchImageAsDataUrl(url, name) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch OCR image resource ${name}: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || inferImageMimeType(name);
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');

  return `data:${contentType};base64,${base64}`;
}

function rewriteMarkdownImages(markdown, imageMap) {
  let result = markdown;

  for (const [name, dataUrl] of Object.entries(imageMap)) {
    const candidates = new Set([
      name,
      `./${name}`,
      name.replace(/\\/g, '/'),
      `./${name.replace(/\\/g, '/')}`,
      name.split(/[\\/]/).pop(),
    ].filter(Boolean));

    for (const candidate of candidates) {
      const escapedName = escapeRegExp(candidate);
      result = result.replace(new RegExp(`(src=["'])${escapedName}(["'])`, 'g'), `$1${dataUrl}$2`);
      result = result.replace(new RegExp(`\\]\\(${escapedName}\\)`, 'g'), `](${dataUrl})`);
    }
  }

  return result;
}

function inferImageMimeType(name) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  return 'image/png';
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}
