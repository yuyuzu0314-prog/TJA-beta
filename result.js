// 08.Result: 成績画面。CActResultParameterPanel のタイミング(ms)をそのまま移植し、
// 王冠・どんちゃん・富士山・シャッター演出などを足してある。
//
//   params = {
//     song:   { title, difficulty(0かんたん..4裏) },
//     result: { perfect, great, miss, roll, maxCombo, score, gauge(0..100), clear(0失敗/1クリア/2フルコン/3全良), auto? },
//     dan?:   true の場合は段位リザルト（danStatus: 0失敗/1合格/2ベター合格, danPlate?）
//     next?:  次の画面（既定 'songselect'）
//   }
import { Stage } from '../core/stage.js';
import { Tx, Assets } from '../core/assets.js';
import { Input } from '../core/input.js';
import { Clock, clamp, rad, op, easeOutCubic, easeOutBack } from '../core/clock.js';
import { Settings, Users } from '../core/settings.js';
import { textTex } from '../core/text.js';
import { drawNamePlate } from '../ui/nameplate.js';

const NUM_X = 490, NUM_Y = 188, NUM_PAD = 42, SCORE_X = 295, SCORE_Y = 212;
const INTERVAL = 420, ADD = 135;

export class ResultStage extends Stage {
  enter(p = {}) {
    this.p = p; this.song = p.song || { title: '', difficulty: 3 };
    this.res = { perfect: 0, great: 0, miss: 0, roll: 0, maxCombo: 0, score: 0, gauge: 0, clear: 0, ...(p.result || {}) };
    this.dan = !!p.dan; this.danStatus = p.danStatus ?? (this.res.clear >= 1 ? 1 : 0);
    this.gEnd = Math.floor(clamp(this.res.gauge, 0, 100) / 2);          // ゲージの最終コマ(0..50)
    this.anime = 3000 + this.gEnd * 59;                                    // 数値が出始める時刻
    this.scoreAt = this.anime + INTERVAL * 4 + 840;
    this.endAt = this.scoreAt + 1400;
    this.t0 = Clock.now; this.skip = 0; this.played = new Set(); this.leaving = false;
    this.cleared = this.res.clear >= 1;
    this.donN = Assets.countFrames(this.cleared ? '6_Result/Result_Donchan_Clear/' : '6_Result/Result_Donchan_Normal/');
    this.rainN = Assets.countFrames('6_Result/Rainbow/');
    this.app.audio.stopAll();
    if (Settings.bgm) this.app.audio.playIntroLoop('bgmResultIn', 'bgmResult');
    this.fadeIn(1); this.phase = 'normal';
    if (!this.res.auto) Users.record(0, this.res);
  }
  leave() { this.app.audio.stop('gauge'); this.app.audio.stop('bgmResult'); this.app.audio.stop('bgmResultIn'); }
  get T() { return Clock.now - this.t0 + this.skip; }
  get finished() { return this.T >= this.endAt; }
  once(id, fn) { if (!this.played.has(id)) { this.played.add(id); fn(); } }

  update() {
    const res = this.stepFade(); if (res) return res;
    if (this.leaving) return null;
    const T = this.T;
    // 効果音（スキップ中は鳴らさない）
    if (!this.dan) {
      if (T >= 2000) this.once('gauge', () => { if (!this.skipped) this.app.se('gauge'); });
      if (T >= 2000 + this.gEnd * 59 && this.gEnd !== 50) this.app.audio.stop('gauge');
      for (let k = 0; k < 5; k++) if (T >= this.anime + INTERVAL * k) this.once('pon' + k, () => { if (!this.skipped) this.app.se('pon'); });
      if (T >= this.scoreAt) this.once('score', () => { if (!this.skipped) this.app.se('scoreDon'); });
    }
    if (this.ready || this.phase === 'normal') {
      const go = Input.decide() || Input.pressed('cancel') || Input.pointer.pressed;
      if (go && Clock.now - this.t0 > 350) {
        if (!this.finished && !this.dan) {                      // 1回目: 演出を最後まで飛ばす
          this.skipped = true; this.skip = this.endAt - (Clock.now - this.t0); this.app.audio.stop('gauge'); this.app.se('decide');
        } else {                                                 // 2回目: 次の画面へ
          this.app.se('decide'); this.leaving = true;
          this.fadeOut(600, { to: this.p.next || 'songselect' });
        }
      }
    }
    return null;
  }

  draw(r) {
    const T = this.T, now = Clock.now, t = now - this.t0;
    const red = this.cleared || this.dan;
    // ---- 背景 ----
    const bg = this.dan ? Tx['7_DanResult/Background'] : Tx['6_Result/Background_' + (red ? 0 : 1)];
    if (bg) r.spr(bg, 0, 0); else r.clear('#e0432b');
    if (!this.dan) {
      const mt = Tx['6_Result/Background_Mountain_' + (red ? 0 : 1)];
      if (mt) r.spr(mt, 0, 0 + Math.sin(now / 1400) * 3, easeOutCubic(t / 900));
    }
    r.spr(Tx['6_Result/Header'], 0, 0);

    // ---- 曲名 ----
    const ba = clamp(t / 500, 0, 1);
    const tt = textTex(this.song.title || '', { size: 25, fill: '#fff', stroke: '#000', strokeW: 4, maxW: 760 });
    r.sprC(tt, 640, 30 + 22 - (1 - easeOutCubic(t / 500)) * 24, tt.scaleX, 1, ba);

    if (!this.dan) this.drawNormal(r, T, t, now); else this.drawDan(r, t);

    // ---- ネームプレート ----
    drawNamePlate(r, 28, 621, 0, false, 1, now);
    if (Settings.playerCount === 2) drawNamePlate(r, 1032, 621, 1, false, 1, now);

    // ---- 操作ヒント ----
    if (this.finished || this.dan) {
      const h = 0.5 + 0.5 * Math.abs(Math.sin(now / 400));
      r.sprC(textTex('Enter / ドン / タップ で つぎへ', { size: 22, fill: '#fff', stroke: '#000', strokeW: 4 }), 1090, 690, 1, 1, h);
    }

    // ---- 登場のシャッター ----
    const sh = Tx['6_Result/FadeIn'];
    if (sh && t < 800) {
      const k = easeOutCubic(t / 800), hh = sh.h / 2;
      r.sprR(sh, 0, -k * hh, 0, 0, sh.w, hh, 1); r.sprR(sh, 0, hh + k * hh, 0, hh, sh.w, hh, 1);
    }
    r.fade(this.fadeAlpha);
  }

  drawNormal(r, T, t, now) {
    const res = this.res, pop = (since) => (T <= since + ADD ? 1.3 - Math.sin(rad((T - since) / (ADD / 90))) * 0.3 : 1);
    // パネル
    r.spr(Tx['6_Result/Panel'], 0, 0);
    r.sprR(Tx['6_Result/DifficultyBar'], 18, 101, 0, clamp(this.song.difficulty | 0, 0, 4) * 54, 185, 54);
    r.spr(Tx['6_Result/Gauge_Base'], 55, 140);
    const gauge = Tx['6_Result/Gauge'];
    const gv = clamp(Math.floor((T - 2000) / 59), 0, this.gEnd);        // ゲージのコマ
    if (T >= 2000) {
      r.sprR(gauge, 57, 140, 0, 0, 9.74 * gv, 36);
      if (gv >= this.gEnd && this.gEnd === 50) {
        const rn = this.rainN;
        if (rn) r.spr(Tx['6_Result/Rainbow/' + (Math.floor(now / 16) % rn)], 57, 144);
        const sf = Math.floor(now / 33) % 9, fire = Tx['6_Result/Result_Soul_Fire'];
        if (sf < 8) r.sprC(fire, 576, 160, 1, 1, 1, 150 * sf, 0, 150, 131);
        const st = Tx['6_Result/Soul_Text'];
        r.sprC(st, 575, 159, 1, 1, 1, 37, 0, 37, 37);
        if (sf % 2 === 0) r.sprC(st, 575, 159, 1, 1, 1, 74, 0, 37, 37);
      }
    }
    if (!(gv === 50 && T >= 2000)) {
      r.sprR(gauge, 441, 142, gv < 40 ? 0 : 42, 35, 42, 20);
      r.sprC(Tx['6_Result/Soul_Text'], 575, 159, 1, 1, 1, 37 * (gv <= 30 ? 0 : 1), 0, 37, 37);
    }
    // 判定数
    const vals = [res.perfect, res.great, res.miss, res.roll, res.maxCombo];
    for (let k = 0; k < 5; k++) {
      const since = this.anime + INTERVAL * k; if (T < since || T < 2000) continue;
      this.digits(r, NUM_X, NUM_Y + NUM_PAD * k, String(vals[k]).padStart(4, ' '), pop(since));
    }
    // スコア
    if (T >= this.scoreAt) {
      const v = T - this.scoreAt;
      const s = v <= 270 ? 1 + Math.sin(rad(v / 1.5)) * 0.65 : v <= 360 ? 1 - Math.sin(rad(v - 270)) * 0.1 : 1;
      const str = String(res.score).padStart(7, ' '), sn = Tx['6_Result/Score_Number'];
      let x = SCORE_X;
      for (const ch of str) {
        if (ch !== ' ') r.sprC(sn, x - str.length * 33 + 25, SCORE_Y + 30, s, s, 1, (ch.charCodeAt(0) - 48) * 51, 0, 51, 60);
        x += 33;
      }
      // 王冠
      if (res.clear >= 1) {
        const crown = Tx['6_Result/Crown/Crown_' + clamp(res.clear - 1, 0, 2)], ck = clamp((v - 200) / 600, 0, 1);
        if (crown && ck > 0) {
          const sc = easeOutBack(ck) * 1.0;
          r.sprC(crown, 930, 150, sc * 1.25, sc * 1.25, ck, 0, 0, crown.w, crown.h);
          if (res.clear >= 2) this.sparkle(r, 930, 150, now);
        }
      }
    }
    // どんちゃん
    if (this.donN) {
      const k = easeOutCubic((t - 500) / 700), fr = Math.floor(now / 33) % this.donN;
      const tex = Tx[(this.cleared ? '6_Result/Result_Donchan_Clear/' : '6_Result/Result_Donchan_Normal/') + fr];
      const jump = this.cleared && T >= this.scoreAt ? Math.abs(Math.sin(now / 260)) * 10 : 0;
      r.sprC(tex, 930, 470 + (1 - k) * 260 - jump, 1.35, 1.35, 1);
    }
    // 結果メッセージ
    if (T >= this.scoreAt + 500) {
      const msg = ['もう1回 がんばろう！', 'クリア！', 'フルコンボ！', 'ぜんりょう！！'][clamp(res.clear, 0, 3)];
      const a = clamp((T - this.scoreAt - 500) / 400, 0, 1);
      r.sprC(textTex(msg, { size: 44, fill: '#fff', stroke: res.clear >= 1 ? '#c0392b' : '#27508a', strokeW: 8 }), 930, 255 - (1 - a) * 20, 1, 1, a);
    }
  }
  digits(r, x, y, str, s) {
    const n = Tx['6_Result/Number'];
    for (const ch of str) {
      if (ch !== ' ') r.sprC(n, x + 16, y + 19, s, s, 1, (ch.charCodeAt(0) - 48) * 32, 0, 32, 38);
      x += 22;
    }
  }
  sparkle(r, cx, cy, now) {
    const st = Tx['9_NamePlateEffect/GoldMStar']; if (!st) return;
    for (let i = 0; i < 5; i++) {
      const p = ((now / 900) + i * 0.2) % 1, a = Math.sin(p * Math.PI), ang = i * 1.26 + now / 1500;
      r.blend('lighter'); r.sprRot(st, cx + Math.cos(ang) * 78, cy + Math.sin(ang) * 54, p * 3, a, a, a); r.blend('source-over');
    }
  }
  drawDan(r, t) {
    const d = Tx['6_Result/Dan'];
    if (d) { const k = easeOutBack(t / 700); r.sprC(d, 100 + 250, 250, k, k, clamp(t / 300, 0, 1), 500 * this.danStatus, 0, 500, 500); }
    if (this.p.danPlate) r.sprC(this.p.danPlate, 149, 416, 1, 1, 1);
  }
}
