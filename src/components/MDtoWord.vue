<template>
  <div class="converter-wrapper">
    <!-- 顶部导航栏 -->
    <header class="header">
      <div class="header-left">
        <h1>📄 Markdown 转 Word</h1>
        <span class="tagline">粘贴你的文章，一键导出排版完美的 .docx 文档</span>
      </div>
      <button class="download-btn" @click="downloadWord">
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
        </svg>
        下载 Word 文档
      </button>
    </header>

    <!-- 主体内容区 -->
    <main class="container">
      <!-- 输入区 -->
      <div class="pane">
        <div class="pane-title">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
          Markdown 输入区
        </div>
        <!-- 使用 v-model 进行数据双向绑定 -->
        <textarea 
          v-model="markdownContent" 
          placeholder="在此输入或粘贴 Markdown 文本..."
        ></textarea>
      </div>

      <!-- 预览区 -->
      <div class="pane">
        <div class="pane-title">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
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

// 初始占位文本
const markdownContent = ref(`# 操作说明

1. 清空本区域，在此处粘贴您的 Markdown 文本。
2. 在右侧实时预览排版效果。
3. 点击右上角的“下载 Word 文档”按钮，即可一键导出 \`.docx\` 文件。

（您可以全选删除这段文字后开始使用）`);

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
  let html = marked.parse(processedText);

  // 4. 填补渲染后的公式
  for (let token in mathTokens) {
    let mathInfo = mathTokens[token];
    try {
      let renderedMath = katex.renderToString(mathInfo.text.trim(), {
        displayMode: mathInfo.display,
        output: isForWord ? 'mathml' : 'htmlAndMathml',
        throwOnError: false
      });
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

  // 生成专供 Word 使用的 HTML 源（包含纯 MathML）
  const rawHtml = renderMarkdownWithMath(markdownContent.value, true);

  // 注入 Word 专用排版样式
  const documentHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: "Microsoft YaHei", "SimSun", "Calibri", sans-serif; line-height: 1.6; color: #333333; }
            h1, h2, h3, h4, h5, h6 { color: #1f2937; margin-top: 20px; margin-bottom: 12px; font-weight: bold; }
            h1 { font-size: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
            h2 { font-size: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
            p { margin-bottom: 14px; }
            code { font-family: "Courier New", monospace; background-color: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-size: 10.5pt; }
            pre { background-color: #f3f4f6; padding: 12px; border-radius: 4px; }
            pre code { background-color: transparent; padding: 0; }
            blockquote { border-left: 4px solid #d1d5db; margin: 0; padding-left: 12px; color: #4b5563; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
            th, td { border: 1px solid #d1d5db; padding: 8px 12px; }
            th { background-color: #f3f4f6; font-weight: bold; }
            ul, ol { padding-left: 24px; margin-bottom: 14px; }
        </style>
    </head>
    <body>
        ${rawHtml}
    </body>
    </html>
  `;

  try {
    // 转为 docx 文件 Blob 并下载
    const convertedDocx = await asBlob(documentHtml, { 
      orientation: 'portrait', 
      margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 } 
    });
    
    console.log('convertedDocx type:', typeof convertedDocx);
    console.log('convertedDocx is Blob:', convertedDocx instanceof Blob);
    console.log('convertedDocx:', convertedDocx);

    saveAs(convertedDocx, '文档导出.docx');
  } catch (error) {
    console.error('导出 Word 出错:', error);
    alert('导出 Word 时出错，请检查控制台。');
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
  margin: -8px; /* 抵消默认 body margin 如果有的话 */
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
  align-items: center;
  gap: 10px;
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
  margin-left: 10px;
  border-left: 1px solid #e5e7eb;
  padding-left: 10px;
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

.download-btn:hover { background-color: #1d4ed8; transform: translateY(-1px); }
.download-btn:active { transform: translateY(0); }

.container {
  display: flex;
  flex: 1;
  overflow: hidden;
  padding: 1.5rem;
  gap: 1.5rem;
  max-width: 1600px;
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
}

/* 预览区 Markdown 样式 - 需使用 :deep() 穿透作用域 */
.preview :deep(h1), .preview :deep(h2), .preview :deep(h3), .preview :deep(h4) { font-weight: 600; margin-top: 24px; margin-bottom: 16px; line-height: 1.25; }
.preview :deep(h1) { font-size: 2em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
.preview :deep(h2) { font-size: 1.5em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
.preview :deep(h3) { font-size: 1.25em; }
.preview :deep(p) { margin-bottom: 16px; }
.preview :deep(a) { color: #0969da; text-decoration: none; }
.preview :deep(ul), .preview :deep(ol) { padding-left: 2em; margin-bottom: 16px; }
.preview :deep(code) { background-color: rgba(175, 184, 193, 0.2); padding: 0.2em 0.4em; border-radius: 6px; font-family: monospace; font-size: 85%; }
.preview :deep(pre) { background-color: #f6f8fa; padding: 16px; border-radius: 6px; overflow: auto; margin-bottom: 16px; }
.preview :deep(pre code) { background-color: transparent; padding: 0; font-size: 85%; }
.preview :deep(blockquote) { border-left: 0.25em solid #d0d7de; padding: 0 1em; color: #57606a; margin: 0 0 16px 0; }
.preview :deep(table) { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
.preview :deep(th), .preview :deep(td) { border: 1px solid #d0d7de; padding: 6px 13px; }
.preview :deep(th) { background-color: #f6f8fa; font-weight: 600; }
.preview :deep(img) { max-width: 100%; box-sizing: content-box; }
</style>