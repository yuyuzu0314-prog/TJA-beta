// 02.Title: コイン待機 → バナパス読み込み → プレイヤーエントリー → モード選択
// 描画式・タイミングは CStageタイトル.cs をそのまま移植（ms 基準なのでリフレッシュレートに依存しない）。
import { Stage } from '../core/stage.js';
import { Tx, Assets } from '../core/assets.js';
import { Input } from '../core/input.js';
import { Counter, Clock, clamp, rad, op } from '../core/clock.js';
import { Settings } from '../core/settings.js';
import { textTex } from '../core/text.js';
import { drawNamePlate } from '../ui/nameplate.js';

const ENTRY_PT = [[337, 488], [529, 487], [743, 486]];       // ptプレイヤーエントリーバー座標
const MODE_PT = [[290, 107], [319, 306], [356, 513]];        // ptモード選択バー座標
const T16 = Math.trunc(16 * 16.6), T26 = Math.trunc(26 * 16.6);
const trunc = Math.trunc;

export class TitleStage extends Stage {
  enter(p = {}) {
    const a = this.app;
    this.from = p.from || '';
    this.ctWait = new Counter();                      // バナパス長押し待機
    this.ctCoin = new Counter().startLoop(0, 2000, 1);
    this.ctOk = new Counter(); this.ctNg = new Counter();
    this.ctBlink = new Counter().startLoop(0, 510, 2);
    this.ctDecide = new Counter();
    this.ctDonEntry = new Counter();
    this.ctDonIn = new Counter();
    this.ctDonLoop = new Counter().startLoop(0, Math.max(0, Assets.countFrames('1_Title/Donchan_Normal/') - 1), 33);
    this.ctBarIn = new Counter();
    this.ctBarMove = new Counter(); this.ctBarMove._v = 250;
    this.banapas = false; this.banapasNg = false; this.entry = false; this.entryDecided = false; this.modeSel = false; this.donInit = false;
    this.entryRow = 1; this.modeRow = 0;
    this.bars = [{ row: 1 }, { row: 2 }];
    this.bgmStarted = false; this.sankaPlayed = false; this.banaSndPlayed = false; this.errPlayed = false;
    this.donEntryN = Assets.countFrames('1_Title/Donchan_Entry/');
    this.donNormalN = Assets.countFrames('1_Title/Donchan_Normal/');
    this.holdPointer = false;
    a.audio.stopAll(); a.se('entry');
    if (Settings.bgm) { a.audio.playIntroLoop('bgmTitleIn', 'bgmTitle'); this.bgmStarted = true; }
    this.fadeIn(this.from === 'startup' ? 700 : 500);
  }
  leave() { const au = this.app.audio; au.stop('entry'); au.stop('bgmTitle'); au.stop('bgmTitleIn'); }

  update() {
    const a = this.app;
    const res = this.stepFade();
    if (res) { a.audio.stop('bgmTitle'); a.audio.stop('bgmTitleIn'); a.audio.stop('entry'); return res; }
    if (this.phase === 'fadeout') return null;

    // ---- バナパス読み込み: P 長押し / 画面長押し / パッドの赤を長押し ----
    const holdKey = Input.keyHeld('KeyP') || (Input.pointer.down && !this.entry && !this.modeSel && this.pointerOnCard());
    const startedHold = Input.key('KeyP') || (Input.pointer.pressed && this.pointerOnCard());
    if (!this.banapas && !this.banapasNg && !this.entry && !this.modeSel) {
      if (startedHold) { this.ctWait.start(0, 600, 1); }
      const released = Input.keyReleased('KeyP') || Input.pointer.released;
      if (!holdKey && released && this.ctWait.running) {
        const v = this.ctWait.value; this.ctWait.stop();
        if (v < 600 && !this.banapasNg) { this.ctNg.start(0, 1128, 1); this.banapasNg = true; }
      }
      if (this.ctWait.running && this.ctWait.value >= 500 && !this.banapas) {
        a.audio.stop('entry'); this.ctOk.start(0, 3655, 1); this.banapas = true; this.ctWait.stop();
      }
    }

    // ---- 操作 ----
    const L = Input.pressed('left') || Input.pressed('LeftBlue'), R = Input.pressed('right') || Input.pressed('RightBlue');
    const D = Input.pressed('decide') || Input.anyRed(0);
    if (Input.pressed('cancel') && this.ready) { this.app.se('cancel'); this.fadeOut(400, { to: 'ending' }); return null; }
    if ((Input.shiftHeld && Input.key('F1')) || (this.ready && Input.key('Tab'))) { this.goConfig(); return null; }
    if (this.ready && Input.tapIn(1090, 648, 170, 56)) { this.goConfig(); return null; }

    const entryVisible = this.entry && this.entryAlpha() > 0.3;
    if (entryVisible && !this.entryDecided) {
      if (R && this.entryRow + 1 <= 2) { a.se('change'); this.entryRow++; }
      if (L && this.entryRow - 1 >= 0) { a.se('change'); this.entryRow--; }
      // タッチ/クリック: 3 つのボタンを直接押せる
      for (let i = 0; i < 3; i++) if (this.entryAlpha() > 0.6 && Input.tapIn(ENTRY_PT[i][0], ENTRY_PT[i][1], i === 1 ? 224 : 199, 92)) { this.entryRow = i; this.confirmEntry(); }
    }
    if (this.modeSel && this.ready) {
      if (R && this.modeRow !== 1) this.moveMode(1);
      if (L && this.modeRow !== 0) this.moveMode(0);
      for (let i = 0; i < 2; i++) {
        const row = this.bars[i].row;
        if (Input.tapIn(MODE_PT[row][0], MODE_PT[row][1] - 20, 642, 130) && this.ctBarMove.value >= 250 && this.ctBarIn.value > T26 + 300) {
          if (i === this.modeRow) this.confirmMode(); else this.moveMode(i);
        }
      }
    }
    if (D && this.ready) {
      if (this.modeSel) this.confirmMode();
      else if (entryVisible) this.confirmEntry();
    }

    // ---- 進行 ----
    if (this.ctDecide.value >= 1055 && !this.modeSel) {
      if (!this.sankaPlayed) { a.se('sanka'); this.sankaPlayed = true; }
      this.ctDonIn.start(0, 180, 2); this.ctBarIn.start(0, 1295, 1); this.modeSel = true;
    }
    if (this.ctOk.value >= 2000) this.entry = true;
    if (this.entry && !this.donInit && this.donEntryN) { this.ctDonEntry.startLoop(0, this.donEntryN - 1, 16); this.donInit = true; }
    return null;
  }
  pointerOnCard() { const p = Input.pointer; return p.x > 400 && p.x < 880 && p.y > 250 && p.y < 520; }
  entryAlpha() { return clamp((this.ctOk.value - 3400) / 255, 0, 1); }
  confirmEntry() {
    if (this.entryDecided) return;
    if (this.entryRow === 0 || this.entryRow === 2) {
      this.app.se('decide'); this.ctDecide.start(0, 1055, 1); this.entryDecided = true;
    } else {                               // 「つかわない」→ 最初からやり直し
      this.app.se('decide'); this.entry = false; this.banapas = false; this.donInit = false;
      this.ctOk = new Counter(); this.ctWait = new Counter();
      this.app.se('entry');
    }
  }
  moveMode(row) {
    this.app.se('change'); this.ctBarMove.start(0, 250, 1.2); this.modeRow = row;
    for (let i = 0; i < 2; i++) this.bars[i].row = row === 1 ? i : i + 1;
  }
  confirmMode() {
    const a = this.app;
    if (this.modeRow === 1) {
      // 段位道場: 2 人プレイ時は不可（原作どおり）
      if (Settings.playerCount !== 2) { a.se('decide'); this.fadeOut(500, { to: 'danselect' }); }
      else a.se('error');
    } else { a.se('decide'); this.fadeOut(500, { to: 'songselect' }); }
  }
  goConfig() { this.app.se('cancel'); this.fadeOut(500, { to: 'config' }); }

  draw(r) {
    const bg = Tx['1_Title/Background']; if (bg) r.spr(bg, 0, 0); else r.clear('#8cd');
    const okV = this.ctOk.value, ngV = this.ctNg.value;

    // ---- コイン待機バー or バナパス読み込み演出 ----
    if (!this.banapas && !this.banapasNg) {
      r.spr(Tx['1_Title/Entry_Bar'], 0, 0);
      const c = this.ctCoin.value; let o;
      if (c <= 255) o = c; else if (c <= 2000 - 355) o = 255; else o = 255 - (c - (2000 - 355));
      const t = Tx['1_Title/Entry_Bar_Text'], al = op(o);
      r.sprR(t, 563, 312, 0, 0, 395, 50, al); r.sprR(t, 563, 430, 0, 50, 395, 50, al);
      // 長押しの進捗リング
      if (this.ctWait.running) this.drawHoldRing(r, clamp(this.ctWait.value / 500, 0, 1));
      else this.drawCardHint(r);
    } else if (okV <= 1000 && ngV <= 1128) {
      if (this.banapas) {
        this.tileBlack(r, okV <= 2972 ? 128 : 128 - (okV - 2972));
        const L0 = Tx['1_Title/Banapas_Load'], L1 = Tx['1_Title/Banapas_Load_Text'], L2 = Tx['1_Title/Banapas_Load_Anime'];
        const a0 = okV >= 872 ? 255 - (okV - 872) * 2 : okV * 2;
        r.sprC(L0, 640, 360, 1, okV <= 100 ? okV * 0.01 : 1, op(a0));
        const a1 = okV >= 872 ? 255 - (okV - 872) * 2 : okV <= 96 ? trunc((okV - 96) * 7.96875) : 255;
        r.sprC(L1, 640, 360, 1, 1, op(a1));
        for (let i = 0; i < 5; i++) {
          const f = okV >= 200 + (i - 1) * 320 ? (okV <= 200 + i * 320 ? trunc((okV - (200 + i * 320)) / 40) : 0) : 0;
          r.sprC(L2, 480 + 90 * i, 410, 1, 1, op(a1), 72 * Math.abs(f), 0, 72, 72);
        }
      }
      if (this.banapasNg) { this.tileBlack(r, ngV <= 1000 ? 128 : 128 - (ngV - 1000)); this.drawFail(r, ngV); }
    } else {
      if (this.banapas) this.drawClear(r, okV);
    }
    if (this.banapasNg && ngV >= 1128) { this.banapasNg = false; this.errPlayed = false; }

    // ---- プレイヤーエントリー ----
    if (this.entry) this.drawEntry(r, okV);
    // ---- モード選択 ----
    if (this.modeSel) this.drawMode(r);
    if (this.modeSel) drawNamePlate(r, 36, 615, 0, false, 1);

    // 設定ボタン
    if (this.phase !== 'fadeout') {
      const hot = Input.hoverIn(1090, 648, 170, 56);
      r.roundRect(1090, 648, 170, 56, 28, hot ? '#ffb400' : '#fff', hot ? 0.95 : 0.8);
      r.sprC(textTex('⚙ 設定 (Tab)', { size: 22, fill: '#3b2a14', weight: 'bold' }), 1175, 676, 1, 1, 1);
    }
    if (this.from === 'startup' && Settings.debugInfo) r.textRaw('TJAPlayer3 Web', 4, 4, 14, '#fff');
    r.fade(this.fadeAlpha);
  }

  tileBlack(r, o) { r.tile(Tx['Tile_Black'], 0, 0, 1280, 720, op(o)); }
  drawHoldRing(r, p) {
    const c = r.ctx; r._alpha(1);
    c.save(); c.lineWidth = 14; c.lineCap = 'round';
    c.strokeStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.arc(640, 376, 56, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = '#ffc928'; c.beginPath(); c.arc(640, 376, 56, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); c.stroke(); c.restore(); r.drawCalls += 2;
  }
  drawCardHint(r) {
    const a = 0.55 + 0.45 * Math.sin(Clock.now / 420);
    const t = textTex('Pキー または 画面中央を 長押しで カードをよみこみ', { size: 22, fill: '#fff', stroke: '#000', strokeW: 4 });
    r.roundRect(640 - t.w / 2 - 14, 592, t.w + 28, t.h + 8, 18, '#000', 0.45 * a); r.sprC(t, 640, 592 + t.h / 2 + 4, 1, 1, a);
  }
  drawFail(r, c) {
    const F = Tx['1_Title/Banapas_Load_Failure'];
    if (!this.errPlayed) { this.app.se('error'); this.errPlayed = true; }
    r.sprC(F, 640, 360, 1, c <= 100 ? c * 0.01 : 1, op(c >= 872 ? 255 - (c - 872) * 2 : c * 2));
  }
  drawClear(r, v) {
    this.tileBlack(r, v <= 2972 ? 128 : 128 - (v - 2972));
    if (!this.banaSndPlayed) { this.app.se('banapas'); this.banaSndPlayed = true; }
    const count = v - 1000;
    const a = op(count >= 1872 ? 255 - (count - 1872) * 2 : count * 2);
    r.sprC(Tx['1_Title/Banapas_Load_Clear'], 640, 360, 1, count <= 100 ? count * 0.01 : 1, a);
    let anime = 0, sx = 0, sy = 0; const S = Math.sin;
    if (count >= 300) {
      if (count <= 570) { const k = S(rad((count - 300) / 1.5)); anime = k * 95; sx = -k * 0.15; sy = k * 0.2; }
      else if (count <= 670) { const k = S(rad((count - 570) * 1.8)); sx = k * 0.13; sy = -k * 0.1; }
      else if (count <= 940) { const k = S(rad((count - 670) / 1.5)); anime = k * 95; sx = -k * 0.15; sy = k * 0.2; }
      else if (count <= 1040) { const k = S(rad((count - 940) * 1.8)); sx = k * 0.13; sy = -k * 0.1; }
    }
    r.sprB(Tx['1_Title/Banapas_Load_Clear_Anime'], 198, 514 - anime, 1 + sx, 1 + sy, a);
  }

  drawEntry(r, okV) {
    const d = this.ctDecide.value;
    const A = d >= 800 ? 255 - (d - 800) : okV - 3400, al = op(A);
    if (al <= 0) return;
    const P0 = Tx['1_Title/Entry_Player'], P1 = Tx['1_Title/Entry_Player_Select_Bar'], P2 = Tx['1_Title/Entry_Player_Select'];
    r.spr(P0, 0, 0, al);
    if (this.donEntryN) r.spr(Tx['1_Title/Donchan_Entry/' + this.ctDonEntry.value], 485, 140, al);
    const row = this.entryRow, x = ENTRY_PT[row][0], y = ENTRY_PT[row][1];
    const sx = row === 1 ? 199 : 0, sw = row === 1 ? 224 : 199;
    const bl = this.ctBlink.value;
    r.sprR(P2, x, y, sx, 0, sw, 92, op(A - (bl <= 255 ? bl : 255 - (bl - 255))));
    r.sprR(P2, x, y, sx, 92, sw, 92, al);
    r.spr(P1, 0, 0, al);
    // 決定時の点滅
    let o = 0;
    if (d <= 100) o = trunc(d * 2.55); else if (d <= 200) o = 255 - trunc((d - 100) * 2.55); else if (d <= 300) o = trunc((d - 200) * 2.55);
    else if (d <= 400) o = 255 - trunc((d - 300) * 2.55); else if (d <= 500) o = trunc((d - 400) * 2.55); else if (d <= 600) o = 255 - trunc((d - 500) * 2.55);
    r.sprR(P2, x, y, sx, 184, sw, 92, op(o));
    drawNamePlate(r, 530, 385, 0, true, al);
    // 操作ヒント
    r.sprC(textTex('← → で えらんで  Enter / ドン で 決定', { size: 20, fill: '#fff', stroke: '#000', strokeW: 4 }), 640, 668, 1, 1, al);
  }

  drawMode(r) {
    const bi = this.ctBarIn.value, bm = this.ctBarMove.value;
    // どんちゃん
    const di = this.ctDonIn.value, h = trunc(di / 2);
    const dx = Math.sin(rad(h)) * 200, dy = Math.sin(rad(90 + h)) * 150;
    if (this.donNormalN) r.spr(Tx['1_Title/Donchan_Normal/' + this.ctDonLoop.value], -200 + dx, 341 - dy);

    if (bi < T16) return;
    const BAR = [Tx['1_Title/ModeSelect_Bar_0'], Tx['1_Title/ModeSelect_Bar_1']], OVL = Tx['1_Title/ModeSelect_Bar_Overlay'];
    const TXT = [Tx['1_Title/ModeSelect_Bar_Text_0'], Tx['1_Title/ModeSelect_Bar_Text_1']];
    const CH = [Tx['1_Title/ModeSelect_Bar_Chara_0'], Tx['1_Title/ModeSelect_Bar_Chara_1']];
    const n = this.modeRow;
    // 選択中の棒（展開中）を最前面にするため後から描く
    const sel = this.bars.findIndex((b) => b.row === 1 && bm >= 150);
    const order = sel >= 0 ? [1 - sel, sel] : [0, 1];
    for (const i of order) {
      const row = this.bars[i].row, bar = BAR[i];
      if (row === 1 && bm >= 150) {
        const A = bi >= T26 + 100 ? 0 : (bi >= T26 && bi <= T26 + 100) ? 40 + trunc((bi - T26) / 100 * 71) : bi < T26 ? 40 : 111;
        const A1 = A === 0 ? (bm >= 150 ? 40 + trunc((bm - 150) / 100 * 71) : bm < 150 ? 40 : 111) : 0;
        const al = op(trunc((bi - T16) * 1.23)), tot = A + A1;
        r.sprR(bar, 320, 347 - tot, 0, 0, 641, 27, al);
        r.sprR(bar, 320, 346 + tot, 0, 76, 641, 30, al);
        r.sprC(bar, 640, 360, 1, tot / 25.7, al, 0, 27, 641, 45);
        r.sprR(OVL, 320, 306, 0, 0, 641, 27, 1);
        r.sprR(OVL, 320, 334 + tot / 0.95238, 0, 71, 641, 35, 1);
        r.sprT(OVL, 640, 333, 1, tot / 0.95238, 1, 0, 27, 641, 1);
        const cnt = bm - 150; let an = cnt <= 45 ? cnt * 3.333333333 : 150 - (cnt - 45) * 0.61764705;
        const ca = op(trunc(cnt * 2.55) + trunc(A * 2.5)), c = CH[i], hw = c.w / 2;
        r.sprC(c, 640 - c.w / 4 + 114 - an, 360, 1, 1, ca, 0, 0, hw, c.h);
        r.sprC(c, 640 + c.w / 4 - 114 + an, 360, 1, 1, ca, hw, 0, hw, c.h);
        const T = TXT[i];
        r.sprC(T, 640, 355 - cnt / 1.5, 1, 1, 1, 0, 0, 642, 122);
        r.sprC(T, 640, 355 + 66, 1, 1, op(trunc(cnt * 2.55)), 0, 122, 642, 148);
      } else {
        const inAnim = bi >= T26 + 100 && bi <= T26 + 299;
        const by = inAnim ? 600 - (bi - (T26 + 100)) * 3 : bi >= T26 + 100 ? 0 : 600;
        const bx = inAnim ? 100 - trunc((bi - (T26 + 100)) * 0.5) : bi >= T26 + 100 ? 0 : 100;
        let mx = 0, my = 0;
        const P = MODE_PT, t = bm <= 100 ? bm / 100 : 1;
        const ref = (row - n !== 0) ? ((row - n !== 2) ? n : n + 1) : n;
        const rr = (row - n !== 0) ? row : row - 1;
        if (bm <= 100) {
          mx = trunc(P[rr][0] - P[ref][0]) - trunc(t * (P[rr][0] - P[ref][0]));
          my = trunc(P[rr][1] - P[ref][1]) - trunc(t * (P[rr][1] - P[ref][1]));
        }
        const px = P[row][0] + bx - mx, py = P[row][1] + by - my;
        r.spr(bar, px, py); r.spr(OVL, px, py);
        r.sprR(TXT[i], px, py - 13, 0, 0, 642, 122);
      }
    }
  }
}
