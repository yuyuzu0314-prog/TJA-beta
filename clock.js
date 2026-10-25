// ゲーム全体の時計とカウンタ。
// CCounter(C#)と同じ「値 = 開始値 + 経過時間/間隔」の意味を持つが、
// フレームごとに積算せず経過時間から直接計算するため、
// 60Hz でも 120Hz/144Hz でもアニメーションの速さが変わらない。
export const Clock = { now: 0, dt: 16.7, frame: 0 };

export class Counter {
  constructor(begin = 0, end = 0, interval = 1) {
    this.begin = begin; this.end = end; this.interval = interval;
    this.loop = false; this.running = false; this._t0 = 0; this._v = begin;
  }
  start(begin, end, interval = 1) {
    this.begin = begin; this.end = end; this.interval = interval; this.loop = false;
    this.running = true; this._t0 = Clock.now; this._v = begin; return this;
  }
  startLoop(begin, end, interval = 1) { this.start(begin, end, interval); this.loop = true; return this; }
  stop() { this._v = this.value; this.running = false; }
  reset() { this.running = false; this._v = this.begin; }
  /** 経過ミリ秒を直接ずらす（スキップ演出用） */
  advance(ms) { if (this.running) this._t0 -= ms; }
  get value() {
    if (!this.running) return this._v;
    const steps = Math.floor((Clock.now - this._t0) / this.interval);
    if (this.loop) { const span = this.end - this.begin + 1; return this.begin + (steps % span); }
    const v = this.begin + steps;
    return v > this.end ? this.end : v;
  }
  get done() { return this.value >= this.end && this.end > this.begin; }
  get active() { return this.running && !this.done; }
}

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rad = (deg) => deg * Math.PI / 180;
/** 0..255 の不透明度 → 0..1 */
export const op = (v) => (v <= 0 ? 0 : v >= 255 ? 1 : v / 255);
export const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
export const easeInOutSine = (t) => -(Math.cos(Math.PI * clamp(t, 0, 1)) - 1) / 2;
export const easeOutBack = (t) => { t = clamp(t, 0, 1); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
