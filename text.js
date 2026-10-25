// 文字列を一度だけ画像化してキャッシュする。毎フレームの fillText を避けるための層。
export const FONT_STACK = '"IPAGothic","Noto Sans CJK JP","Noto Sans JP","Hiragino Kaku Gothic ProN","Meiryo",sans-serif';
const cache = new Map();
const MAX = 400;
function mk(w, h) {
  const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c;
}
/**
 * opts: size, fill, stroke, strokeW, weight, maxW(超えたら横圧縮), font
 * 戻り値は Renderer が描ける {bmp,w,h}
 */
export function textTex(str, opts = {}) {
  const size = opts.size || 24, fill = opts.fill || '#fff', stroke = opts.stroke || null;
  const sw = opts.strokeW ?? (stroke ? Math.max(2, Math.round(size / 6)) : 0);
  const weight = opts.weight || 'bold', font = opts.font || FONT_STACK, maxW = opts.maxW || 0;
  const key = `${str}|${size}|${fill}|${stroke}|${sw}|${weight}|${maxW}|${font}`;
  let t = cache.get(key);
  if (t) { cache.delete(key); cache.set(key, t); return t; }
  const m = mk(8, 8).getContext('2d');
  m.font = `${weight} ${size}px ${font}`;
  const tw = Math.ceil(m.measureText(str).width);
  const pad = sw + 2;
  const w = tw + pad * 2, h = Math.ceil(size * 1.4) + pad * 2;
  const c = mk(w, h), g = c.getContext('2d');
  g.font = `${weight} ${size}px ${font}`; g.textBaseline = 'middle'; g.textAlign = 'left'; g.lineJoin = 'round';
  const cy = h / 2 + size * 0.04;
  if (stroke && sw > 0) { g.lineWidth = sw * 2; g.strokeStyle = stroke; g.strokeText(str, pad, cy); }
  g.fillStyle = fill; g.fillText(str, pad, cy);
  t = { bmp: c, w, h, tw, pad, scaleX: 1 };
  if (maxW && tw > maxW) t.scaleX = maxW / tw;
  cache.set(key, t);
  if (cache.size > MAX) cache.delete(cache.keys().next().value);
  return t;
}
/** 複数行（改行 \n と自動折り返し）をまとめて 1 枚にする */
export function paragraphTex(str, opts = {}) {
  const size = opts.size || 22, width = opts.width || 480, lh = opts.lineHeight || Math.round(size * 1.35);
  const fill = opts.fill || '#fff', font = opts.font || FONT_STACK, weight = opts.weight || 'bold';
  const key = `P|${str}|${size}|${width}|${fill}|${weight}`;
  let t = cache.get(key);
  if (t) return t;
  const m = mk(8, 8).getContext('2d'); m.font = `${weight} ${size}px ${font}`;
  const lines = [];
  for (const para of String(str).split('\n')) {
    let cur = '';
    for (const ch of para) {
      if (m.measureText(cur + ch).width > width && cur) { lines.push(cur); cur = ch; } else cur += ch;
    }
    lines.push(cur);
  }
  const h = lines.length * lh + 8;
  const c = mk(width + 8, h), g = c.getContext('2d');
  g.font = `${weight} ${size}px ${font}`; g.fillStyle = fill; g.textBaseline = 'middle';
  lines.forEach((l, i) => g.fillText(l, 4, 4 + i * lh + lh / 2));
  t = { bmp: c, w: width + 8, h };
  cache.set(key, t);
  if (cache.size > MAX) cache.delete(cache.keys().next().value);
  return t;
}
export function clearTextCache() { cache.clear(); }
