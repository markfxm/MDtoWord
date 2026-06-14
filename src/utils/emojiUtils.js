import twemoji from 'twemoji';

const TWEMOJI_BASE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/';
const TWEMOJI_STYLE = 'height:1.2em;width:1.2em;margin:0 0.1em;vertical-align:-0.2em;display:inline-block;';
const TEXT_SYMBOL_RANGES = [
  [0x2190, 0x21FF],
];

const shouldKeepIconAsText = (iconId) => {
  const codePoint = Number.parseInt(iconId.split('-')[0], 16);
  return TEXT_SYMBOL_RANGES.some(([start, end]) => codePoint >= start && codePoint <= end);
};

const replaceEmojiInText = (text) => twemoji.parse(text, {
  base: TWEMOJI_BASE_URL,
  size: '72x72',
  ext: '.png',
  attributes: () => ({
    width: '22',
    height: '22',
    style: TWEMOJI_STYLE,
  }),
  callback: (iconId, options) => (
    shouldKeepIconAsText(iconId) ? null : `${options.base}${options.size}/${iconId}${options.ext}`
  ),
});

export const replaceTwemojiInHtml = (html) => String(html).replace(
  /(<[^>]+>)|([^<]+)/g,
  (match, tag, text) => (tag ? tag : replaceEmojiInText(text))
);
