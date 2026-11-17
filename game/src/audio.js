// Synthesized sound: no audio files, everything is WebAudio. Created lazily on the
// first user gesture (the start button), so the game stays silent until played.
export class Sound {
  constructor() {
    this.ctx = null; this.master = null; this.engineOsc = null; this.engineGain = null;
    this.sirenTimer = 0; this.musicTimer = 0; this.musicStep = 0; this.enabled = true;
  }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      // Engine hum: a low sawtooth whose pitch follows speed.
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = 320;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(filt); filt.connect(this.engineGain); this.engineGain.connect(this.master);
      this.engineOsc.start();
    } catch (e) { this.ctx = null; }
  }
  setEngine(speed01, driving) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(50 + speed01 * 130, t, 0.08);
    this.engineGain.gain.setTargetAtTime(driving ? 0.05 + speed01 * 0.05 : 0.0, t, 0.1);
  }
  blip(freq, dur, type = 'sine', vol = 0.2) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur);
  }
  noise(dur, vol = 0.3, freq = 1200) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t);
  }
  gunshot() { this.noise(0.12, 0.5, 900); this.blip(160, 0.08, 'square', 0.15); }
  crash() { this.noise(0.25, 0.4, 500); }
  pickup() { this.blip(660, 0.09); setTimeout(() => this.blip(990, 0.12), 70); }
  missionDone() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.16, 'triangle', 0.22), i * 110)); }
  fail() { [392, 330, 262].forEach((f, i) => setTimeout(() => this.blip(f, 0.2, 'triangle', 0.2), i * 140)); }
  // Two-tone police siren while any police car is near; call every frame.
  siren(dt, active) {
    if (!this.ctx) return;
    this.sirenTimer -= dt;
    if (active && this.sirenTimer <= 0) {
      this.sirenTimer = 0.42;
      this.blip(this._sirenHigh ? 700 : 950, 0.38, 'sine', 0.06);
      this._sirenHigh = !this._sirenHigh;
    }
  }
  // A lazy sunset bassline + hats, scheduled a step at a time from the game loop.
  music(dt) {
    if (!this.ctx) return;
    this.musicTimer -= dt;
    if (this.musicTimer > 0) return;
    this.musicTimer = 0.21;
    const bass = [55, 0, 55, 0, 65.4, 0, 49, 0, 55, 0, 55, 0, 73.4, 0, 82.4, 0];
    const n = bass[this.musicStep % bass.length];
    if (n) this.blip(n, 0.19, 'triangle', 0.09);
    if (this.musicStep % 4 === 2) this.noise(0.03, 0.05, 6000);
    this.musicStep++;
  }
}
