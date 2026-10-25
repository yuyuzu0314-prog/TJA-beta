// 09.Ending: 終了演出。ブラウザは自分で閉じられないので、演出のあと「もう一度はじめる」を出す。
import { Stage } from '../core/stage.js';
import { Tx, Assets } from '../core/assets.js';
import { Input } from '../core/input.js';
import { Settings } from '../core/settings.js';
import { Clock, clamp, easeOutCubic } from '../core/clock.js';
import { textTex } from '../core/text.js';

export class EndingStage extends Stage {
  enter() {
    this.t0 = Clock.now; this.n = Assets.countFrames('1_Title/Donchan_Normal/');
    this.app.audio.stopAll(); this.skipAnime = !Settings.endingAnime;
    this.fadeIn(500);
    if (!this.skipAnime) this.app.se('sanka');
  }
  update() {
    const res = this.stepFade(); if (res) return res;
    const t = Clock.now - this.t0;
    if (this.ready && t > 800 && (Input.decide() || Input.pointer.pressed || Input.pressed('cancel'))) {
      this.app.se('decide'); this.fadeOut(500, { to: 'title', params: { from: 'ending' } });
    }
    return null;
  }
  draw(r) {
    const t = Clock.now - this.t0;
    r.clear('#0b0b14');
    const bg = Tx['1_Title/Background'];
    if (bg) r.spr(bg, 0, 0, clamp(0.55 - t / 3000, 0.12, 1));
    r.rect(0, 0, 1280, 720, '#000', clamp(t / 2500, 0, 0.6));
    const k = easeOutCubic(t / 900);
    if (this.n && !this.skipAnime) {
      const f = Math.floor(t / 33) % this.n, bounce = Math.abs(Math.sin(t / 380)) * 18;
      r.sprC(Tx['1_Title/Donchan_Normal/' + f], 640, 330 - bounce, 1, 1, k);
    }
    const a = clamp((t - 500) / 700, 0, 1);
    r.sprC(textTex('ご利用ありがとうございました', { size: 46, fill: '#fff', stroke: '#c0392b', strokeW: 8 }), 640, 520 + (1 - a) * 20, 1, 1, a);
    if (t > 1600) {
      const blink = 0.45 + 0.55 * Math.abs(Math.sin(t / 380));
      r.sprC(textTex('Enter / タップ で タイトルへ戻る　（このタブは閉じて終了できます）', { size: 22, fill: '#ffe08a', stroke: '#000', strokeW: 4 }), 640, 620, 1, 1, blink);
    }
    r.fade(this.fadeAlpha);
  }
}
