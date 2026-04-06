export const LATEX_SYMBOL_MAP = {
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
export const cleanupMathContent = (latex) => {
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
export const convertSimpleMathToHtml = (latex) => {
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
export const isSimpleMath = (latex) => {
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
