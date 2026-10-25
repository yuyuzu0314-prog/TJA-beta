// 10.ChangeSkin: スキンを読み込み直す。
import { Stage } from '../core/stage.js';
import { Assets } from '../core/assets.js';
import { Settings } from '../core/settings.js';
import { clearTextCache } from '../core/text.js';
import { Clock } from '../core/clock.js';

export class ChangeSkinStage extends Stage {
  enter(p = {}) {
    this.prog = 0; this.done = false; this.t0 = Clock.now; this.err = null;
    this.app.audio.stopAll(); clearTextCache(); this.fadeIn(250);
    const skin = p.skin || Settings.skin;
    (async () => {
      try {
        await Assets.loadSkin(skin, (d, t) => { this.prog = d / t * 0.8; });
        await this.app.loadSounds((d, t) => { this.prog = 0.8 + d / t * 0.2; });
        Settings.skin = skin; this.done = true;
      } catch (e) { console.error(e); this.err = String(e); }
    })();
  }
  update() {
    const res = this.stepFade(); if (res) return res;
    if (this.done && this.ready && Clock.now - this.t0 > 600) this.fadeOut(300, { to: 'title', params: { from: 'changeskin' } });
    return null;
  }
  draw(r) {
    r.clear('#000');
    r.textRaw(this.err ? 'ERROR: ' + this.err : 'スキンを読み込み中...', r.W / 2, 320, 30, this.err ? '#f88' : '#fff', 'center');
    r.rect(380, 380, 520, 10, '#333'); r.rect(380, 380, 520 * this.prog, 10, '#ffb400');
    r.fade(this.fadeAlpha);
  }
}
