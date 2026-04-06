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
        <textarea ref="textareaRef" v-model="markdownContent" placeholder="在此输入或粘贴 Markdown 文本，或拖入文件..."
          :class="{ 'dragging': isDragging }" @dragover.prevent="handleDragOver" @dragleave.prevent="handleDragLeave"
          @drop.prevent="handleDrop" @mouseenter="activePane = 'textarea'" @scroll="handleTextareaScroll"></textarea>
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
        <div class="preview" v-html="previewHtml" @mouseenter="activePane = 'preview'" @scroll="handlePreviewScroll" @mousemove="handlePreviewMouseMove" @mouseleave="handlePreviewMouseLeave" ref="previewRef"></div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import * as pdfjsLib from 'pdfjs-dist';
import { renderMarkdownWithMath } from '../utils/markdownUtils.js';
import { downloadWord as exportWordUtility } from '../utils/exportWord.js';

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
const textareaRef = ref(null);
const previewRef = ref(null);
const hoveredElement = ref(null);
const activePane = ref('');
const isScrolling = ref(false);
let scrollTimeout = null;

const handleTextareaScroll = () => {
  if (activePane.value !== 'textarea') return;
  
  isScrolling.value = true;
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => { isScrolling.value = false; }, 100);

  const textarea = textareaRef.value;
  const preview = previewRef.value;
  if (!textarea || !preview) return;

  const maxScrollLeft = textarea.scrollHeight - textarea.clientHeight;
  const maxScrollRight = preview.scrollHeight - preview.clientHeight;
  if (maxScrollLeft <= 0 || maxScrollRight <= 0) return;

  const percentage = textarea.scrollTop / maxScrollLeft;
  // 使用无动画直接赋值保证跟手顺滑度
  preview.scrollTop = percentage * maxScrollRight;
};

const handlePreviewScroll = () => {
  if (activePane.value !== 'preview') return;
  
  isScrolling.value = true;
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => { isScrolling.value = false; }, 100);

  const textarea = textareaRef.value;
  const preview = previewRef.value;
  if (!textarea || !preview) return;

  const maxScrollLeft = textarea.scrollHeight - textarea.clientHeight;
  const maxScrollRight = preview.scrollHeight - preview.clientHeight;
  if (maxScrollLeft <= 0 || maxScrollRight <= 0) return;

  const percentage = preview.scrollTop / maxScrollRight;
  textarea.scrollTop = percentage * maxScrollLeft;
};

const handlePreviewMouseMove = (e) => {
  // 当正处于剧烈滚动时，暂停鼠标移动带来的强制高亮
  if (isScrolling.value) return;

  // 仅查找我们精确切分的单句（.hover-target）或天然不可切分的完整块（代码、表格、独立公式）
  const target = e.target.closest('.hover-target') || e.target.closest('pre, table, .katex-display');
  
  if (target && previewRef.value && previewRef.value.contains(target) && target !== previewRef.value) {
    if (hoveredElement.value !== target) {
      if (hoveredElement.value) {
        hoveredElement.value.style.backgroundColor = '';
        hoveredElement.value.style.transition = '';
      }
      hoveredElement.value = target;
      
      // 黄色高亮显示
      target.style.backgroundColor = 'rgba(255, 215, 0, 0.4)'; 
      target.style.transition = 'background-color 0.2s';
      target.style.borderRadius = '4px';
    }
  } else {
    clearHighlight();
  }
};

const handlePreviewMouseLeave = () => {
  clearHighlight();
};

const clearHighlight = () => {
  if (hoveredElement.value) {
    hoveredElement.value.style.backgroundColor = '';
    hoveredElement.value.style.transition = '';
    hoveredElement.value = null;
  }
};

// 初始占位文本
const markdownContent = ref(`# 操作说明

1. 清空本区域，在此处粘贴您的 Markdown 文本。
2. 在右侧实时预览排版效果。
3. 点击右上角的“下载 Word 文档”按钮，即可一键导出 \`.docx\` 文件。

（您可以全选删除这段文字后开始使用）`);


// 计算属性：当 markdownContent 改变时，自动重新计算并更新预览
const previewHtml = computed(() => {
  return renderMarkdownWithMath(markdownContent.value, { 
    isForWord: false,
    isOptimizePdf: isOptimizePdf.value,
    isPreserveBreaks: isPreserveBreaks.value
  });
});

// 下载 Word 文档的处理函数
const downloadWord = async () => {
  await exportWordUtility({
    previewEl: document.querySelector('.preview'),
    markdownContent: markdownContent.value,
    isWpsCompatible: isWpsCompatible.value,
    onDownloadStart: () => { isDownloading.value = true; },
    onDownloadEnd: () => { isDownloading.value = false; }
  });
};

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