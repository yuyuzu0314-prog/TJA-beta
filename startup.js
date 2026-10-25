// 01.StartUp: アセットを読み込み、Readme を見せて、キー/タップで開始する。
// ブラウザの自動再生制限を解くためのユーザー操作の受け口も兼ねる。
import { Stage } from '../core/stage.js';
import { Tx, Assets } from '../core/assets.js';
import { Input } from '../core/input.js';
import { Settings } from '../core/settings.js';
import { Clock } from '../core/clock.js';

export class StartupStage extends Stage {
  enter() {
    this.state = 'loading'; this.prog = 0; this.msg = 'Loading skin...'; this.err = null; this.t0 = Clock.now;
    this.parts = { skin: 0, snd: 0, font: 0 };
    const app = this.app;
    (async () => {
      try {
        await Assets.loadFont(); this.parts.font = 1;
        await Assets.loadSkin(Settings.skin, (d, t) => { this.parts.skin = d / t; });
        this.msg = 'Loading sounds...';
        await app.loadSounds((d, t) => { this.parts.snd = d / t; });
        this.state = 'ready'; this.t0 = Clock.now;
      } catch (e) { console.error(e); this.err = String(e); }
    })();
  }
  update() {
    this.prog = this.parts.font * 0.05 + this.parts.skin * 0.7 + this.parts.snd * 0.25;
    if (this.state === 'ready' && this.phase === 'normal') {
      if (Clock.now - this.t0 > 250 && (Input.anyPressed())) {
        this.app.audio.resume(); this.app.applyAudioLevels();
        this.app.se('decide');
        this.fadeOut(400, { to: 'title', params: { from: 'startup' } });
      }
    }
    return this.stepFade();
  }
  draw(r) {
    r.clear('#000');
    if (this.state === 'loading') {
      const w = 520, x = (r.W - w) / 2, y = 380;
      r.textRaw('TJAPlayer3 Web', r.W / 2, 290, 44, '#fff', 'center');
      r.textRaw(this.err ? 'ERROR: ' + this.err : this.msg, r.W / 2, 345, 18, this.err ? '#f88' : '#bbb', 'center');
      r.rect(x, y, w, 10, '#333'); r.rect(x, y, w * this.prog, 10, '#ffb400');
    } else {
      const bg = Tx['Readme'];
      if (bg) r.spr(bg, 0, 0); else r.textRaw('Press any key', r.W / 2, 340, 30, '#fff', 'center');
      const a = 0.5 + 0.5 * Math.sin((Clock.now - this.t0) / 260);
      r.textRaw('Enter / クリック / タップ で開始', r.W / 2, 650, 22, '#ffd54a', 'center', 0.35 + a * 0.65);
    }
    r.fade(this.fadeAlpha);
  }
}
