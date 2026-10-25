// ネームプレート(CNamePlate)。名前/称号/段位の文字は一度だけ画像化して使い回す。
import { Tx } from '../core/assets.js';
import { Users } from '../core/settings.js';
import { Counter } from '../core/clock.js';
import { textTex } from '../core/text.js';

const fx = new Counter(0, 120, 16.6); fx.loop = true; fx.running = true; fx._t0 = 0;
const W = 220, H = 54;

function fitX(tex, maxW) { return tex.tw > maxW ? maxW / tex.tw : 1; }

/**
 * x,y: 左上。player: 0/1。title: タイトル画面向けレイアウト(1P/2Pアイコンなし)。alpha: 0..1
 * 称号プレート(銅/金/紫)は称号があるときに重ね、金/紫には光が走る。
 */
export function drawNamePlate(r, x, y, player = 0, title = false, alpha = 1, now = performance.now()) {
  const base = Tx['NamePlate']; if (!base || alpha <= 0) return;
  const u = Users.player(player);
  const hasTitle = !!u.title, hasDan = !!u.dan;
  const tt = Math.max(0, Math.min(2, u.titleType | 0)), dt = Math.max(0, Math.min(2, u.danType | 0));
  r.sprR(base, x, y, 0, 3 * H, W, H, alpha);
  if (hasTitle) r.sprR(base, x, y, 0, (4 + tt) * H, W, H, alpha);
  if (hasDan) { r.sprR(base, x, y, 0, 7 * H, W, H, alpha); r.sprR(base, x, y, 0, (8 + dt) * H, W, H, alpha); }

  // 文字
  const name = textTex(u.name || ' ', { size: 22, fill: '#fff', stroke: '#000', strokeW: 3 });
  const nsx = fitX(name, hasDan ? 120 : 220);
  if (hasTitle) {
    const t = textTex(u.title, { size: 16, fill: '#000', weight: 'bold' });
    const s = fitX(t, 160);
    r.sprC(t, x + 115, y + 19, s, s, alpha);
    r.sprC(name, hasDan ? x + 149 : x + 100, y + 45, nsx, 1, alpha);
  } else r.sprC(name, x + 121, y + 36, nsx, 1, alpha);
  if (hasDan) {
    const d = textTex(u.dan, { size: 16, fill: '#fff', stroke: '#000', strokeW: 3 });
    const s = fitX(d, 66); r.sprC(d, x + 69, y + 45, s, 1, alpha);
    if (u.danGold) { r.blend('multiply'); r.sprR(base, x, y, 0, 11 * H, W, H, alpha); r.blend('source-over'); }
  }
  if (!title) r.sprR(base, x, y, 0, player === 1 ? 2 * H : 0, W, H, alpha);

  // 光の演出: 金(1)/紫(2)の称号プレートに「スラッシュ」と星を走らせる
  if ((hasTitle && tt > 0) || (hasDan && dt > 0)) {
    const kind = hasTitle && tt > 0 ? tt : dt;           // 1=金 2=紫
    const t = (now % 2000) / 2000;                          // 2秒周期
    const slash = Tx['9_NamePlateEffect/Slash'];
    const big = Tx[kind === 1 ? '9_NamePlateEffect/GoldBStar' : '9_NamePlateEffect/PurpleBStar'];
    const mid = Tx[kind === 1 ? '9_NamePlateEffect/GoldMStar' : '9_NamePlateEffect/PurpleMStar'];
    const ctx = r.ctx; ctx.save(); ctx.beginPath(); ctx.rect(x, y, W, H); ctx.clip();
    if (slash && t < 0.55) { r.blend('lighter'); r.sprRot(slash, x - 40 + (t / 0.55) * (W + 80), y + H / 2, -0.35, 1.2, 3.2, alpha * 0.85); r.blend('source-over'); }
    ctx.restore();
    const star = (tex, sx, sy, ph, size) => {
      if (!tex) return; const p = ((now / 1000) * 1.1 + ph) % 1; const s = Math.sin(p * Math.PI);
      r.blend('lighter'); r.sprRot(tex, x + sx, y + sy, p * 1.2, s * size, s * size, alpha * s); r.blend('source-over');
    };
    star(big, 14, 12, 0.0, 0.55); star(mid, W - 18, 40, 0.37, 0.9); star(big, W - 30, 10, 0.66, 0.45); star(mid, 40, 46, 0.82, 0.8);
  }
}
