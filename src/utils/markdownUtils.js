import { marked } from 'marked';
import katex from 'katex';
import { cleanupMathContent } from './mathUtils.js';
import { optimizePdfContent } from './pdfUtils.js';

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

/**
 * 核心转换函数
 * @param {string} text - 输入的 Markdown 文本
 * @param {object} options - 选项配置 { isForWord, isOptimizePdf, isPreserveBreaks }
 */
export const renderMarkdownWithMath = (text, options = {}) => {
  if (!text) return '';

  const { isForWord = false, isOptimizePdf = true, isPreserveBreaks = true } = options;

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
  processedText = isOptimizePdf ? optimizePdfContent(processedText) : processedText;

  // 3. 基础 markdown 解析
  let html = marked.parse(processedText, { breaks: isPreserveBreaks });

  // 3.5 为非 Word 导出的预览视图按句或按行精确注入高亮包裹标签
  if (!isForWord) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const blocks = tempDiv.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, td');
    blocks.forEach(block => {
      // 跳过包含嵌套列表的容易出错的复杂容器
      if (block.querySelector('ul, ol')) return; 
      
      let currentFragment = [];
      let fragments = [];
      
      // 首先按照软换行 <br> 将内容划分为“视觉行”
      Array.from(block.childNodes).forEach(node => {
        if (node.nodeName === 'BR') {
          fragments.push(currentFragment);
          currentFragment = [];
        } else {
          currentFragment.push(node);
        }
      });
      if (currentFragment.length > 0) fragments.push(currentFragment);

      block.innerHTML = '';
      fragments.forEach((fragNodes, idx) => {
        if (fragNodes.length > 0) {
          let currentSpan = document.createElement('span');
          currentSpan.className = 'hover-target';
          currentSpan.style.display = 'inline';

          const flushSpan = () => {
            if (currentSpan.childNodes.length > 0) {
              block.appendChild(currentSpan);
              currentSpan = document.createElement('span');
              currentSpan.className = 'hover-target';
              currentSpan.style.display = 'inline';
            }
          };

          for (let i = 0; i < fragNodes.length; i++) {
            const n = fragNodes[i];
            if (n.nodeType === 3) { // 文本节点，进行按句切分
              const parts = n.nodeValue.split(/([。！？]+)/);
              for (let p = 0; p < parts.length; p++) {
                if (!parts[p]) continue;
                if (/^[。！？]+$/.test(parts[p])) {
                  currentSpan.appendChild(document.createTextNode(parts[p]));
                  flushSpan(); // 遇到标点结束标志，结束当前句子高亮跨度
                } else {
                  currentSpan.appendChild(document.createTextNode(parts[p]));
                }
              }
            } else {
              // 富文本节点（加粗等），作为一个整体跟目前的句子在一起，不破坏其内部结构
              currentSpan.appendChild(n);
            }
          }
          flushSpan();
        }
        if (idx < fragments.length - 1) {
          block.appendChild(document.createElement('br'));
        }
      });
    });
    html = tempDiv.innerHTML;
  }

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
