<template>
  <div class="converter-wrapper">
    <!-- 顶部导航栏 -->
    <header class="header">
      <div class="header-left">
        <h1>📄 Markdown 转 Word</h1>
        <span class="tagline">粘贴你的文章，一键导出排版完美的 .docx 文档</span>
      </div>
      <div class="header-right">
        <label class="compatibility-toggle" title="导出为图片格式，解决 WPS 和旧版 Word 公式乱码问题">
          <input type="checkbox" v-model="isWpsCompatible">
          <span>公式转为图片 (WPS 专用兼容模式)</span>
          <span style="color:#e67e22; font-size:0.85rem;">（不勾选 = Word 可编辑公式）</span>
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
            <!-- Upload MD 按钮 -->
            <button class="action-btn" @click="triggerMdUpload" :disabled="isReadingMd || isReadingPdf">
              <svg v-if="!isReadingMd" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
              </svg>
              <span v-else class="spinner mini"></span>
              {{ isReadingMd ? '读取中...' : '上传 MD' }}
            </button>
            <input type="file" ref="mdFileInput" @change="handleMdUpload" accept=".md" style="display: none;">

            <!-- Upload PDF 按钮 -->
            <button class="action-btn" @click="triggerPdfUpload" :disabled="isReadingMd || isReadingPdf">
              <svg v-if="!isReadingPdf" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
              </svg>
              <span v-else class="spinner mini"></span>
              {{ isReadingPdf ? '解析中...' : '上传 PDF' }}
            </button>
            <input type="file" ref="fileInput" @change="handleFileChange" accept=".pdf" style="display: none;">
          </div>
        </div>
        <!-- 使用 v-model 进行数据双向绑定，并添加拖拽支持 -->
        <textarea v-model="markdownContent" placeholder="在此输入或粘贴 Markdown 文本，或拖入文件..."
          :class="{ 'dragging': isDragging }" @dragover.prevent="handleDragOver" @dragleave.prevent="handleDragLeave"
          @drop.prevent="handleDrop"></textarea>
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

// 添加自定义 marked 扩展，解决中文和全角标点环境下 **粗体** 解析失败的问题
marked.use({
  extensions: [
    {
      name: 'strong',
      level: 'inline',
      start(src) { return src.match(/\*\*/)?.index; },
      tokenizer(src) {
        const match = /^\*\*([\s\S]+?)\*\*(?!\*)/.exec(src);
        if (match) {
          return {
            type: 'strong',
            raw: match[0],
            text: match[1],
            tokens: this.lexer.inlineTokens(match[1])
          };
        }
        return false;
      }
    },
    {
      name: 'em',
      level: 'inline',
      start(src) { return src.match(/\*(?!\*)/)?.index; },
      tokenizer(src) {
        const match = /^\*([^\s\*][\s\S]*?[^\s\*]|[^\s\*])\*(?!\*)/.exec(src);
        if (match) {
          return {
            type: 'em',
            raw: match[0],
            text: match[1],
            tokens: this.lexer.inlineTokens(match[1])
          };
        }
        return false;
      }
    }
  ]
});
import { asBlob } from 'html-docx-js-typescript';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import * as pdfjsLib from 'pdfjs-dist';
import * as docx from 'docx';
import temml from 'temml';
import { mml2omml } from 'mathml2omml';
import 'temml/dist/Temml-Latin-Modern.css';

// 设置 PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// 界面状态
const isWpsCompatible = ref(false); // 默认使用标准模式（原生公式），现代 WPS/Word 均支持良好
const isPreserveBreaks = ref(true);
const isOptimizePdf = ref(true);
const isDownloading = ref(false);
const isReadingPdf = ref(false);
const isReadingMd = ref(false);
const isDragging = ref(false);
const fileInput = ref(null);
const mdFileInput = ref(null);

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

      // 如果当前行不是新段落/列表/标题/表格，且上一行没有结束标点且不是表格，且上一行不是标题，则合并
      const lineEnders = /[。！？\.!\?;；\uff1a:]$/;
      const isTableLine = trimmed.startsWith('|');
      const isLastLineTable = lastTrimmed.startsWith('|');
      // 这里的正则必须与 generateDocxWithNativeMath/renderMarkdownWithMath 中的占位符格式严格一致
      const isMathBlock = /@@@MATHBLOCK|@@@MATHINLINE/.test(trimmed) || /@@@MATHBLOCK|@@@MATHINLINE/.test(lastTrimmed);
      const isStartOfNewPara = currentLineMarker || /^[#\s]/.test(trimmed) || isTableLine || /@@@MATHBLOCK/.test(trimmed);
      const isLastLineHeading = lastTrimmed.startsWith('#');

      if (!isStartOfNewPara && !isLastLineTable && !isMathBlock && !isLastLineHeading && lastTrimmed !== "" && !lineEnders.test(lastTrimmed)) {
        const joiner = /[\u4e00-\u9fa5]/.test(lastLine + processedLine) ? "" : " ";
        result[lastLineIndex] = lastLine + joiner + processedLine;
        continue;
      }
    }

    result.push(processedLine);
  }

  return result.join('\n');
};

// 统一维护一个极其全面的 LaTeX 常用数学符号到 Unicode 的映射字典
// 包含绝大部分无需排版、可直接作为纯文本输出的数学符号
const LATEX_SYMBOL_MAP = {
  // 希腊字母 (小写)
  '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ', '\\epsilon': 'ε', '\\varepsilon': 'ε',
  '\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ', '\\vartheta': 'ϑ', '\\iota': 'ι', '\\kappa': 'κ',
  '\\lambda': 'λ', '\\mu': 'μ', '\\nu': 'ν', '\\xi': 'ξ', '\\pi': 'π', '\\varpi': 'ϖ',
  '\\rho': 'ρ', '\\varrho': 'ϱ', '\\sigma': 'σ', '\\varsigma': 'ς', '\\tau': 'τ', '\\upsilon': 'υ',
  '\\phi': 'φ', '\\varphi': 'ϕ', '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
  // 希腊字母 (大写)
  '\\Gamma': 'Γ', '\\Delta': 'Δ', '\\Theta': 'Θ', '\\Lambda': 'Λ', '\\Xi': 'Ξ', '\\Pi': 'Π',
  '\\Sigma': 'Σ', '\\Upsilon': 'Υ', '\\Phi': 'Φ', '\\Psi': 'Ψ', '\\Omega': 'Ω',
  // 关系运算符
  '\\le': '≤', '\\leq': '≤', '\\ge': '≥', '\\geq': '≥', '\\neq': '≠', '\\sim': '~', '\\approx': '≈',
  '\\simeq': '≃', '\\equiv': '≡', '\\propto': '∝', '\\prec': '≺', '\\succ': '≻',
  '\\subset': '⊂', '\\supset': '⊃', '\\subseteq': '⊆', '\\supseteq': '⊇', '\\in': '∈', '\\notin': '∉', '\\ni': '∋',
  '\\models': '⊨', '\\perp': '⊥', '\\mid': '∣', '\\parallel': '∥',
  // 二元运算符
  '\\pm': '±', '\\mp': '∓', '\\times': '×', '\\div': '÷', '\\cdot': '·', '\\ast': '∗', '\\star': '⋆',
  '\\circ': '°', '\\bullet': '•', '\\oplus': '⊕', '\\ominus': '⊖', '\\otimes': '⊗', '\\oslash': '⊘',
  '\\odot': '⊙', '\\cap': '∩', '\\cup': '∪', '\\vee': '∨', '\\wedge': '∧', '\\setminus': '∖',
  // 箭头
  '\\leftarrow': '←', '\\rightarrow': '→', '\\uparrow': '↑', '\\downarrow': '↓', '\\leftrightarrow': '↔',
  '\\Leftarrow': '⇐', '\\Rightarrow': '⇒', '\\Uparrow': '⇑', '\\Downarrow': '⇓', '\\Leftrightarrow': '⇔',
  // 杂项与逻辑符号
  '\\infty': '∞', '\\partial': '∂', '\\nabla': '∇', '\\forall': '∀', '\\exists': '∃', '\\nexists': '∄',
  '\\emptyset': '∅', '\\angle': '∠', '\\triangle': '△', '\\hbar': 'ℏ', '\\ell': 'ℓ', '\\Re': 'ℜ', '\\Im': 'ℑ',
  '\\neg': '¬', '\\land': '∧', '\\lor': '∨'
};

/**
 * 清理 LaTeX 公式中的 Markdown 过度转义
 * 解决上传 MD 文件时，编辑器自动给 _, =, - 等符号加反斜杠的问题
 */
const cleanupMathContent = (latex) => {
  if (!latex) return '';
  return latex
    // 1. 处理常见的 Markdown 转义：这些在 LaTeX 中通常是无效或非预期的符号
    // 包括 =, _, -, *, +, ., !, [, ], (, )
    .replace(/\\([=+\-\[\]\(\)\.\!\*\_])/g, '$1')
    // 2. 处理可能被多重转义的反斜杠 (例如 \\int -> \int)
    // 针对反斜杠接字母的情况，统一缩减为单反斜杠
    .replace(/\\\\([a-zA-Z])/g, '\\$1');
};


/**
 * 将简单的 LaTeX 公式转换为带样式的 HTML 文本，用于支持 Word 中的字符级选中
 */
const convertSimpleMathToHtml = (latex) => {
  if (!latex) return '';
  let html = latex.trim();

  // 1. 符号映射转换 (将 LaTeX 常用数学符号转为 Unicode)
  for (const [key, val] of Object.entries(LATEX_SYMBOL_MAP)) {
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
  // 支持 _{...} 和 ^{...}
  html = html.replace(/_\{(.+?)\}/g, '<sub>$1</sub>');
  html = html.replace(/\^\{(.+?)\}/g, '<sup>$1</sup>');

  // 支持 _a 和 ^a, 并且扩展到支持带符号数字如 ^-3 或 ^0.5，以及单独的加减号(如 ^-) 
  html = html.replace(/_([a-zA-Z]+|[-+]?[0-9]+(?:\.[0-9]+)?|[-+])/g, '<sub>$1</sub>');
  html = html.replace(/\^([a-zA-Z]+|[-+]?[0-9]+(?:\.[0-9]+)?|[-+])/g, '<sup>$1</sup>');

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

  // 动态生成允许的命令列表：所有在 LATEX_SYMBOL_MAP 里的命令 + 特殊处理命令
  const allowedCmds = [...Object.keys(LATEX_SYMBOL_MAP), '\\text', '\\sqrt', '\\%'];

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

  let mathTokens = {};
  let tokenIndex = 0;

  // 1. 提取块级公式
  let processedText = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, mathContent) => {
    let token = `@@@MATHBLOCK${tokenIndex}@@@`;
    mathTokens[token] = { text: cleanupMathContent(mathContent), display: true };
    tokenIndex++;
    return `\n\n${token}\n\n`;
  });

  // 1.5 提取行内公式
  processedText = processedText.replace(/\$([^$\n]+?)\$/g, (match, mathContent) => {
    let token = `@@@MATHINLINE${tokenIndex}@@@`;
    mathTokens[token] = { text: cleanupMathContent(mathContent), display: false };
    tokenIndex++;
    return token;
  });

  // 2. PDF 优化预处理
  processedText = isOptimizePdf.value ? optimizePdfContent(processedText) : processedText;

  // 3. 基础 markdown 解析
  let html = marked.parse(processedText, { breaks: isPreserveBreaks.value });

  // 4. 填补渲染后的公式
  for (let token in mathTokens) {
    let mathInfo = mathTokens[token];
    try {
      const renderedMath = katex.renderToString(mathInfo.text.trim(), {
        displayMode: mathInfo.display,
        output: isForWord ? 'mathml' : 'htmlAndMathml',
        throwOnError: false
      });
      html = html.split(token).join(renderedMath);
    } catch (e) {
      console.error('KaTeX error:', e);
      html = html.split(token).join(`<span style="color:red">[公式错误: ${mathInfo.text}]</span>`);
    }
  }
  return html;
};

// 计算属性：当 markdownContent 改变时，自动重新计算并更新预览
const previewHtml = computed(() => {
  return renderMarkdownWithMath(markdownContent.value, false);
});

// 下载 Word 文档的处理函数
// 下载 Word 文档的处理函数（统一 html-docx 路径 + 非图片模式保留 MathML 可编辑公式）
// 下载 Word 文档的处理函数（最终版：非图片模式保留 KaTeX MathML 可编辑公式 + 完整 emoji 处理）
const downloadWord = async () => {
  if (!markdownContent.value.trim()) {
    alert("请输入或粘贴一些 Markdown 内容！");
    return;
  }

  isDownloading.value = true;

  try {
    const previewEl = document.querySelector('.preview');
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
      if (!isWpsCompatible.value) {
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
            isDownloading.value = false;
            return;
          }
        }
      }
      if (isWpsCompatible.value) {
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
      // ====================== 非图片模式（保留 KaTeX MathML → Word 可双击编辑公式） ======================
      else {
        // 什么都不做！直接使用预览区已渲染的完整 MathML（这就是你想要的可编辑公式）
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

      const convertedDocx = await asBlob(documentHtml, {
        orientation: 'portrait',
        margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      });

      saveAs(convertedDocx, '文档导出.docx');

    } finally {
      document.body.removeChild(clone);
    }
  } catch (error) {
    console.error('导出 Word 出错（请打开 F12 看详细错误）:', error);
    alert('导出失败，请刷新页面重试（或勾选“公式转为图片”获得最高兼容）');
  } finally {
    isDownloading.value = false;
  }
};
/**
 * 使用 docx.js 和 temml 生成带原生公式的 Word 文档
 */

/**
 * 使用 docx.js + temml 生成带原生 Office Math 公式的文档（已彻底修复占位符问题）
 * 任何渲染失败的公式都会显示为 [公式: 原始LaTeX]（红色斜体），再也不会出现 @@@MATHBLOCKGENxxx@@@
 */
/**
 * 使用 docx.js + katex 生成原生 Office Math 公式（已彻底解决占位符 + Temml 兼容问题）
 * 现在你的积分、二项式、向量、物理公式都会显示为真正的可编辑 Word 公式！
 */


/**
 * 触发文件选择
 */
const triggerPdfUpload = () => {
  fileInput.value?.click();
};

const triggerMdUpload = () => {
  mdFileInput.value?.click();
};

/**
 * 拖拽相关处理
 */
const handleDragOver = () => {
  isDragging.value = true;
};

const handleDragLeave = () => {
  isDragging.value = false;
};

const handleDrop = (event) => {
  isDragging.value = false;
  const files = event.dataTransfer.files;
  if (files && files.length > 0) {
    handleFile(files[0]);
  }
};

/**
 * 处理文件上传 (兼容手动选择和拖拽)
 */
const handleMdUpload = (event) => {
  const file = event.target.files[0];
  if (file) handleFile(file);
  event.target.value = ''; // 清空以支持重复上传
};

const handleFile = async (file) => {
  if (file.name.toLowerCase().endsWith('.pdf')) {
    await processPdf(file);
  } else if (file.name.toLowerCase().endsWith('.md')) {
    await processMd(file);
  } else {
    alert('暂不支持该文件格式，请上传 PDF 或 Markdown 文件。');
  }
};

/**
 * 处理 Markdown 文件
 */
const processMd = async (file) => {
  isReadingMd.value = true;
  try {
    const text = await file.text();
    markdownContent.value = text;
  } catch (error) {
    console.error('读取 Markdown 出错:', error);
    alert('读取文件失败，请重试。');
  } finally {
    isReadingMd.value = false;
  }
};

/**
 * 处理 PDF 文件 (从原 handlePdfUpload 提取)
 */
const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (file) handleFile(file);
  event.target.value = '';
};

const processPdf = async (file) => {
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
  border: 2px solid transparent;
  padding: 1.25rem;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  outline: none;
  background-color: #ffffff;
  color: #1f2937;
  transition: all 0.2s;
}

textarea.dragging {
  background-color: #f0f7ff;
  border-color: #3b82f6;
  border-style: dashed;
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