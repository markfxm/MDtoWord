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
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z">
            </path>
          </svg>
          Markdown 输入区
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

// 界面状态
const isWpsCompatible = ref(true);
const isPreserveBreaks = ref(true);
const isOptimizePdf = ref(true);
const isDownloading = ref(false);

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
  let inNumberedBlock = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let trimmed = line.trim();

    // 识别 PDF 特殊符号和标准列表
    const pdfBulletRegex = /^[•●○▪▫]\s*/;
    const numberedListRegex = /^\d+\.\s+/;
    const standardListRegex = /^([*+-]|\d+\.)\s+/;

    let processedLine = "";
    let isListOrHeader = false;

    if (numberedListRegex.test(trimmed)) {
      inNumberedBlock = true;
      processedLine = trimmed;
      isListOrHeader = true;
    } else if (trimmed === "") {
      processedLine = "";
      if (!inNumberedBlock) inNumberedBlock = false;
    } else {
      const isPdfBullet = pdfBulletRegex.test(trimmed);
      const isStandard = standardListRegex.test(trimmed);

      if (isPdfBullet || isStandard) {
        let marker = "* ";
        let content = trimmed.replace(pdfBulletRegex, "").replace(standardListRegex, "");
        let indent = inNumberedBlock ? "   " : "";
        processedLine = indent + marker + content;
        isListOrHeader = true;
      } else {
        processedLine = (inNumberedBlock ? "   " : "") + trimmed;
      }
    }

    // --- 智能合行逻辑 (Smart Unwrapping) ---
    // 如果上一行不是以标点结尾，且当前行不是列表/标题，则合并
    if (result.length > 0 && processedLine !== "" && !isListOrHeader) {
      let lastLine = result[result.length - 1];
      let lastTrimmed = lastLine.trim();

      // 检查上一行是否是一个可以继续的段落行
      // 1. 不是列表或标题
      const lastLineIsList = standardListRegex.test(lastTrimmed) || numberedListRegex.test(lastTrimmed);
      // 2. 没有以终结标点结尾
      const lineEnders = /[。！？\.!\?;；\uff1a:]$/;

      if (!lastLineIsList && lastTrimmed !== "" && !lineEnders.test(lastTrimmed)) {
        // 合并到上一行
        const hasChinese = /[\u4e00-\u9fa5]/.test(lastLine + processedLine);
        const joiner = hasChinese ? "" : " ";
        result[result.length - 1] = lastLine + joiner + trimmed;
        continue;
      }
    }

    result.push(processedLine);
  }

  return result.join('\n');
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
      // 以前能显示是因为 <annotation> 里的原始文本被当作普通文字显示了。
      // 我们在此保留全部输出，但在“标准模式”下载时 Word 可能会回退到显示 LaTeX 源码。
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

          // 创建图片标签并替换克隆中的节点
          const img = document.createElement('img');
          img.src = dataUrl;

          // 适配公式显示模式
          if (cloneNode.classList.contains('katex-display')) {
            img.style.display = 'block';
            img.style.margin = '1.2em auto';
          } else {
            // 行内公式优化：WPS/Word 中的图片基准线通常显著偏高
            // 使用 middle + 较大的负边距可以更稳健地将公式“压”回正文水平线
            img.style.verticalAlign = 'middle';
            img.style.marginBottom = '-4px'; // 强力下拉，解决上漂问题
            img.style.display = 'inline-block';
            img.style.marginLeft = '2px';
            img.style.marginRight = '2px';
          }

          // 设置合适的大小
          const rect = targetToCapture.getBoundingClientRect();
          img.width = rect.width;
          img.height = rect.height;

          cloneNode.parentNode.replaceChild(img, cloneNode);
        }
        finalHtmlBody = clone.innerHTML;
      } finally {
        document.body.removeChild(clone);
      }
    } else {
      // 标准模式：直接生成（Word 可能回退到文本显示）
      finalHtmlBody = renderMarkdownWithMath(markdownContent.value, true);
    }

    // 注入 Word 专用排版样式
    // 增加 img 样式确保图片不会由于太大而错位
    const documentHtml = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <style>
              body { font-family: "Microsoft YaHei", "SimSun", "Calibri", sans-serif; line-height: 1.6; color: #333333; }
              h1, h2, h3, h4, h5, h6 { color: #1f2937; margin-top: 20px; margin-bottom: 12px; font-weight: bold; }
              h1 { font-size: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
              p { margin-bottom: 14px; }
              img { max-width: 100%; height: auto; }
              table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
              th, td { border: 1px solid #d1d5db; padding: 8px 12px; }
              ul, ol { padding-left: 24px; margin-bottom: 14px; }
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
  gap: 8px;
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