<template>
  <div class="converter-wrapper">
    <!-- 顶部导航栏 -->
    <header class="header">
      <div class="header-left">
        <h1>📄 Markdown 转 Word</h1>
        <span class="tagline">粘贴你的文章，一键导出排版完美的 .docx 文档</span>
      </div>
      <div class="header-right">
        <label class="compatibility-toggle" title="解决 WPS 和旧版 Word 公式乱码问题">
          <input type="checkbox" v-model="isWpsCompatible">
          <span>WPS 兼容模式</span>
        </label>
        <label class="compatibility-toggle" title="允许单换行直接转换为换行符（对 PDF 复制很有用）">
          <input type="checkbox" v-model="isPreserveBreaks">
          <span>保留换行</span>
        </label>
        <label class="compatibility-toggle" title="自动转换 PDF 特殊符号并恢复列表缩进">
          <input type="checkbox" v-model="isOptimizePdf">
          <span>PDF 优化</span>
        </label>
        <button class="download-btn" @click="downloadWord" :disabled="isDownloading">
          <svg v-if="!isDownloading" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
          </svg>
          <span v-else class="spinner"></span>
          {{ isDownloading ? '正在处理...' : '下载 Word' }}
        </button>
      </div>
    </header>

    <!-- 主体内容区 -->
    <main class="container">
      <!-- 输入区 -->
      <div class="pane">
        <div class="pane-title">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z">
              </path>
            </svg>
            Markdown 输入区
          </div>
          <div class="pane-actions">
            <button class="action-btn" @click="triggerPdfUpload" :disabled="isReadingPdf">
              <svg v-if="!isReadingPdf" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
              </svg>
              <span v-else class="spinner mini"></span>
              {{ isReadingPdf ? '解析中...' : '上传 PDF' }}
            </button>
            <input type="file" ref="fileInput" @change="handlePdfUpload" accept=".pdf" style="display: none;">
          </div>
        </div>
        <!-- 使用 v-model 进行数据双向绑定 -->
        <textarea v-model="markdownContent" placeholder="在此输入或粘贴 Markdown 文本..."></textarea>
      </div>

      <!-- 预览区 -->
      <div class="pane">
        <div class="pane-title">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z">
            </path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z">
            </path>
          </svg>
          实时预览
        </div>
        <!-- 使用 v-html 渲染计算属性生成的安全 HTML -->
        <div class="preview" v-html="previewHtml"></div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { marked } from 'marked';
import katex from 'katex';
import 'katex/dist/katex.min.css'; // 必须引入 KaTeX 的 CSS
import { asBlob } from 'html-docx-js-typescript';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import * as pdfjsLib from 'pdfjs-dist';

// 设置 PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// 界面状态
const isWpsCompatible = ref(true);
const isPreserveBreaks = ref(true);
const isOptimizePdf = ref(true);
const isDownloading = ref(false);
const isReadingPdf = ref(false);
const fileInput = ref(null);

// 初始占位文本
const markdownContent = ref(`# 操作说明

1. 清空本区域，在此处粘贴您的 Markdown 文本。
2. 在右侧实时预览排版效果。
3. 点击右上角的“下载 Word 文档”按钮，即可一键导出 \`.docx\` 文件。

（您可以全选删除这段文字后开始使用）`);

/**
 * PDF 粘贴内容预处理：修复丢失的列表符号和缩进
 */
const optimizePdfContent = (text) => {
  if (!text) return '';

  let lines = text.split('\n');
  let result = [];
  let pendingMarker = null;

  const pdfBulletRegex = /^[•●○▪▫](?:\s|$)/;
  const numberedListRegex = /^\d+[\.、]\s*/;
  const mdListRegex = /^[*+-]\s+/;

  for (let i = 0; i < lines.length; i++) {
    let rawLine = lines[i];
    let trimmed = rawLine.trim();

    if (trimmed === "") {
      // 如果正在等待列表内容的文字，跳过空行
      if (pendingMarker) continue;
      result.push("");
      continue;
    }

    let processedLine = trimmed;
    let currentLineMarker = null;

    // 1. 识别列表标记
    if (pdfBulletRegex.test(trimmed)) {
      currentLineMarker = "* ";
      processedLine = trimmed.replace(pdfBulletRegex, "").trim();
    } else if (numberedListRegex.test(trimmed)) {
      const match = trimmed.match(numberedListRegex);
      const numPart = match[0].match(/\d+/)[0];
      currentLineMarker = `${numPart}. `;
      processedLine = trimmed.replace(numberedListRegex, "").trim();
    } else if (mdListRegex.test(trimmed)) {
      const match = trimmed.match(mdListRegex);
      currentLineMarker = match[0];
      processedLine = trimmed.replace(mdListRegex, "").trim();
    }

    // 2. 处理标记与文字分离的情况 (Dangling Marker)
    if (currentLineMarker) {
      if (processedLine === "") {
        pendingMarker = currentLineMarker;
        continue;
      } else {
        processedLine = currentLineMarker + processedLine;
        pendingMarker = null;
      }
    } else if (pendingMarker) {
      processedLine = pendingMarker + processedLine;
      pendingMarker = null;
    }

    // 3. 智能合行逻辑 (加强版)
    if (result.length > 0) {
      let lastLineIndex = result.length - 1;
      let lastLine = result[lastLineIndex];
      let lastTrimmed = lastLine.trim();

      // 如果当前行不是新段落/列表/标题，且上一行没有结束标点，则合并
      const lineEnders = /[。！？\.!\?;；\uff1a:]$/;
      const isStartOfNewPara = currentLineMarker || /^[#\s]/.test(trimmed);

      if (!isStartOfNewPara && lastTrimmed !== "" && !lineEnders.test(lastTrimmed)) {
        const joiner = /[\u4e00-\u9fa5]/.test(lastLine + processedLine) ? "" : " ";
        result[lastLineIndex] = lastLine + joiner + processedLine;
        continue;
      }
    }

    result.push(processedLine);
  }

  return result.join('\n');
};

/**
 * 将简单的 LaTeX 公式转换为带样式的 HTML 文本，用于支持 Word 中的字符级选中
 */
const convertSimpleMathToHtml = (latex) => {
  if (!latex) return '';
  let html = latex.trim();

  // 1. 符号映射转换 (将 LaTeX 常用数学符号转为 Unicode)
  const symbolMap = {
    '\\ge': '≥', '\\le': '≤', '\\pm': '±', '\\approx': '≈', '\\neq': '≠',
    '\\cdot': '·', '\\times': '×', '\\div': '÷', '\\infty': '∞',
    '\\sigma': 'σ', '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ',
    '\\epsilon': 'ε', '\\theta': 'θ', '\\lambda': 'λ', '\\mu': 'μ', '\\pi': 'π',
    '\\phi': 'φ', '\\omega': 'ω', '\\Delta': 'Δ', '\\Omega': 'Ω',
    '\\partial': '∂', '\\nabla': '∇', '\\forall': '∀', '\\exists': '∃', '\\circ': '°', '\\sim': '~'
  };

  for (const [key, val] of Object.entries(symbolMap)) {
    // 改进正则：确保匹配反斜杠开始，且后续不接字母（除非是完全匹配）
    const escapedKey = key.replace(/\\/g, '\\\\');
    // 如果后面紧跟 YS 这种字母，只要 key 匹配完了，就应该替换 (例如 \sigmaYS -> σYS)
    const regex = new RegExp(escapedKey + '(?![a-zA-Z])|' + escapedKey, 'g');
    html = html.replace(regex, val);
  }

  // 1.5 处理根号和特殊符号
  html = html.replace(/\\sqrt\{(.+?)\}/g, '√$1');
  html = html.replace(/\\sqrt\s*([a-zA-Z0-9])/g, '√$1');
  html = html.replace(/\\%/g, '%');

  // 2. 基础清理
  html = html.replace(/\\text\{(.+?)\}/g, '$1');

  // 3. 处理上下标
  html = html.replace(/_\{(.+?)\}/g, '<sub>$1</sub>');
  html = html.replace(/_([a-zA-Z0-9])/g, '<sub>$1</sub>');
  html = html.replace(/\^\{(.+?)\}/g, '<sup>$1</sup>');
  html = html.replace(/\^([a-zA-Z0-9])/g, '<sup>$1</sup>');

  // 4. 数学变量斜体处理 (仅针对单个字母变量，避开 HTML 标签)
  // 统一使用 Times New Roman 会更像公式
  return `<span style="font-family: 'Times New Roman', serif;">${html.replace(/(?<!<[^>]*)\b([a-zA-Z])\b(?![^<]*>)/g, '<i>$1</i>')}</span>`;
};

/**
 * 判断公式是否足够简单可以转为 HTML 文本
 */
const isSimpleMath = (latex) => {
  if (!latex) return false;
  // 排除复杂结构：分式、矩阵、求和、积分、大型括号
  const complexPatterns = /\\frac|\\sum|\\int|\\begin|\\matrix|\\over|\\left|\\right|\\mathcal|\\mathbb|\\Large|\\small/;
  if (complexPatterns.test(latex)) return false;

  // 如果包含未被 convertSimpleMathToHtml 处理的反斜杠命令，则不视为简单公式
  // 允许的命令列表
  const allowedCmds = ['\\ge', '\\le', '\\pm', '\\approx', '\\neq', '\\cdot', '\\times', '\\div', '\\infty', '\\sigma', '\\alpha', '\\beta', '\\gamma', '\\delta', '\\epsilon', '\\theta', '\\lambda', '\\mu', '\\pi', '\\phi', '\\omega', '\\Delta', '\\Omega', '\\partial', '\\nabla', '\\forall', '\\exists', '\\text', '\\sqrt', '\\circ', '\\sim'];

  const cmds = latex.match(/\\[a-zA-Z]+/g) || [];
  for (const cmd of cmds) {
    if (!allowedCmds.includes(cmd)) return false;
  }

  return latex.length < 80; // 适当放宽长度
};

/**
 * 核心转换函数
 * @param {string} text - 输入的 Markdown 文本
 * @param {boolean} isForWord - 是否为导出 Word (Word 需要 mathml 格式)
 */
const renderMarkdownWithMath = (text, isForWord = false) => {
  if (!text) return '';

  // 0. PDF 优化预处理
  let processedText = isOptimizePdf.value ? optimizePdfContent(text) : text;

  let mathTokens = {};
  let tokenIndex = 0;

  // 1. 提取块级公式
  processedText = processedText.replace(/\$\$([\s\S]+?)\$\$/g, (match, mathContent) => {
    let token = `MTHBLOCK${tokenIndex}MTH`;
    mathTokens[token] = { text: mathContent, display: true };
    tokenIndex++;
    return `\n${token}\n`;
  });

  // 2. 提取行内公式
  processedText = processedText.replace(/\$([^$\n]+?)\$/g, (match, mathContent) => {
    let token = `MTHINLINE${tokenIndex}MTH`;
    mathTokens[token] = { text: mathContent, display: false };
    tokenIndex++;
    return token;
  });

  // 3. 基础 markdown 解析
  let html = marked.parse(processedText, { breaks: isPreserveBreaks.value });

  // 4. 填补渲染后的公式
  for (let token in mathTokens) {
    let mathInfo = mathTokens[token];
    try {
      let renderedMath = katex.renderToString(mathInfo.text.trim(), {
        displayMode: mathInfo.display,
        output: isForWord ? 'mathml' : 'htmlAndMathml',
        throwOnError: false
      });

      // 注：Word 的 docx 转换库通常不直接支持复杂的 MathML。
      html = html.replace(token, renderedMath);
    } catch (e) {
      // 如果公式有语法错误，原样输出避免页面崩溃
      html = html.replace(token, mathInfo.text);
    }
  }
  return html;
};

// 计算属性：当 markdownContent 改变时，自动重新计算并更新预览
const previewHtml = computed(() => {
  return renderMarkdownWithMath(markdownContent.value, false);
});

// 下载 Word 文档的处理函数
const downloadWord = async () => {
  if (!markdownContent.value.trim()) {
    alert("请输入或粘贴一些 Markdown 内容！");
    return;
  }

  isDownloading.value = true;

  try {
    let finalHtmlBody = '';

    if (isWpsCompatible.value) {
      // WPS 兼容模式：将各公式节点转为图片
      const previewEl = document.querySelector('.preview');
      if (!previewEl) throw new Error('找不到预览容器');

      // 1. 克隆一份用于导出，避免直接修改用户看到的预览区
      const clone = previewEl.cloneNode(true);
      // 将克隆临时挂载到 DOM，确保样式计算正确（隐藏在屏幕外）
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = previewEl.clientWidth + 'px';
      clone.style.height = 'auto';
      document.body.appendChild(clone);

      try {
        // 2. 找到预览区真实可见的公式节点
        const originalMathNodes = previewEl.querySelectorAll('.katex');
        const cloneMathNodes = clone.querySelectorAll('.katex');

        // 3. 逐个转换并替换
        for (let i = 0; i < originalMathNodes.length; i++) {
          const originalNode = originalMathNodes[i];
          const cloneNode = cloneMathNodes[i];

          // 专门针对 .katex-html 部分进行捕捉，避免 MathML 干扰位置计算
          const targetToCapture = originalNode.querySelector('.katex-html') || originalNode;

          // 尝试从 MathML 的 annotation 节点获取原始文本
          let rawLatex = "";
          const annotation = originalNode.querySelector('annotation');
          if (annotation) {
            rawLatex = annotation.textContent;
          }

          // --- 智选模式：如果公式简单，直接输出 HTML 文本而非图片 ---
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

          // 使用 html2canvas 捕捉真实的渲染效果
          const canvas = await html2canvas(targetToCapture, {
            backgroundColor: null,
            scale: 3, // 提高采样率获取更清晰文字
            useCORS: true,
            logging: false,
            removeContainer: true,
            onclone: (clonedDoc) => {
              // 在克隆中彻底隐藏 MathML，防止其影响布局
              const mathmlElements = clonedDoc.querySelectorAll('.katex-mathml');
              mathmlElements.forEach(el => el.style.display = 'none');
            }
          });

          const dataUrl = canvas.toDataURL('image/png');

          // 创建图片标签
          const img = document.createElement('img');
          img.src = dataUrl;

          img.alt = rawLatex || 'Math Formula';
          img.title = 'LaTeX: ' + (rawLatex || '');

          // 设置合适的大小（必须 restore，否则图片会比例失调或巨大）
          const rect = targetToCapture.getBoundingClientRect();
          img.width = rect.width;
          img.height = rect.height;

          // 适配公式显示模式
          if (cloneNode.classList.contains('katex-display')) {
            const blockWrapper = document.createElement('div');
            blockWrapper.style.textAlign = 'center';
            blockWrapper.style.margin = '1.2em auto';

            img.style.display = 'inline-block';

            blockWrapper.appendChild(img);
            cloneNode.parentNode.replaceChild(blockWrapper, cloneNode);
          } else {
            // 行内公式
            img.style.display = 'inline-block';
            img.style.verticalAlign = 'middle';
            img.style.marginBottom = '-4px';
            img.style.marginLeft = '2px';
            img.style.marginRight = '2px';

            cloneNode.parentNode.replaceChild(img, cloneNode);
          }
        }

        // --- WPS 兼容性增强：清理 <li> 中的嵌套层级 ---
        const listItems = clone.querySelectorAll('li');
        listItems.forEach(li => {
          // 如果 <li> 内部有 <p>，WPS 会认为要另起一段，导致项目符号单独占一行。
          const paragraphs = li.querySelectorAll('p, div');
          paragraphs.forEach(p => {
            const span = document.createElement('span');
            span.innerHTML = p.innerHTML;
            p.parentNode.replaceChild(span, p);
          });
          // 移除辅助换行，避免 WPS 解析出多余空行
          li.innerHTML = li.innerHTML.trim().replace(/\n/g, ' ');
        });

        finalHtmlBody = clone.innerHTML;
      } finally {
        document.body.removeChild(clone);
      }
    } else {
      // 标准模式：直接生成（Word 可能回退到文本显示）
      finalHtmlBody = renderMarkdownWithMath(markdownContent.value, true);
    }

    // --- 增强：使用 Twemoji 将 Emoji 转换为图片，彻底解决 Word/WPS 中黑白或方块的问题 ---
    const wrapEmojisInHtml = (htmlStr) => {
      // 匹配绝大多数常见 Emoji 的正则
      const emojiRegex = /([\u{1F300}-\u{1F5FF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F191}-\u{1F251}])/gu;
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlStr;

      const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null, false);
      let node;
      const textNodes = [];
      while ((node = walker.nextNode())) {
        if (emojiRegex.test(node.nodeValue)) {
          textNodes.push(node);
        }
      }

      // 获取 emoji 的 unicode 代码点 (用于拼接图片 URL)
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
          if (match.index > lastIdx) {
            fragment.appendChild(document.createTextNode(n.nodeValue.slice(lastIdx, match.index)));
          }

          const codePoint = toCodePoint(match[0]);
          // 使用开源 CDN 获取标准 Twemoji 图像
          const img = document.createElement('img');
          img.src = `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/${codePoint}.png`;
          img.alt = match[0];

          // 动态计算父节点的字号大小
          let fontSizePx = 18; // 默认值
          try {
            if (n.parentNode) {
              const computedStyle = window.getComputedStyle(n.parentNode);
              const fontSizeStr = computedStyle.fontSize;
              if (fontSizeStr && fontSizeStr.endsWith('px')) {
                fontSizePx = parseFloat(fontSizeStr);
              }
            }
          } catch (e) {
            // 忽略计算异常
          }

          // Word 对图片的尺寸识别强依赖 width 和 height 属性
          // 取字号的 1.2 倍作为宽高，与 CSS 的 1.2em 保持一致
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

        if (lastIdx < n.nodeValue.length) {
          fragment.appendChild(document.createTextNode(n.nodeValue.slice(lastIdx)));
        }
        n.parentNode.replaceChild(fragment, n);
      });

      return tempDiv.innerHTML;
    };

    finalHtmlBody = wrapEmojisInHtml(finalHtmlBody);

    // 注入 Word 专用排版样式并优化命名空间
    const documentHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
          <meta charset="utf-8">
          <!--[if gte mso 9]>
          <xml>
            <w:WordDocument>
              <w:View>Print</w:View>
              <w:Zoom>100</w:Zoom>
              <w:DoNotOptimizeForBrowser/>
            </w:WordDocument>
          </xml>
          <![endif]-->
          <style>
              body { font-family: "Microsoft YaHei", "SimSun", "Calibri", "Segoe UI Emoji", "Apple Color Emoji", "Segoe UI Symbol", sans-serif; line-height: 1.6; color: #333333; }
              h1, h2, h3, h4, h5, h6 { color: #1f2937; margin-top: 20px; margin-bottom: 12px; font-weight: bold; }
              h1 { font-size: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
              p { margin-bottom: 14px; }
              img { max-width: 100%; height: auto; }
              table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
              th, td { border: 1px solid #d1d5db; padding: 8px 12px; }
              ul, ol { padding-left: 24px; margin-bottom: 14px; }
              i { font-family: "Times New Roman", serif; font-style: italic; }
              sub, sup { font-size: 75%; line-height: 0; position: relative; vertical-align: baseline; }
              sup { top: -0.5em; }
              sub { bottom: -0.25em; }
          </style>
      </head>
      <body>
          ${finalHtmlBody}
      </body>
      </html>
    `;

    const convertedDocx = await asBlob(documentHtml, {
      orientation: 'portrait',
      margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
    });

    saveAs(convertedDocx, '文档导出.docx');
  } catch (error) {
    console.error('导出 Word 出错:', error);
    alert('导出失败，请检查公式是否过于复杂或尝试刷新页面重试。');
  } finally {
    isDownloading.value = false;
  }
};

/**
 * 触发文件选择
 */
const triggerPdfUpload = () => {
  fileInput.value?.click();
};

/**
 * 处理文件上传
 */
const handlePdfUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  if (file.type !== 'application/pdf') {
    alert('请选择 PDF 文件！');
    return;
  }

  isReadingPdf.value = true;
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      let lastY = -1;
      let pageText = '';

      for (const item of textContent.items) {
        if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
          pageText += '\n';
        }
        pageText += item.str;
        lastY = item.transform[5];
      }
      fullText += pageText + '\n\n';
    }

    markdownContent.value = fullText.trim();
    // 清除文件输入值，以便于再次上传同一文件
    event.target.value = '';
  } catch (error) {
    console.error('解析 PDF 出错:', error);
    alert('解析 PDF 失败，请确保文件未加密且格式正确。');
  } finally {
    isReadingPdf.value = false;
  }
};
</script>

<style scoped>
/* Scoped 样式确保不会污染全局 */
.converter-wrapper {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background-color: #f3f4f6;
  color: #374151;
  display: flex;
  flex-direction: column;
  height: 100vh;
  margin: 0;
}

.header {
  background-color: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.header h1 {
  font-size: 1.25rem;
  color: #111827;
  font-weight: 600;
  margin: 0;
}

.tagline {
  font-size: 0.875rem;
  color: #6b7280;
  margin-left: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.compatibility-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  color: #4b5563;
  cursor: pointer;
  user-select: none;
}

.compatibility-toggle input {
  cursor: pointer;
  width: 16px;
  height: 16px;
}

.download-btn {
  background-color: #2563eb;
  color: white;
  border: none;
  padding: 10px 20px;
  font-size: 0.95rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.download-btn:disabled {
  background-color: #94a3b8;
  cursor: not-allowed;
  transform: none;
}

.download-btn:hover:not(:disabled) {
  background-color: #1d4ed8;
  transform: translateY(-1px);
}

.download-btn:active:not(:disabled) {
  transform: translateY(0);
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.container {
  display: flex;
  flex: 1;
  overflow: hidden;
  padding: 1.5rem 1.5rem 3rem 1.5rem;
  gap: 1.5rem;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.pane-title {
  background: #f9fafb;
  padding: 0.75rem 1.25rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #4b5563;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pane-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  background-color: transparent;
  border: 1px solid #e5e7eb;
  padding: 4px 8px;
  font-size: 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  color: #4b5563;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}

.action-btn:hover {
  background-color: #f3f4f6;
  border-color: #d1d5db;
  color: #1f2937;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner.mini {
  width: 12px;
  height: 12px;
  border-width: 1.5px;
}

textarea {
  flex: 1;
  border: none;
  padding: 1.25rem;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  outline: none;
  background-color: #ffffff;
  color: #1f2937;
}

.preview {
  flex: 1;
  padding: 1.5rem 2rem;
  overflow-y: auto;
  line-height: 1.7;
  font-size: 15px;
  color: #24292f;
  text-align: left;
}

/* 预览区 Markdown 样式 - 需使用 :deep() 穿透作用域 */
.preview :deep(h1),
.preview :deep(h2),
.preview :deep(h3),
.preview :deep(h4) {
  font-weight: 600;
  margin-top: 24px;
  margin-bottom: 16px;
  line-height: 1.25;
}

.preview :deep(h1) {
  font-size: 2em;
  border-bottom: 1px solid #d0d7de;
  padding-bottom: 0.3em;
}

.preview :deep(h2) {
  font-size: 1.5em;
  border-bottom: 1px solid #d0d7de;
  padding-bottom: 0.3em;
}

.preview :deep(h3) {
  font-size: 1.25em;
}

.preview :deep(p) {
  margin-bottom: 16px;
}

.preview :deep(a) {
  color: #0969da;
  text-decoration: none;
}

.preview :deep(ul),
.preview :deep(ol) {
  padding-left: 2em;
  margin-bottom: 16px;
}

.preview :deep(code) {
  background-color: rgba(175, 184, 193, 0.2);
  padding: 0.2em 0.4em;
  border-radius: 6px;
  font-family: monospace;
  font-size: 85%;
}

.preview :deep(pre) {
  background-color: #f6f8fa;
  padding: 16px;
  border-radius: 6px;
  overflow: auto;
  margin-bottom: 16px;
}

.preview :deep(pre code) {
  background-color: transparent;
  padding: 0;
  font-size: 85%;
}

.preview :deep(blockquote) {
  border-left: 0.25em solid #d0d7de;
  padding: 0 1em;
  color: #57606a;
  margin: 0 0 16px 0;
}

.preview :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 16px;
}

.preview :deep(th),
.preview :deep(td) {
  border: 1px solid #d0d7de;
  padding: 6px 13px;
}

.preview :deep(th) {
  background-color: #f6f8fa;
  font-weight: 600;
}

.preview :deep(img) {
  max-width: 100%;
  box-sizing: content-box;
}
</style>