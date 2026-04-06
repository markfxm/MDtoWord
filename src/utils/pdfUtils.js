/**
 * PDF 粘贴内容预处理：修复丢失的列表符号和缩进
 */
export const optimizePdfContent = (text) => {
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
