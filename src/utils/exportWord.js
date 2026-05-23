import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import { isSimpleMath, convertSimpleMathToHtml } from './mathUtils.js';
import { asWordCompatibleBlob } from './htmlDocxWord.js';

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

const isFetchableImageSrc = (src) => {
  if (!src || src.startsWith('data:')) return false;
  return /^(https?:|blob:|\/)/i.test(src);
};

const getImageProxyUrl = (absoluteSrc) => {
  const configuredProxy = window.MD_TO_WORD_CONFIG?.imageProxyUrl || import.meta.env.VITE_IMAGE_PROXY_URL;
  const proxyBase = configuredProxy || '/api/image-proxy';
  const separator = proxyBase.includes('?') ? '&' : '?';
  return `${proxyBase}${separator}url=${encodeURIComponent(absoluteSrc)}`;
};

const inferImageMimeType = (src, fallback = 'image/png') => {
  const cleanSrc = src.split('?')[0].toLowerCase();
  if (cleanSrc.endsWith('.jpg') || cleanSrc.endsWith('.jpeg')) return 'image/jpeg';
  if (cleanSrc.endsWith('.gif')) return 'image/gif';
  if (cleanSrc.endsWith('.webp')) return 'image/webp';
  if (cleanSrc.endsWith('.svg')) return 'image/svg+xml';
  if (cleanSrc.endsWith('.bmp')) return 'image/bmp';
  return fallback;
};

const normalizeImageBlob = (blob, src, contentType) => {
  const mimeType = contentType?.split(';')[0] || blob.type;
  if (mimeType?.startsWith('image/')) {
    return blob.type === mimeType ? blob : new Blob([blob], { type: mimeType });
  }
  return new Blob([blob], { type: inferImageMimeType(src) });
};

const fetchImageBlob = async (absoluteSrc) => {
  try {
    const response = await fetch(absoluteSrc);
    if (!response.ok) throw new Error(`图片下载失败：${response.status}`);
    return normalizeImageBlob(
      await response.blob(),
      absoluteSrc,
      response.headers.get('content-type')
    );
  } catch (directError) {
    if (!/^https?:\/\//i.test(absoluteSrc)) throw directError;

    const proxyUrl = getImageProxyUrl(absoluteSrc);
    const proxyResponse = await fetch(proxyUrl);
    if (!proxyResponse.ok) {
      throw new Error(`图片代理下载失败：${proxyResponse.status}`);
    }

    return normalizeImageBlob(
      await proxyResponse.blob(),
      absoluteSrc,
      proxyResponse.headers.get('content-type')
    );
  }
};

const inlineImagesForWord = async (root) => {
  const images = Array.from(root.querySelectorAll('img'));
  const failedImages = [];

  await Promise.all(images.map(async (img) => {
    const src = img.getAttribute('src');
    if (!isFetchableImageSrc(src)) return;

    try {
      const absoluteSrc = new URL(src, window.location.href).href;
      const blob = await fetchImageBlob(absoluteSrc);
      img.setAttribute('src', await blobToDataUrl(blob));
      img.removeAttribute('srcset');
    } catch (error) {
      console.warn('图片内嵌失败，Word 可能无法显示该图片:', src, error);
      failedImages.push(src);
    }
  }));

  return failedImages;
};

const getSafeDocxFilename = (documentTitle) => {
  const fallbackName = '文档导出';
  const baseName = (documentTitle || fallbackName)
    .replace(/\.md$/i, '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/[. ]+$/g, '')
    .trim();

  return `${baseName || fallbackName}.docx`;
};

export const downloadWord = async ({
  previewEl,
  markdownContent,
  isWpsCompatible,
  documentTitle,
  onDownloadStart,
  onDownloadEnd
}) => {
  if (!markdownContent.trim()) {
    alert("请输入或粘贴一些 Markdown 内容！");
    return;
  }

  if (onDownloadStart) onDownloadStart();

  try {
    if (!previewEl) throw new Error('找不到预览容器');

    // 克隆预览区用于导出
    const clone = previewEl.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.left = '-9999px';
    clone.style.top = '0';
    clone.style.width = previewEl.clientWidth + 'px';
    clone.style.height = 'auto';
    document.body.appendChild(clone);

    try {
      // ==================== 新增：智能提醒（防止用户困惑） ====================
      if (!isWpsCompatible) {
        // 简单检测是否有公式（如果有就提醒）
        const hasMath = previewEl.querySelector('.katex');
        if (hasMath) {
          const confirmed = confirm(
            '您未勾选“公式转为图片”。\n\n' +
            '✅ Microsoft Word 中公式可双击编辑（完美）\n' +
            '❌ WPS 中公式会显示乱码（已知问题）\n\n' +
            '是否继续导出？\n' +
            '（推荐 WPS 用户点击“取消”，然后勾选选项后再导出）'
          );
          if (!confirmed) {
            if (onDownloadEnd) onDownloadEnd();
            return;
          }
        }
      }

      if (isWpsCompatible) {
        // ====================== 图片模式（最高兼容，公式转为高清图片） ======================
        const originalMathNodes = previewEl.querySelectorAll('.katex');
        const cloneMathNodes = clone.querySelectorAll('.katex');

        for (let i = 0; i < originalMathNodes.length; i++) {
          const originalNode = originalMathNodes[i];
          const cloneNode = cloneMathNodes[i];
          const targetToCapture = originalNode.querySelector('.katex-html') || originalNode;

          let rawLatex = originalNode.querySelector('annotation')?.textContent || '';

          if (isSimpleMath(rawLatex)) {
            const textHtml = convertSimpleMathToHtml(rawLatex);
            const textSpan = document.createElement('span');
            textSpan.innerHTML = textHtml;
            if (cloneNode.classList.contains('katex-display')) {
              const div = document.createElement('div');
              div.style.textAlign = 'center';
              div.style.margin = '1em 0';
              div.appendChild(textSpan);
              cloneNode.parentNode.replaceChild(div, cloneNode);
            } else {
              cloneNode.parentNode.replaceChild(textSpan, cloneNode);
            }
            continue;
          }

          const canvas = await html2canvas(targetToCapture, {
            backgroundColor: null,
            scale: 3,
            useCORS: true,
            logging: false,
            onclone: (clonedDoc) => clonedDoc.querySelectorAll('.katex-mathml').forEach(el => el.style.display = 'none')
          });

          const dataUrl = canvas.toDataURL('image/png');
          const img = document.createElement('img');
          img.src = dataUrl;
          img.alt = rawLatex;
          const rect = targetToCapture.getBoundingClientRect();
          img.width = rect.width;
          img.height = rect.height;

          if (cloneNode.classList.contains('katex-display')) {
            const wrapper = document.createElement('div');
            wrapper.style.textAlign = 'center';
            wrapper.style.margin = '1.2em auto';
            img.style.display = 'inline-block';
            wrapper.appendChild(img);
            cloneNode.parentNode.replaceChild(wrapper, cloneNode);
          } else {
            img.style.display = 'inline-block';
            img.style.verticalAlign = 'middle';
            img.style.marginBottom = '-4px';
            img.style.marginLeft = '2px';
            img.style.marginRight = '2px';
            cloneNode.parentNode.replaceChild(img, cloneNode);
          }
        }
      }

      // 通用清理：修复 WPS 项目符号问题
      clone.querySelectorAll('li').forEach(li => {
        li.querySelectorAll('p, div').forEach(p => {
          const span = document.createElement('span');
          span.innerHTML = p.innerHTML;
          p.parentNode.replaceChild(span, p);
        });
        li.innerHTML = li.innerHTML.trim().replace(/\n/g, ' ');
      });

      const failedImages = await inlineImagesForWord(clone);
      if (failedImages.length > 0) {
        throw new Error(`有 ${failedImages.length} 张图片无法内嵌。静态部署时需要配置可用的图片代理服务。`);
      }

      let finalHtmlBody = clone.innerHTML;

      // ====================== Emoji 转图片（完整函数已内置） ======================
      const wrapEmojisInHtml = (htmlStr) => {
        const emojiRegex = /([\u{1F300}-\u{1F5FF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F191}-\u{1F251}])/gu;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlStr;

        const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null, false);
        let node;
        const textNodes = [];
        while ((node = walker.nextNode())) {
          if (emojiRegex.test(node.nodeValue)) textNodes.push(node);
        }

        const toCodePoint = (unicodeSurrogates) => {
          const r = [];
          let c = 0, p = 0, i = 0;
          while (i < unicodeSurrogates.length) {
            c = unicodeSurrogates.charCodeAt(i++);
            if (p) {
              r.push((0x10000 + ((p - 0xD800) << 10) + (c - 0xDC00)).toString(16));
              p = 0;
            } else if (0xD800 <= c && c <= 0xDBFF) {
              p = c;
            } else {
              r.push(c.toString(16));
            }
          }
          return r.join('-');
        };

        textNodes.forEach(n => {
          emojiRegex.lastIndex = 0;
          const fragment = document.createDocumentFragment();
          let lastIdx = 0;
          let match;
          while ((match = emojiRegex.exec(n.nodeValue)) !== null) {
            if (match.index > lastIdx) fragment.appendChild(document.createTextNode(n.nodeValue.slice(lastIdx, match.index)));
            const codePoint = toCodePoint(match[0]);
            const img = document.createElement('img');
            img.src = `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/${codePoint}.png`;
            img.alt = match[0];
            let fontSizePx = 18;
            try {
              const computedStyle = window.getComputedStyle(n.parentNode || n);
              if (computedStyle.fontSize.endsWith('px')) fontSizePx = parseFloat(computedStyle.fontSize);
            } catch (e) { }
            const size = Math.round(fontSizePx * 1.2);
            img.setAttribute('width', size.toString());
            img.setAttribute('height', size.toString());
            img.style.height = '1.2em';
            img.style.width = '1.2em';
            img.style.margin = '0 0.1em';
            img.style.verticalAlign = '-0.2em';
            img.style.display = 'inline-block';
            fragment.appendChild(img);
            lastIdx = emojiRegex.lastIndex;
          }
          if (lastIdx < n.nodeValue.length) fragment.appendChild(document.createTextNode(n.nodeValue.slice(lastIdx)));
          n.parentNode.replaceChild(fragment, n);
        });

        return tempDiv.innerHTML;
      };

      finalHtmlBody = wrapEmojisInHtml(finalHtmlBody);

      // 注入 Word 专用样式（优化 MathML 显示）
      const documentHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset="utf-8">
            <!--[if gte mso 9]>
            <xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml>
            <![endif]-->
            <style>
                body { font-family: "Microsoft YaHei", "SimSun", "Calibri", serif; line-height: 1.6; }
                h1, h2, h3 { color: #1f2937; margin: 20px 0 12px; font-weight: bold; }
                p { margin-bottom: 14px; }
                img { max-width: 100%; height: auto; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #d1d5db; padding: 8px 12px; }
                .katex { margin: 0.5em 0; }
                math { font-size: 1.1em; } /* 让 MathML 在 Word 里更清晰 */
            </style>
        </head>
        <body>${finalHtmlBody}</body>
        </html>
      `;

      const convertedDocx = await asWordCompatibleBlob(documentHtml, {
        orientation: 'portrait',
        margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      });

      saveAs(convertedDocx, getSafeDocxFilename(documentTitle));

    } finally {
      document.body.removeChild(clone);
    }
  } catch (error) {
    console.error('导出 Word 出错（请打开 F12 看详细错误）:', error);
    alert(error?.message || '导出失败，请刷新页面重试（或勾选“公式转为图片”获得最高兼容）');
  } finally {
    if (onDownloadEnd) onDownloadEnd();
  }
};
