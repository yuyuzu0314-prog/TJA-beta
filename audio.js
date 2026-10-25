// WebAudio。SE/ボイス/曲の3系統の音量と、イントロ→ループの継ぎ目なし再生を持つ。
export class AudioManager {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
    this.groups = {};
    for (const g of ['se', 'voice', 'song']) { const n = this.ctx.createGain(); n.connect(this.master); this.groups[g] = n; }
    this.buffers = new Map(); this.playing = new Map(); this.meta = new Map();
  }
  async resume() { if (this.ctx.state !== 'running') { try { await this.ctx.resume(); } catch (e) {} } }
  setLevels({ se = 80, voice = 80, song = 80 }) {
    this.groups.se.gain.value = se / 100; this.groups.voice.gain.value = voice / 100; this.groups.song.gain.value = song / 100;
  }
  async load(id, url, group = 'se', loop = false) {
    try {
      const buf = await (await fetch(url)).arrayBuffer();
      const ab = await this.ctx.decodeAudioData(buf);
      this.buffers.set(id, ab); this.meta.set(id, { group, loop });
    } catch (e) { console.warn('audio load failed', id, e); }
  }
  duration(id) { const b = this.buffers.get(id); return b ? b.duration : 0; }
  play(id, o = {}) {
    const buf = this.buffers.get(id); if (!buf) return null;
    const m = this.meta.get(id) || {};
    const group = o.group || m.group || 'se', loop = o.loop ?? m.loop ?? false;
    if (o.exclusive) this.stopGroup(group);
    const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = loop;
    const g = this.ctx.createGain(); g.gain.value = o.gain ?? 1;
    src.connect(g); g.connect(this.groups[group]);
    const when = o.when ?? this.ctx.currentTime;
    src.start(when, o.offset || 0);
    const h = { id, src, g, group, when, ended: false };
    src.onended = () => { h.ended = true; if (this.playing.get(id) === h) this.playing.delete(id); };
    const prev = this.playing.get(id); if (prev && !loop) { /* 同じ音の重ね再生は許可 */ }
    this.playing.set(id, h); return h;
  }
  stop(id) {
    const h = this.playing.get(id); if (!h) return;
    try { h.src.stop(); } catch (e) {} this.playing.delete(id);
  }
  stopGroup(group) { for (const [id, h] of [...this.playing]) if (h.group === group) this.stop(id); }
  stopAll() { for (const id of [...this.playing.keys()]) this.stop(id); }
  isPlaying(id) {
    const h = this.playing.get(id); if (!h || h.ended) return false;
    const m = this.meta.get(id);
    if (m && m.loop) return true;
    return this.ctx.currentTime < h.when + (this.buffers.get(id)?.duration || 0);
  }
  /** イントロを鳴らし、終わった瞬間にループ曲へサンプル精度で繋ぐ */
  playIntroLoop(introId, loopId, group = 'song') {
    const intro = this.buffers.get(introId), now = this.ctx.currentTime;
    if (!intro) { return this.play(loopId, { loop: true, group }); }
    this.play(introId, { group, when: now });
    return this.play(loopId, { loop: true, group, when: now + intro.duration });
  }
}
