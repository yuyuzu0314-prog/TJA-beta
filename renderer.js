// Canvas2D レンダラ。ImageBitmap を drawImage するだけの薄い層。
// 毎フレームのオブジェクト生成を避け、ctx の状態変更も最小限にして 120FPS を狙う。
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    this.W = 1280; this.H = 720;
    this.scale = 1; this.maxWidth = 1920;
    this._a = 1; this.drawCalls = 0;
  }
  /** ウィンドウに 16:9 で収め、物理解像度は maxWidth までに制限する */
  resize(maxWidth = this.maxWidth) {
    this.maxWidth = maxWidth;
    const vw = window.innerWidth, vh = window.innerHeight;
    let cw = vw, ch = Math.floor(vw * 9 / 16);
    if (ch > vh) { ch = vh; cw = Math.floor(vh * 16 / 9); }
    const dpr = window.devicePixelRatio || 1;
    let bw = Math.round(cw * dpr);
    if (bw > maxWidth) bw = maxWidth;
    if (bw < 640) bw = 640;
    const bh = Math.round(bw * 9 / 16);
    this.canvas.width = bw; this.canvas.height = bh;
    this.canvas.style.width = cw + 'px'; this.canvas.style.height = ch + 'px';
    this.scale = bw / this.W;
    this.cssScale = cw / this.W;
    this.cssW = cw; this.cssH = ch;
  }
  begin() {
    const c = this.ctx;
    c.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    c.globalAlpha = 1; this._a = 1;
    c.globalCompositeOperation = 'source-over';
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'low';
    this.drawCalls = 0;
  }
  clear(color = '#000') { this.ctx.fillStyle = color; this.ctx.fillRect(0, 0, this.W, this.H); }
  _alpha(a) { if (a !== this._a) { this.ctx.globalAlpha = a; this._a = a; } }
  blend(mode) { this.ctx.globalCompositeOperation = mode; }

  /** 左上基準・等倍 */
  spr(t, x, y, a = 1) {
    if (!t || a <= 0) return;
    this._alpha(a > 1 ? 1 : a);
    this.ctx.drawImage(t.bmp, x, y); this.drawCalls++;
  }
  /** 左上基準・切り出し矩形つき */
  sprR(t, x, y, sx, sy, sw, sh, a = 1) {
    if (!t || a <= 0) return;
    this._alpha(a > 1 ? 1 : a);
    this.ctx.drawImage(t.bmp, sx, sy, sw, sh, x, y, sw, sh); this.drawCalls++;
  }
  /** 左上基準・拡大率つき（t2D描画 + vc拡大縮小倍率） */
  sprS(t, x, y, scx, scy, a = 1, sx = 0, sy = 0, sw = t.w, sh = t.h) {
    if (!t || a <= 0) return;
    this._alpha(a > 1 ? 1 : a);
    this.ctx.drawImage(t.bmp, sx, sy, sw, sh, x, y, sw * scx, sh * scy); this.drawCalls++;
  }
  /** 中央基準 */
  sprC(t, cx, cy, scx = 1, scy = 1, a = 1, sx = 0, sy = 0, sw = t.w, sh = t.h) {
    if (!t || a <= 0) return;
    const dw = sw * scx, dh = sh * scy;
    this._alpha(a > 1 ? 1 : a);
    this.ctx.drawImage(t.bmp, sx, sy, sw, sh, cx - dw / 2, cy - dh / 2, dw, dh); this.drawCalls++;
  }
  /** 下中央基準（t2D拡大率考慮下中心基準描画） */
  sprB(t, cx, by, scx = 1, scy = 1, a = 1, sx = 0, sy = 0, sw = t.w, sh = t.h) {
    if (!t || a <= 0) return;
    const dw = sw * scx, dh = sh * scy;
    this._alpha(a > 1 ? 1 : a);
    this.ctx.drawImage(t.bmp, sx, sy, sw, sh, cx - dw / 2, by - dh, dw, dh); this.drawCalls++;
  }
  /** 上中央基準（t2D拡大率考慮上中央基準描画） */
  sprT(t, cx, ty, scx = 1, scy = 1, a = 1, sx = 0, sy = 0, sw = t.w, sh = t.h) {
    if (!t || a <= 0) return;
    const dw = sw * scx, dh = sh * scy;
    this._alpha(a > 1 ? 1 : a);
    this.ctx.drawImage(t.bmp, sx, sy, sw, sh, cx - dw / 2, ty, dw, dh); this.drawCalls++;
  }
  /** 回転つき中央基準 */
  sprRot(t, cx, cy, ang, scx = 1, scy = 1, a = 1) {
    if (!t || a <= 0) return;
    const c = this.ctx; this._alpha(a > 1 ? 1 : a);
    c.save(); c.translate(cx, cy); c.rotate(ang); c.scale(scx, scy);
    c.drawImage(t.bmp, -t.w / 2, -t.h / 2); c.restore(); this.drawCalls++;
  }
  /** タイル敷き詰め。パターンを使うので 1 回の fillRect で済む */
  tile(t, x, y, w, h, a = 1, ox = 0, oy = 0) {
    if (!t || a <= 0) return;
    if (!t._pat) t._pat = this.ctx.createPattern(t.bmp, 'repeat');
    const c = this.ctx; this._alpha(a > 1 ? 1 : a);
    c.save(); c.translate(ox, oy); c.fillStyle = t._pat; c.fillRect(x - ox, y - oy, w, h); c.restore(); this.drawCalls++;
  }
  rect(x, y, w, h, color, a = 1) {
    if (a <= 0) return;
    this._alpha(a > 1 ? 1 : a); this.ctx.fillStyle = color; this.ctx.fillRect(x, y, w, h); this.drawCalls++;
  }
  roundRect(x, y, w, h, rd, color, a = 1) {
    if (a <= 0) return;
    const c = this.ctx; this._alpha(a > 1 ? 1 : a); c.fillStyle = color;
    c.beginPath(); c.roundRect(x, y, w, h, rd); c.fill(); this.drawCalls++;
  }
  /** 三角の矢印（dir: -1 左 / 1 右） */
  arrow(cx, cy, dir, size, color, a = 1) {
    if (a <= 0) return;
    const c = this.ctx; this._alpha(a > 1 ? 1 : a); c.fillStyle = color;
    c.beginPath(); c.moveTo(cx + dir * size, cy); c.lineTo(cx - dir * size * 0.7, cy - size); c.lineTo(cx - dir * size * 0.7, cy + size); c.closePath(); c.fill(); this.drawCalls++;
  }
  /** 画面全体の黒フェード */
  fade(a) { if (a > 0) this.rect(0, 0, this.W, this.H, '#000', a); }
  /** 即席の文字（起動画面などフォント前に使う） */
  textRaw(str, x, y, size, color = '#fff', align = 'left', a = 1) {
    const c = this.ctx; this._alpha(a);
    c.font = `${size}px sans-serif`; c.fillStyle = color; c.textAlign = align; c.textBaseline = 'top';
    c.fillText(str, x, y); this.drawCalls++;
  }
}
