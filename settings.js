// 設定とユーザー(プロフィール)の保存。localStorage に JSON で持つ。
const SKEY = 'tjaweb.settings.v1', UKEY = 'tjaweb.users.v1';
export const DEFAULTS = {
  skin: '0.JpnNijiiro',
  // システム
  fullscreen: false, fpsCap: 0, renderWidth: 0, showFps: false, bgm: true,
  seLevel: 80, voiceLevel: 80, songLevel: 80, inputAdjust: 0, endingAnime: true,
  // 太鼓
  playerCount: 1, autoPlay: false, autoPlay2P: false, autoRoll: true, scrollSpeed: 9,
  random: 0, stealth: 0, noInfo: false, just: false, tight: false, minCombo: 10,
  defaultCourse: 3, scoreMode: 2, branchGuide: false, branchAnime: 0, bigNotesJudge: true, judgeCountDisp: false,
  // 表示
  showChara: true, showDancer: true, showMob: true, showRunner: true, showFooter: true, showPuchi: true, debugInfo: false,
  // キー
  keys: {
    LeftRed: ['KeyF'], RightRed: ['KeyJ'], LeftBlue: ['KeyD'], RightBlue: ['KeyK'],
    LeftRed2P: ['KeyV'], RightRed2P: ['KeyN'], LeftBlue2P: ['KeyC'], RightBlue2P: ['KeyM'],
    Capture: ['F12'],
  },
  activeUsers: [0, 1],
};
export const Settings = { ...structuredClone(DEFAULTS) };
let timer = 0;
export function loadSettings() {
  try {
    const o = JSON.parse(localStorage.getItem(SKEY) || '{}');
    for (const k of Object.keys(DEFAULTS)) if (k in o) Settings[k] = k === 'keys' ? { ...DEFAULTS.keys, ...o.keys } : o[k];
  } catch (e) { console.warn('settings load failed', e); }
}
export function saveSettings() {
  clearTimeout(timer);
  timer = setTimeout(() => { try { localStorage.setItem(SKEY, JSON.stringify(Settings)); } catch (e) {} }, 150);
}
export function resetSettings() { for (const k of Object.keys(DEFAULTS)) Settings[k] = structuredClone(DEFAULTS[k]); saveSettings(); }

// ---- ユーザー ----
const newUser = (name, extra = {}) => ({
  id: 'u' + Math.random().toString(36).slice(2, 9), name, title: '', titleType: 0, dan: '', danType: 0, danGold: false,
  stats: { plays: 0, clears: 0, fullCombos: 0, allPerfects: 0, bestScore: 0, totalScore: 0, maxCombo: 0, lastPlayed: 0 },
  ...extra,
});
export const Users = {
  list: [],
  load() {
    try { this.list = JSON.parse(localStorage.getItem(UKEY) || '[]'); } catch (e) { this.list = []; }
    if (this.list.length < 2) {
      if (this.list.length < 1) this.list.push(newUser('どんちゃん'));
      this.list.push(newUser('かっちゃん'));
      this.save();
    }
    for (const u of this.list) u.stats = { ...newUser('').stats, ...(u.stats || {}) };
    Settings.activeUsers = Settings.activeUsers.map((i) => Math.min(i, this.list.length - 1));
    if (Settings.activeUsers[0] === Settings.activeUsers[1]) Settings.activeUsers[1] = (Settings.activeUsers[0] + 1) % this.list.length;
  },
  save() { try { localStorage.setItem(UKEY, JSON.stringify(this.list)); } catch (e) {} },
  /** プレイヤー番号(0/1)に対応するユーザー */
  player(i) { return this.list[Settings.activeUsers[i]] || this.list[0]; },
  add(name) { const u = newUser(name || 'ゲスト'); this.list.push(u); this.save(); return this.list.length - 1; },
  remove(idx) {
    if (this.list.length <= 2) return false;
    this.list.splice(idx, 1);
    Settings.activeUsers = Settings.activeUsers.map((i) => (i === idx ? 0 : i > idx ? i - 1 : i));
    if (Settings.activeUsers[0] === Settings.activeUsers[1]) Settings.activeUsers[1] = (Settings.activeUsers[0] + 1) % this.list.length;
    this.save(); saveSettings(); return true;
  },
  /** リザルトを成績に反映（クリア種別: 0失敗 1クリア 2フルコン 3全良） */
  record(playerIdx, r) {
    const u = this.player(playerIdx), s = u.stats;
    s.plays++; s.totalScore += r.score || 0; s.lastPlayed = Date.now();
    if ((r.score || 0) > s.bestScore) s.bestScore = r.score;
    if ((r.maxCombo || 0) > s.maxCombo) s.maxCombo = r.maxCombo;
    if (r.clear >= 1) s.clears++; if (r.clear >= 2) s.fullCombos++; if (r.clear >= 3) s.allPerfects++;
    this.save();
  },
};
