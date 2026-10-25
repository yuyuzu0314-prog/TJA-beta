// ===== 別担当（曲選択・段位選択・プレイ）の差し込み口 =====
// ここにあるのは「画面遷移を通しで確認する」ためだけの最小スタブ。
// 本実装ができたら main.js の register('songselect', ...) を差し替えるだけで繋がる。
//
//   曲選択 → app.go('loading', { song, difficulty, ... })
//   プレイ → app.go('result', { result: {...} })        （形式は stages/result.js の先頭コメント）
import { Stage } from '../core/stage.js';
import { Input } from '../core/input.js';
import { Clock } from '../core/clock.js';
import { Tx } from '../core/assets.js';
import { textTex } from '../core/text.js';

export const SAMPLE_SONGS = [
  { title: 'サンプル曲 ①（クリア）', subtitle: '--テスト用の曲名です--', difficulty: 3, genre: 0,
    result: { perfect: 412, great: 61, miss: 9, roll: 134, maxCombo: 187, score: 783420, gauge: 82, clear: 1 } },
  { title: 'サンプル曲 ②（全良）', subtitle: '--ゲージ満タンの虹演出--', difficulty: 4, genre: 3,
    result: { perfect: 640, great: 0, miss: 0, roll: 220, maxCombo: 640, score: 1048760, gauge: 100, clear: 3 } },
  { title: 'サンプル曲 ③（失敗）', subtitle: '--ゲージ不足--', difficulty: 1, genre: 5,
    result: { perfect: 120, great: 80, miss: 140, roll: 12, maxCombo: 34, score: 193500, gauge: 36, clear: 0 } },
];

class MenuStub extends Stage {
  label() { return ''; }
  enter(p) { this.sel = 0; this.fadeIn(350); this.app.audio.stopGroup('song'); }
  items() { return []; }
  update() {
    const it = this.items();
    if (this.ready) {
      if (Input.repeat('up') || Input.repeat('LeftBlue')) { this.sel = (this.sel + it.length - 1) % it.length; this.app.se('move'); }
      if (Input.repeat('down') || Input.repeat('RightBlue')) { this.sel = (this.sel + 1) % it.length; this.app.se('move'); }
      for (let i = 0; i < it.length; i++) if (Input.tapIn(300, 250 + i * 70, 680, 60)) { this.sel = i; this.app.se('decide'); this.fadeOut(300, it[i].go()); }
      if (Input.decide()) { this.app.se('decide'); this.fadeOut(300, it[this.sel].go()); }
      if (Input.pressed('cancel')) { this.app.se('cancel'); this.fadeOut(300, { to: 'title' }); }
    }
    return this.stepFade();
  }
  draw(r) {
    r.clear('#1b2a3a');
    r.tile(Tx['2_Config/Background'], 0, 0, r.W, r.H, 0.25);
    r.rect(0, 0, r.W, 110, '#000', 0.5);
    r.spr(textTex(this.label(), { size: 40, fill: '#fff', stroke: '#c0392b' }), 40, 28);
    r.spr(textTex('※ 開発用スタブです。実装済みの画面に差し替えてください (js/stages/stubs.js)', { size: 18, fill: '#ffd54a', stroke: '#000', strokeW: 3 }), 40, 74);
    this.items().forEach((o, i) => {
      const y = 250 + i * 70, on = i === this.sel;
      r.roundRect(300, y, 680, 60, 14, on ? '#ffb400' : '#fff', on ? 0.95 : 0.8);
      r.spr(textTex(o.text, { size: 26, fill: '#222', weight: 'bold' }), 330, y + 10);
    });
    r.spr(textTex('↑↓ / D・K で選択   Enter / F・J で決定   Esc で戻る', { size: 20, fill: '#fff', stroke: '#000', strokeW: 3 }), 300, 640);
    r.fade(this.fadeAlpha);
  }
}
export class SongSelectStub extends MenuStub {
  label() { return '曲選択（スタブ）'; }
  items() {
    return SAMPLE_SONGS.map((s) => ({ text: s.title, go: () => ({ to: 'loading', params: { song: s } }) }))
      .concat([{ text: '← タイトルへ戻る', go: () => ({ to: 'title' }) }]);
  }
}
export class DanSelectStub extends MenuStub {
  label() { return '段位道場（スタブ）'; }
  items() {
    return [{ text: '段位チャレンジを開始（ローディング演出のテスト）', go: () => ({ to: 'loading', params: { song: { ...SAMPLE_SONGS[0], dan: true, title: '十段', subtitle: '段位認定' } } }) },
      { text: '← タイトルへ戻る', go: () => ({ to: 'title' }) }];
  }
}
export class PlayStub extends Stage {
  enter(p) { this.p = p; this.t0 = Clock.now; this.fadeIn(300); }
  update() {
    if (this.ready && (Clock.now - this.t0 > 1500 || Input.decide() || Input.pointer.pressed)) this.fadeOut(300, { to: 'result', params: { song: this.p.song, result: this.p.song.result, dan: this.p.song.dan } });
    return this.stepFade();
  }
  draw(r) {
    r.clear('#101010');
    r.spr(textTex('演奏画面（スタブ） — 自動でリザルトへ進みます', { size: 34, fill: '#fff' }), 300, 330);
    r.fade(this.fadeAlpha);
  }
}
