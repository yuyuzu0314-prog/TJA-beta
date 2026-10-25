import { Counter } from './clock.js';

/** 全ステージの基底。フェードイン/アウトと「終わったら次へ」の受け渡しを持つ */
export class Stage {
  constructor(app) {
    this.app = app; this.phase = 'normal';
    this._fade = new Counter(); this._fadeDur = 500; this._result = null;
  }
  enter(params) {}
  /** 次の画面へ移るときは {to:'name', params} を返す */
  update() { return null; }
  draw(r) {}
  leave() {}

  fadeIn(ms = 500) { this.phase = 'fadein'; this._fadeDur = ms; this._fade.start(0, ms, 1); }
  fadeOut(ms = 500, result = null) { this.phase = 'fadeout'; this._fadeDur = ms; this._result = result; this._fade.start(0, ms, 1); }
  get fadeAlpha() {
    if (this.phase === 'fadein') return 1 - this._fade.value / this._fadeDur;
    if (this.phase === 'fadeout') return this._fade.value / this._fadeDur;
    return 0;
  }
  /** フェードの進行。フェードアウトが終わったら結果を返す */
  stepFade() {
    if (this.phase === 'fadein' && this._fade.done) this.phase = 'normal';
    if (this.phase === 'fadeout' && this._fade.done) { this.phase = 'done'; return this._result; }
    return null;
  }
  get ready() { return this.phase === 'normal'; }
}
