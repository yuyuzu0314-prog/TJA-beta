// キーボード/ゲームパッド/ポインタ入力。イベントはキューに溜め、フレーム頭で一括して確定する。
import { Settings } from './settings.js';
import { Clock } from './clock.js';

const NAV = {
  decide: ['Enter', 'NumpadEnter'], cancel: ['Escape'],
  left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
};
const PREVENT = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Tab', 'Backspace', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F12']);
const PAD_MAP = { 0: 'decide', 1: 'cancel', 4: 'LeftBlue', 5: 'RightBlue', 12: 'up', 13: 'down', 14: 'left', 15: 'right', 2: 'LeftRed', 3: 'RightRed' };

class InputManager {
  constructor() {
    this.heldKeys = new Set(); this.q = []; this.rq = [];
    this.pressedKeys = new Set(); this.releasedKeys = new Set(); this.repeatKeys = new Set();
    this.padHeld = new Set(); this.padPressed = new Set(); this.padReleased = new Set(); this._padPrev = new Set();
    this.times = new Map();          // code -> 押下時刻(event.timeStamp)。プレイ画面の判定用に残す
    this.lastPressedKey = null; this.textMode = false; this._text = null;
    this.pointer = { x: -1, y: -1, down: false, pressed: false, released: false, downAt: 0, moved: false };
    this._pq = { pressed: false, released: false }; this.canvas = null; this.cssScale = 1;
    this._repeatT = new Map();
    this.shiftHeld = false;
  }
  attach(canvas, renderer) {
    this.canvas = canvas; this.renderer = renderer;
    window.addEventListener('keydown', (e) => this._kd(e), { capture: true });
    window.addEventListener('keyup', (e) => this._ku(e), { capture: true });
    window.addEventListener('blur', () => { this.heldKeys.clear(); });
    const pt = (e) => {
      const r = canvas.getBoundingClientRect(); const s = renderer.W / r.width;
      this.pointer.x = (e.clientX - r.left) * s; this.pointer.y = (e.clientY - r.top) * s;
    };
    canvas.addEventListener('pointerdown', (e) => { pt(e); this.pointer.down = true; this._pq.pressed = true; this.pointer.downAt = Clock.now; canvas.setPointerCapture?.(e.pointerId); e.preventDefault(); });
    canvas.addEventListener('pointerup', (e) => { pt(e); this.pointer.down = false; this._pq.released = true; e.preventDefault(); });
    canvas.addEventListener('pointercancel', () => { this.pointer.down = false; this._pq.released = true; });
    canvas.addEventListener('pointermove', (e) => { pt(e); this.pointer.moved = true; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  _kd(e) {
    if (this.textMode) return;           // 文字入力中は <input> に任せる
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (PREVENT.has(e.code)) e.preventDefault();
    if (!e.repeat) {
      this.heldKeys.add(e.code); this.q.push(e.code); this.times.set(e.code, e.timeStamp);
    } else this.rq.push(e.code);
    this.shiftHeld = e.shiftKey;
  }
  _ku(e) { this.heldKeys.delete(e.code); this.rq.push('~' + e.code); this.shiftHeld = e.shiftKey; }
  /** 毎フレーム先頭で呼ぶ */
  beginFrame() {
    this.pressedKeys.clear(); this.releasedKeys.clear(); this.repeatKeys.clear();
    this.lastPressedKey = null;
    for (const c of this.q) { this.pressedKeys.add(c); this.repeatKeys.add(c); this.lastPressedKey = this.lastPressedKey ?? c; this._repeatT.set(c, Clock.now + 420); }
    this.q.length = 0;
    for (const c of this.rq) { if (c[0] === '~') this.releasedKeys.add(c.slice(1)); else this.repeatKeys.add(c); }
    this.rq.length = 0;
    // 押しっぱなしのリピート（ブラウザ依存を避け自前で生成）
    for (const c of this.heldKeys) {
      const t = this._repeatT.get(c);
      if (t !== undefined && Clock.now >= t && !this.pressedKeys.has(c)) { this.repeatKeys.add(c); this._repeatT.set(c, Clock.now + 55); }
    }
    this.pointer.pressed = this._pq.pressed; this.pointer.released = this._pq.released;
    this._pq.pressed = this._pq.released = false;
    // ゲームパッド
    this.padPressed.clear(); this.padReleased.clear();
    const now = new Set();
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) { if (!p) continue; p.buttons.forEach((b, i) => { if (b.pressed && PAD_MAP[i]) now.add(PAD_MAP[i]); }); }
    for (const a of now) if (!this._padPrev.has(a)) this.padPressed.add(a);
    for (const a of this._padPrev) if (!now.has(a)) this.padReleased.add(a);
    this.padHeld = now; this._padPrev = now;
  }
  codesFor(action) {
    const k = Settings.keys[action];
    if (k) return k;
    return NAV[action] || [];
  }
  /** アクション名: decide/cancel/left/right/up/down、または LeftRed 等 */
  pressed(action) { return this.codesFor(action).some((c) => this.pressedKeys.has(c)) || this.padPressed.has(action); }
  held(action) { return this.codesFor(action).some((c) => this.heldKeys.has(c)) || this.padHeld.has(action); }
  released(action) { return this.codesFor(action).some((c) => this.releasedKeys.has(c)) || this.padReleased.has(action); }
  repeat(action) { return this.codesFor(action).some((c) => this.repeatKeys.has(c)) || this.padPressed.has(action); }
  key(code) { return this.pressedKeys.has(code); }
  keyHeld(code) { return this.heldKeys.has(code); }
  keyReleased(code) { return this.releasedKeys.has(code); }
  keyRepeat(code) { return this.repeatKeys.has(code); }
  anyPressed() { return this.pressedKeys.size > 0 || this.padPressed.size > 0 || this.pointer.pressed; }
  /** 太鼓4面のどれか(決定) */
  anyRed(p = 0) { return this.pressed(p ? 'LeftRed2P' : 'LeftRed') || this.pressed(p ? 'RightRed2P' : 'RightRed'); }
  decide() { return this.pressed('decide') || this.anyRed(0); }
  /** ポインタが矩形内で押された */
  tapIn(x, y, w, h) { const p = this.pointer; return p.pressed && p.x >= x && p.x < x + w && p.y >= y && p.y < y + h; }
  hoverIn(x, y, w, h) { const p = this.pointer; return p.x >= x && p.x < x + w && p.y >= y && p.y < y + h; }

  /** 日本語 IME に対応した文字入力 */
  beginText(initial, maxLen, onChange, onDone) {
    this.endText();
    const el = document.createElement('input');
    el.type = 'text'; el.value = initial || ''; el.maxLength = maxLen || 12;
    el.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
    document.body.appendChild(el); el.focus(); el.select(); this.textMode = true; this.heldKeys.clear();
    const fin = (ok) => { const v = el.value; this.endText(); onDone && onDone(ok ? v : null); };
    el.addEventListener('input', () => onChange && onChange(el.value));
    el.addEventListener('keydown', (e) => {
      if (e.isComposing) return;
      if (e.key === 'Enter') { e.preventDefault(); fin(true); }
      else if (e.key === 'Escape') { e.preventDefault(); fin(false); }
    });
    el.addEventListener('blur', () => { if (this._text === el) fin(true); });
    this._text = el; onChange && onChange(el.value);
  }
  endText() {
    if (this._text) { const el = this._text; this._text = null; el.remove(); }
    this.textMode = false; this.heldKeys.clear(); this.q.length = 0;
  }
  get composing() { return !!this._text; }
}
export const Input = new InputManager();
