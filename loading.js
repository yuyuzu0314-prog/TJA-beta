// 06.SongLoading: 曲名プレートの演出。待っている間に params.loader(Promise) を実行できる。
//   params = { song:{title,subtitle,difficulty,genre,dan}, loader?: ()=>Promise, next?:'play', nextParams?:{} }
// 曲の読み込みは別担当の想定なので、loader に曲データの読み込み処理を渡すとここで待つ。
import { Stage } from '../core/stage.js';
import { Tx } from '../core/assets.js';
import { Input } from '../core/input.js';
import { Counter, Clock, clamp, op, easeOutCubic, easeOutBack } from '../core/clock.js';
import { textTex } from '../core/text.js';

export class SongLoadingStage extends Stage {
  enter(p = {}) {
    this.p = p; this.song = p.song || { title: '(曲名)', subtitle: '', difficulty: 3 };
    this.dan = !!this.song.dan;
    this.ct = new Counter().start(0, this.dan ? 1000 : 600, 5);     // 原作: 3秒 / 段位は5秒
    this.t0 = Clock.now; this.loaded = false; this.loadErr = null; this.skipped = false;
    this.app.audio.stopGroup('song');
    this.fadeIn(400);
    const run = p.loader ? Promise.resolve().then(() => p.loader()) : Promise.resolve();
    run.then(() => { this.loaded = true; }).catch((e) => { console.error(e); this.loadErr = String(e); this.loaded = true; });
  }
  update() {
    const res = this.stepFade(); if (res) return res;
    if (!this.ready) return null;
    if (Input.pressed('cancel')) { this.app.se('cancel'); this.fadeOut(300, { to: 'songselect' }); return null; }
    if (this.loaded && this.ct.done) {
      this.fadeOut(500, { to: this.p.next || 'play', params: { song: this.song, ...(this.p.nextParams || {}) } });
    }
    return null;
  }
  draw(r) {
    const t = Clock.now - this.t0;
    if (!this.dan) this.drawNormal(r, t); else this.drawDan(r, t);
    // 読み込み中インジケータ
    const dots = '.'.repeat(1 + Math.floor(t / 350) % 3);
    const waiting = !(this.loaded && this.ct.done);
    r.spr(textTex(waiting ? 'Now Loading' + dots : 'Ready!', { size: 26, fill: '#fff', stroke: '#c0392b', strokeW: 5 }), 1010, 664);
    if (this.loadErr) r.spr(textTex('読み込みエラー: ' + this.loadErr, { size: 18, fill: '#ffb', stroke: '#000', strokeW: 3 }), 20, 690);
    // 下の進捗バー（時間ベース）
    const pr = clamp(this.ct.value / this.ct.end, 0, 1);
    r.rect(0, 712, 1280, 8, '#000', 0.25); r.rect(0, 712, 1280 * pr, 8, '#ffcf3a', 1);
    r.fade(this.fadeAlpha);
  }
  drawNormal(r, t) {
    // 背景（虹色の帯）。ゆっくり明るさを呼吸させる
    const bg = Tx['4_SongLoading/Bg_Wait'];
    r.clear('#fff'); if (bg) r.spr(bg, 0, 0);
    // キャラが左右から飛び込む
    const ch = Tx['4_SongLoading/Chara'], k = easeOutBack(t / 700);
    if (ch) {
      r.sprR(ch, -(1 - k) * 360, 0, 0, 0, 640, 720, 1);
      r.sprR(ch, 640 + (1 - k) * 360, 0, 640, 0, 640, 720, 1);
    }
    // プレート（中央から横に開く）
    const pl = Tx['4_SongLoading/Plate'], pk = easeOutCubic((t - 150) / 450);
    if (pl) r.sprC(pl, 640, 360, pk, 1, 1);
    // タイトル
    const hasSub = !!this.song.subtitle;
    const a = clamp((t - 450) / 300, 0, 1);
    const tt = textTex(this.song.title || '', { size: 31, fill: '#fff', stroke: '#000', strokeW: 5, maxW: 900 });
    r.sprC(tt, 640 + (1 - easeOutCubic((t - 450) / 450)) * 60, 280 + (hasSub ? 0 : 15), tt.scaleX, 1, a);
    if (hasSub) {
      const st = textTex(this.song.subtitle, { size: 20, fill: '#000', maxW: 900 });
      r.sprC(st, 640 - (1 - easeOutCubic((t - 600) / 450)) * 60, 325, st.scaleX, 1, clamp((t - 600) / 300, 0, 1));
    }
  }
  drawDan(r, t) {
    const bg = Tx['4_SongLoading/Bg_Dan'], v = this.ct.value;
    if (bg) r.spr(bg, 0, -(v <= 600 ? v / 10 : 60));
    const a = clamp((v <= 51 ? v / 0.2 : 255 - (v - 949) / 0.2) / 255, 0, 1);
    const tt = textTex(this.song.title || '段位', { size: 56, fill: '#fff', stroke: '#2a1a0a', strokeW: 8 });
    r.sprC(tt, 1121, 213, 1, 1, a);
    if (this.song.subtitle) r.sprC(textTex(this.song.subtitle, { size: 24, fill: '#fff', stroke: '#000', strokeW: 4 }), 1121, 268, 1, 1, a);
    const tl = Tx['Tile_Black'];
    if (tl) r.tile(tl, 0, 0, 1280, 720, op(v <= 51 ? 255 - v / 0.2 : (v - 949) / 0.2));
  }
}
