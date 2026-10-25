// 04.Config: 左にカテゴリ、右に項目一覧。値は localStorage に保存される。
// ユーザー(プロフィール)編集とキー割り当てもここにある。
import { Stage } from '../core/stage.js';
import { Tx } from '../core/assets.js';
import { Input } from '../core/input.js';
import { Counter, Clock, clamp, op } from '../core/clock.js';
import { Settings, saveSettings, resetSettings, Users, DEFAULTS } from '../core/settings.js';
import { textTex, paragraphTex } from '../core/text.js';

const ROW_X = 560, ROW_Y = 130, ROW_H = 76, ROWS = 7;
const SKINS = ['0.JpnNijiiro'];
const onoff = (v) => (v ? 'ON' : 'OFF');
const KEYNAMES = { Space: 'Space', Enter: 'Enter', ShiftLeft: 'L-Shift', ShiftRight: 'R-Shift', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\', BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', Backquote: '`' };
const keyName = (c) => KEYNAMES[c] || c.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'Num');

const T = (key, label, desc, extra = {}) => ({ type: 'toggle', key, label, desc, ...extra });
const I = (key, label, desc, min, max, step = 1, extra = {}) => ({ type: 'int', key, label, desc, min, max, step, ...extra });
const L = (key, label, desc, options, extra = {}) => ({ type: 'list', key, label, desc, options, ...extra });

export class ConfigStage extends Stage {
  constructor(app) {
    super(app); this.editP = 0; this.confirm = ''; this.buildCategories();
  }
  buildCategories() {
    const app = this.app;
    const lv = (k, label, desc) => I(k, label, desc, 0, 100, 5, { fmt: (v) => v + '%', onChange: () => app.applyAudioLevels() });
    const eu = () => Users.player(this.editP);
    this.cats = [
      { name: 'システム', desc: '画面・音・入力まわりの基本設定です。', items: [
        T('fullscreen', '全画面表示', 'ONで全画面になります。Chromebook では F11 でも切り替えられます。', { onChange: (v) => app.toggleFullscreen(v) }),
        L('fpsCap', '描画FPSの上限', '画面の更新レートに合わせるのがおすすめです。120Hz以上のディスプレイでは 120 / 144 を選べます（表示が60Hzなら60が上限です）。', [['ディスプレイに合わせる', 0], ['60', 60], ['90', 90], ['120', 120], ['144', 144], ['240', 240]]),
        L('renderWidth', '描画解像度', '動作が重いときは小さくすると軽くなります。自動は最大1920px幅です。', [['自動 (最大1920)', 0], ['1280 x 720', 1280], ['1600 x 900', 1600], ['1920 x 1080', 1920], ['2560 x 1440', 2560]], { onChange: () => app.applyRender() }),
        T('showFps', 'FPS表示', '画面左上にFPSと処理時間を出します。F2 キーでも切り替えられます。', { onChange: (v) => { app.showFps = v; } }),
        T('bgm', 'BGMの再生', 'OFFにするとタイトルやリザルトのBGMが鳴りません。'),
        lv('seLevel', '効果音の音量', '効果音の音量です。'), lv('voiceLevel', 'ボイスの音量', 'ボイスの音量です。'), lv('songLevel', 'BGM・曲の音量', 'BGMと曲の再生音量です。'),
        I('inputAdjust', '入力タイミング補正', '叩いたタイミングを微調整します（ms）。マイナスで早く、プラスで遅く判定します。', -99, 99, 1, { fmt: (v) => (v > 0 ? '+' : '') + v + 'ms' }),
        T('endingAnime', '終了画面の演出', 'ONで終了時に演出を再生します。'),
        L('skin', 'スキン', 'スキンを切り替えます。設定を閉じると読み込み直します。', SKINS.map((s) => [s, s])),
        { type: 'action', label: '設定を初期化', desc: '全ての設定を初期値に戻します。もう一度押すと実行します。ユーザー情報は消えません。', run: () => this.confirmAct('reset', () => { resetSettings(); app.applyAudioLevels(); app.applyRender(); }) },
      ] },
      { name: '太鼓', desc: '演奏に関する設定です。', items: [
        L('playerCount', 'プレイ人数', '2にすると2人プレイ用の画面になります。', [['1人', 1], ['2人', 2]]),
        T('autoPlay', 'オートプレイ', 'すべての音符を自動で演奏します。'), T('autoPlay2P', 'オートプレイ 2P', '2P側をオートにします。'),
        T('autoRoll', 'AUTOの連打', 'OFFにするとオートが黄色連打を叩かなくなります。'),
        I('scrollSpeed', 'スクロール速度', '譜面が流れる速さです。大きいほど速くなります。', 0, 1999, 1, { fmt: (v) => 'x' + ((v + 1) / 10).toFixed(1) }),
        L('random', 'ランダム', '音符の並びを変えます。', [['OFF', 0], ['RANDOM', 1], ['MIRROR', 2], ['SUPER', 3], ['HYPER', 4]]),
        L('stealth', 'ステルス', 'DORON: 音符が消えるようになります。 STEALTH: 音符が見えなくなります。', [['OFF', 0], ['DORON', 1], ['STEALTH', 2]]),
        T('noInfo', 'NoInfo', '曲情報などを見えなくします。'), T('just', 'JUST', '「良」以外の判定をすべて「不可」にします。'),
        T('tight', 'Tight', '音符のないところを叩くとミスになります。'),
        I('minCombo', '最小コンボ表示', 'この数以上のコンボで表示を始めます。', 1, 999, 1),
        L('defaultCourse', '初期難易度', '曲選択で最初に選ばれる難易度です。', [['かんたん', 0], ['ふつう', 1], ['むずかしい', 2], ['おに', 3], ['おに(裏)', 4]]),
        L('scoreMode', 'スコア計算', 'TYPE-A: 旧配点 / TYPE-B: 旧新配点 / TYPE-C: 新配点', [['TYPE-A', 0], ['TYPE-B', 1], ['TYPE-C', 2]]),
        T('branchGuide', '分岐ガイド', '譜面分岐の参考になる数値を表示します。'),
        L('branchAnime', '分岐アニメーション', '譜面分岐時の演出です。', [['TYPE-A', 0], ['TYPE-B', 1]]),
        T('bigNotesJudge', '大音符の両手判定', '大音符の両手判定を有効にします。'), T('judgeCountDisp', '判定数の表示', '左下に判定数を表示します。'),
      ] },
      { name: '表示', desc: '演奏画面に出す画像をえらびます。', items: [
        T('showChara', 'キャラクター', 'キャラクター画像を表示します。'), T('showDancer', 'ダンサー', 'ダンサー画像を表示します。'),
        T('showMob', 'モブ', 'モブ画像を表示します。'), T('showRunner', 'ランナー', 'ランナー画像を表示します。'),
        T('showFooter', 'フッター', 'フッター画像を表示します。'), T('showPuchi', 'ぷちキャラ', 'ぷちキャラ画像を表示します。'),
        T('debugInfo', 'デバッグ情報', 'タイトル画面などに追加の情報を表示します。'),
      ] },
      { name: 'ユーザー', desc: 'プレイヤーごとの名前・称号・段位を編集します。成績は自動で保存されます。', items: [
        { type: 'custom', label: '編集するプレイヤー', desc: '1P / 2P のどちらのユーザーを編集するか選びます。', get: () => (this.editP === 0 ? '1P' : '2P'), step: () => { this.editP ^= 1; } },
        { type: 'custom', label: '使うユーザー', desc: 'このプレイヤーが使うユーザーを選びます。', get: () => eu().name, step: (d) => this.cycleUser(d) },
        { type: 'action', label: '名前を変える', desc: 'ユーザー名を入力します（日本語OK、最大12文字）。Enterで決定、Escでキャンセル。', value: () => eu().name, run: () => this.editText('name', 12) },
        { type: 'action', label: '称号', desc: 'ネームプレートに出す称号です。空にすると表示されません。', value: () => eu().title || '(なし)', run: () => this.editText('title', 14) },
        { type: 'custom', label: '称号の色', desc: '称号プレートの色です。金・紫には光の演出がつきます。', get: () => ['銅', '金', '紫'][eu().titleType | 0], step: (d) => { const u = eu(); u.titleType = (((u.titleType | 0) + d) % 3 + 3) % 3; Users.save(); } },
        { type: 'action', label: '段位', desc: 'ネームプレートに出す段位です。空にすると表示されません。', value: () => eu().dan || '(なし)', run: () => this.editText('dan', 8) },
        { type: 'custom', label: '段位の色', desc: '段位プレートの色です。', get: () => ['銀', '金', '虹'][eu().danType | 0], step: (d) => { const u = eu(); u.danType = (((u.danType | 0) + d) % 3 + 3) % 3; Users.save(); } },
        { type: 'custom', label: '段位の金枠', desc: '達人などの金枠表示です。', get: () => onoff(eu().danGold), step: () => { const u = eu(); u.danGold = !u.danGold; Users.save(); } },
        { type: 'info', label: '成績', desc: 'このユーザーの成績です。', get: () => { const s = eu().stats; return `${s.plays}回 / ハイスコア ${s.bestScore.toLocaleString()}`; } },
        { type: 'info', label: 'クリア・フルコンボ・全良', desc: 'クリアした回数、フルコンボの回数、全良の回数です。', get: () => { const s = eu().stats; return `${s.clears} / ${s.fullCombos} / ${s.allPerfects}`; } },
        { type: 'action', label: 'ユーザーを追加', desc: '新しいユーザーを作って、このプレイヤーに割り当てます。', run: () => { const i = Users.add('ゲスト' + (Users.list.length + 1)); Settings.activeUsers[this.editP] = i; saveSettings(); this.editText('name', 12); } },
        { type: 'action', label: 'ユーザーを削除', desc: '今のユーザーを削除します（2人未満にはできません）。もう一度押すと実行します。', run: () => this.confirmAct('del', () => { const i = Settings.activeUsers[this.editP]; if (!Users.remove(i)) this.app.se('error'); }) },
      ] },
      { name: 'キー設定', desc: '押したいキーを割り当てます。Chromebook は D F J K が標準です。', items: [
        ...['LeftRed', 'RightRed', 'LeftBlue', 'RightBlue', 'LeftRed2P', 'RightRed2P', 'LeftBlue2P', 'RightBlue2P', 'Capture'].map((k) => ({
          type: 'key', key: k, label: { LeftRed: '左のドン (1P)', RightRed: '右のドン (1P)', LeftBlue: '左のカッ (1P)', RightBlue: '右のカッ (1P)', LeftRed2P: '左のドン (2P)', RightRed2P: '右のドン (2P)', LeftBlue2P: '左のカッ (2P)', RightBlue2P: '右のカッ (2P)', Capture: 'スクリーンショット' }[k],
          desc: 'Enterを押してから、割り当てたいキーを押してください（Escでキャンセル）。' })),
        { type: 'action', label: 'キーを初期化', desc: 'キー割り当てを初期値に戻します。', run: () => { Settings.keys = structuredClone(DEFAULTS.keys); saveSettings(); this.app.se('decide'); } },
      ] },
      { name: 'もどる', desc: 'タイトル画面に戻ります。', items: [], back: true },
    ];
  }
  confirmAct(id, fn) {
    if (this.confirm === id) { this.confirm = ''; fn(); this.app.se('decide'); } else { this.confirm = id; this.confirmT = Clock.now; this.app.se('change'); }
  }
  cycleUser(d) {
    const n = Users.list.length, cur = Settings.activeUsers[this.editP], other = Settings.activeUsers[this.editP ^ 1];
    let i = cur; for (let k = 0; k < n; k++) { i = (i + d + n) % n; if (i !== other || n < 2) break; }
    Settings.activeUsers[this.editP] = i; saveSettings();
  }
  editText(field, max) {
    const u = Users.player(this.editP); this.editing = { field, text: u[field] || '' };
    Input.beginText(u[field] || '', max, (v) => { this.editing && (this.editing.text = v); }, (v) => {
      if (v !== null) { u[field] = v.trim(); if (field === 'name' && !u.name) u.name = 'ゲスト'; Users.save(); this.app.se('decide'); }
      this.editing = null;
    });
  }

  enter() {
    this.cat = 0; this.sel = 0; this.scroll = 0; this.focusList = false; this.assign = null; this.editing = null; this.confirm = '';
    this.bgAnim = new Counter().startLoop(0, 1279, 16); this.t0 = Clock.now;
    this.skinAtEnter = Settings.skin; this.holdStart = 0;
    this.app.audio.stopGroup('song'); this.fadeIn(400);
  }
  leave() { Input.endText(); saveSettings(); Users.save(); }
  get items() { return this.cats[this.cat].items; }
  get curItem() { return this.items[this.sel]; }

  // 項目の値を取得/変更
  valueText(it) {
    switch (it.type) {
      case 'toggle': return onoff(Settings[it.key]);
      case 'int': return it.fmt ? it.fmt(Settings[it.key]) : String(Settings[it.key]);
      case 'list': { const o = it.options.find((x) => x[1] === Settings[it.key]) || it.options[0]; return o[0]; }
      case 'custom': case 'info': return it.get();
      case 'action': return it.value ? it.value() : '';
      case 'key': return (Settings.keys[it.key] || []).map(keyName).join(' / ') || '---';
    }
    return '';
  }
  change(it, d, mult = 1) {
    if (!it) return;
    const a = this.app;
    if (it.type === 'toggle') { Settings[it.key] = !Settings[it.key]; it.onChange?.(Settings[it.key]); a.se('change'); }
    else if (it.type === 'int') {
      const nv = clamp(Settings[it.key] + d * it.step * mult, it.min, it.max);
      if (nv !== Settings[it.key]) { Settings[it.key] = nv; it.onChange?.(nv); a.se('change'); }
    } else if (it.type === 'list') {
      const i = it.options.findIndex((x) => x[1] === Settings[it.key]); const n = it.options.length;
      Settings[it.key] = it.options[(((i < 0 ? 0 : i) + d) % n + n) % n][1]; it.onChange?.(Settings[it.key]); a.se('change');
    } else if (it.type === 'custom') { it.step(d); a.se('change'); }
    saveSettings();
  }
  activate(it) {
    const a = this.app;
    if (!it) return;
    if (it.type === 'toggle' || it.type === 'list') this.change(it, 1);
    else if (it.type === 'custom') this.change(it, 1);
    else if (it.type === 'action') { a.se('decide'); it.run(); }
    else if (it.type === 'key') { a.se('decide'); this.assign = { key: it.key, t0: Clock.now }; }
    else if (it.type === 'int') a.se('decide');
  }
  exit() {
    this.app.se('cancel');
    const skinChanged = Settings.skin !== this.skinAtEnter;
    this.fadeOut(500, skinChanged ? { to: 'changeskin', params: { skin: Settings.skin } } : { to: 'title', params: { from: 'config' } });
  }

  update() {
    const a = this.app, res = this.stepFade();
    if (res) return res;
    if (this.confirm && Clock.now - this.confirmT > 3000) this.confirm = '';
    if (!this.ready) return null;
    if (this.editing) return null;                    // 文字入力中は <input> が受け持つ

    // ---- キー割り当て待ち ----
    if (this.assign) {
      if (Clock.now - this.assign.t0 > 150) {
        const k = Input.lastPressedKey;
        if (Input.pressed('cancel') || k === 'Escape') { a.se('cancel'); this.assign = null; }
        else if (k && !['Enter', 'NumpadEnter'].includes(k) || (k && Clock.now - this.assign.t0 > 400)) {
          Settings.keys[this.assign.key] = [k]; saveSettings(); a.se('decide'); this.assign = null;
        }
      }
      return null;
    }

    const up = Input.repeat('up') || Input.repeat('LeftBlue'), down = Input.repeat('down') || Input.repeat('RightBlue');
    const dec = Input.decide(), esc = Input.pressed('cancel');
    const cat = this.cats[this.cat];

    if (!this.focusList) {
      if (up) { this.cat = (this.cat + this.cats.length - 1) % this.cats.length; this.sel = 0; this.scroll = 0; a.se('move'); }
      if (down) { this.cat = (this.cat + 1) % this.cats.length; this.sel = 0; this.scroll = 0; a.se('move'); }
      if (dec) { if (cat.back) { this.exit(); return null; } a.se('decide'); this.focusList = true; }
      else if (Input.pressed('right') && !cat.back) { a.se('decide'); this.focusList = true; }
      if (esc) { this.exit(); return null; }
    } else {
      const n = this.items.length;
      if (up) { this.sel = (this.sel + n - 1) % n; a.se('move'); this.confirm = ''; }
      if (down) { this.sel = (this.sel + 1) % n; a.se('move'); this.confirm = ''; }
      // 値の変更（長押しで加速）
      const it = this.curItem;
      const l = Input.repeat('left'), rr = Input.repeat('right');
      if (Input.pressed('left') || Input.pressed('right')) this.holdStart = Clock.now;
      if (l || rr) {
        const hold = Clock.now - this.holdStart; const wide = it && it.type === 'int' && (it.max - it.min) > 60;
        this.change(it, l ? -1 : 1, wide ? (hold > 2600 ? 10 : hold > 1300 ? 4 : 1) : 1);
      }
      if (dec) this.activate(it);
      if (esc) { a.se('cancel'); this.focusList = false; this.confirm = ''; }
    }
    if (Input.shiftHeld && Input.key('F1')) { /* 設定画面から設定画面へは何もしない */ }

    // ---- ポインタ ----
    const p = Input.pointer;
    if (p.pressed) {
      for (let i = 0; i < this.cats.length; i++) {
        if (p.x > 90 && p.x < 470 && p.y > 140 + i * 39 && p.y < 140 + i * 39 + 38) {
          if (this.cat === i && this.focusList) { this.focusList = false; } else { this.cat = i; this.sel = 0; this.scroll = 0; this.focusList = !this.cats[i].back; a.se(this.cats[i].back ? 'decide' : 'move'); }
          if (this.cats[i].back) { this.exit(); return null; }
        }
      }
      for (let i = 0; i < ROWS; i++) {
        const idx = this.scroll + i; if (idx >= this.items.length) break;
        const y = ROW_Y + i * ROW_H;
        if (p.x > ROW_X && p.x < ROW_X + 614 && p.y > y && p.y < y + 72) {
          this.focusList = true;
          if (this.sel !== idx) { this.sel = idx; a.se('move'); }
          else if (p.x < ROW_X + 330) this.activate(this.curItem);
          else if (p.x > ROW_X + 470) this.change(this.curItem, 1);
          else if (p.x < ROW_X + 400) this.change(this.curItem, -1);
          else this.activate(this.curItem);
        }
      }
    }
    // スクロール位置を選択に追従
    if (this.sel < this.scroll) this.scroll = this.sel;
    if (this.sel >= this.scroll + ROWS) this.scroll = this.sel - ROWS + 1;
    return null;
  }

  draw(r) {
    const bg = Tx['2_Config/Background'], bv = this.bgAnim.value;
    if (bg) { r.spr(bg, bv, 0); r.spr(bg, bv - 1280, 0); } else r.clear('#e6c07a');
    r.spr(Tx['2_Config/Header'], 0, 0);

    // ---- 左メニュー ----
    const cur = Tx['2_Config/Cursor'];
    this.cats.forEach((c, i) => {
      const y = 140 + i * 39, on = i === this.cat;
      if (on) {
        r.roundRect(104, y - 1, 356, 38, 10, '#3b2a14', this.focusList ? 0.28 : 0.55);
        r.spr(cur, 112, y + 3, this.focusList ? 0.5 : 1);
      }
      const t = textTex(c.name, { size: 24, fill: on ? '#fff3b0' : '#fff', stroke: '#5a3a1e', strokeW: 4 });
      r.spr(t, 282 - t.w / 2, y - 3 + (on ? Math.sin(Clock.now / 140) * 0.8 : 0));
    });

    // ---- 説明パネル ----
    const desc = this.focusList ? (this.curItem?.desc || '') : this.cats[this.cat].desc;
    const title = this.focusList ? (this.curItem?.label || '') : this.cats[this.cat].name;
    r.spr(textTex(title, { size: 22, fill: '#ffe08a', stroke: '#000', strokeW: 3 }), 76, 386);
    r.spr(paragraphTex(desc, { size: 20, width: 470, lineHeight: 28, fill: '#fff' }), 70, 424);
    if (this.confirm) r.spr(textTex('もう一度 決定 を押すと実行します', { size: 18, fill: '#ff9d9d', stroke: '#000', strokeW: 3 }), 76, 624);

    // ---- 右の項目 ----
    const box = Tx['2_Config/ItemBox'], items = this.items;
    for (let i = 0; i < ROWS; i++) {
      const idx = this.scroll + i; if (idx >= items.length) break;
      const it = items[idx], y = ROW_Y + i * ROW_H, on = this.focusList && idx === this.sel;
      const al = this.focusList ? 1 : 0.7;
      r.spr(box, ROW_X, y, al);
      if (on) { r.blend('lighter'); r.spr(box, ROW_X, y, 0.28 + 0.12 * Math.sin(Clock.now / 150)); r.blend('source-over'); }
      const lab = textTex(it.label, { size: 24, fill: '#fff', stroke: '#6b3f1d', strokeW: 4, maxW: 250 });
      r.sprS(lab, ROW_X + 34, y + 36 - lab.h / 2, lab.scaleX, 1, al);
      const val = this.valueText(it);
      if (val !== '') {
        const vt = textTex(String(val), { size: 24, fill: on ? '#fff3b0' : '#fff', stroke: '#6b3f1d', strokeW: 4, maxW: 215 });
        const cx = ROW_X + 470; r.sprC(vt, cx, y + 36, vt.scaleX, 1, al);
        if (on && (it.type === 'toggle' || it.type === 'int' || it.type === 'list' || it.type === 'custom')) {
          const wob = Math.sin(Clock.now / 180) * 3;
          r.arrow(ROW_X + 345 - wob, y + 36, -1, 11, '#fff3b0', 1); r.arrow(ROW_X + 595 + wob, y + 36, 1, 11, '#fff3b0', 1);
        }
      }
    }
    // スクロールバー
    if (items.length > ROWS) {
      const th = 470 * ROWS / items.length, ty = ROW_Y + (470 - th) * (this.scroll / (items.length - ROWS));
      r.roundRect(1190, ROW_Y, 8, 470, 4, '#000', 0.15); r.roundRect(1190, ty, 8, th, 4, '#7a4a1e', 0.8);
    }
    // 現在のプレイヤー(ユーザー編集時)
    if (this.cat === 3) r.spr(textTex(`編集中: ${this.editP === 0 ? '1P' : '2P'}  ${Users.player(this.editP).name}`, { size: 20, fill: '#fff', stroke: '#6b3f1d', strokeW: 4 }), ROW_X + 4, 100);

    // ---- 文字入力 ----
    if (this.editing) {
      r.rect(0, 0, 1280, 720, '#000', 0.55);
      r.roundRect(340, 270, 600, 170, 24, '#fff4d6', 1);
      r.spr(textTex('入力して Enter で決定（Escでキャンセル）', { size: 22, fill: '#6b3f1d' }), 640 - 235, 285);
      const caret = Math.floor(Clock.now / 450) % 2 ? '|' : ' ';
      const t = textTex((this.editing.text || '') + caret, { size: 40, fill: '#222', weight: 'bold' });
      r.sprC(t, 640, 372, Math.min(1, 520 / t.w), 1);
    }
    // ---- キー割り当て ----
    if (this.assign) {
      r.rect(0, 0, 1280, 720, '#000', 0.55);
      const ka = Tx['2_Config/KeyAssign'];
      if (ka) r.sprC(ka, 640, 360, 4, 4, 1);
      const w = 0.6 + 0.4 * Math.sin(Clock.now / 200);
      r.spr(textTex('割り当てるキーを押してください', { size: 30, fill: '#fff', stroke: '#000', strokeW: 5 }), 640 - 215, 560, w);
    }
    // ---- フェード(設定画面は白) ----
    const fa = this.fadeAlpha; if (fa > 0) r.rect(0, 0, 1280, 720, '#fff', fa);
  }
}
