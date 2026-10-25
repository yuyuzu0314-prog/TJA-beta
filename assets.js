// スキン画像の読み込み。PNG の代わりに可逆 WebP を ImageBitmap にデコードして保持する。
export const Tx = {};            // 'フォルダ/名前' -> {bmp,w,h}
export const Assets = {
  skin: null, manifest: null, root: '',
  async loadFont() {
    try {
      const ff = new FontFace('IPAGothic', 'url(fonts/ipag.ttf)');
      await ff.load(); document.fonts.add(ff);
      await document.fonts.load('bold 20px IPAGothic', 'あアA1');
    } catch (e) { console.warn('font load failed, falling back to system font', e); }
  },
  async loadSkin(name, onProgress = () => {}) {
    this.skin = name; this.root = `skins/${name}/`;
    const res = await fetch(this.root + 'manifest.json');
    this.manifest = await res.json();
    const keys = Object.keys(this.manifest.images);
    for (const k of Object.keys(Tx)) delete Tx[k];
    let done = 0; const total = keys.length; let idx = 0;
    const worker = async () => {
      while (idx < keys.length) {
        const k = keys[idx++];
        try {
          const r = await fetch(`${this.root}Graphics/${k}.webp`);
          const blob = await r.blob();
          const bmp = await createImageBitmap(blob);
          Tx[k] = { bmp, w: bmp.width, h: bmp.height };
        } catch (e) { console.warn('missing image', k, e); }
        done++; if ((done & 7) === 0 || done === total) onProgress(done, total);
      }
    };
    await Promise.all(Array.from({ length: 8 }, worker));
    onProgress(total, total);
    return Tx;
  },
  /** prefix0.. の連番アニメ */
  frames(prefix, count) { const a = []; for (let i = 0; i < count; i++) a.push(Tx[prefix + i]); return a; },
  countFrames(prefix) { let n = 0; while (Tx[prefix + n]) n++; return n; },
};
export const T = (k) => Tx[k];
