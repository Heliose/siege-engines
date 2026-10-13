// Synthesised sound: no samples, every sound is built from noise and oscillators.
// Starts silent until the first user gesture (browsers require it), then plays.
let ctx = null;
let master = null;
let noise = null;
let enabled = true;
let last = {};

function boot() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.55;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 4;
  master.connect(comp);
  comp.connect(ctx.destination);
  const length = ctx.sampleRate * 2;
  noise = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return ctx;
}

export function wake() {
  const c = boot();
  if (c && c.state === "suspended") c.resume();
}
export function setEnabled(on) {
  enabled = on;
  if (master) master.gain.value = on ? 0.55 : 0;
}
export const isEnabled = () => enabled;

function env(gain, t, attack, hold, release, peak = 1) {
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + attack);
  gain.gain.setValueAtTime(peak, t + attack + hold);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
}
function noiseBurst(t, { type = "bandpass", freq = 1000, q = 1, attack = 0.002, hold = 0, release = 0.2, peak = 0.6, sweep = null, rate = 1 }) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = rate;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + attack + hold + release);
  f.Q.value = q;
  const g = ctx.createGain();
  env(g, t, attack, hold, release, peak);
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start(t, Math.random() * 1.5);
  src.stop(t + attack + hold + release + 0.05);
}
function tone(t, { type = "sine", freq = 80, to = null, attack = 0.003, hold = 0, release = 0.3, peak = 0.7 }) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + attack + hold + release);
  const g = ctx.createGain();
  env(g, t, attack, hold, release, peak);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + attack + hold + release + 0.05);
}

const SOUNDS = {
  tick: (t) => noiseBurst(t, { type: "highpass", freq: 3500, release: 0.03, peak: 0.25 }),
  click: (t, o) => {
    noiseBurst(t, { type: "bandpass", freq: 2400 * (o.pitch || 1), q: 6, release: 0.045, peak: 0.5 });
    tone(t, { type: "triangle", freq: 900 * (o.pitch || 1), release: 0.03, peak: 0.12 });
  },
  creak: (t, o) => noiseBurst(t, { type: "bandpass", freq: 320 * (o.pitch || 1), q: 12, attack: 0.04, hold: 0.08, release: 0.15, peak: 0.25, sweep: 260 * (o.pitch || 1) }),
  thud: (t, o) => {
    tone(t, { freq: 70 * (o.pitch || 1), to: 38, release: 0.35 * (o.size || 1), peak: 0.9 * (o.gain || 1) });
    noiseBurst(t, { type: "lowpass", freq: 900, release: 0.18, peak: 0.45 * (o.gain || 1) });
  },
  twang: (t, o) => {
    tone(t, { type: "sawtooth", freq: 140 * (o.pitch || 1), to: 120 * (o.pitch || 1), release: 0.45, peak: 0.22 });
    tone(t, { type: "triangle", freq: 280 * (o.pitch || 1), release: 0.25, peak: 0.12 });
    noiseBurst(t, { type: "highpass", freq: 2000, release: 0.06, peak: 0.35 });
  },
  whoosh: (t, o) => noiseBurst(t, { type: "bandpass", freq: 300, q: 1.5, attack: 0.12 * (o.size || 1), hold: 0.05, release: 0.45 * (o.size || 1), peak: 0.5 * (o.gain || 1), sweep: 1800 }),
  boom: (t, o) => {
    tone(t, { freq: 55, to: 28, release: 0.9 * (o.size || 1), peak: 1 * (o.gain || 1) });
    noiseBurst(t, { type: "lowpass", freq: 1400, sweep: 200, release: 0.8 * (o.size || 1), peak: 0.8 * (o.gain || 1) });
    noiseBurst(t + 0.02, { type: "bandpass", freq: 2600, q: 0.8, release: 0.35, peak: 0.3 * (o.gain || 1) });
  },
  thunk: (t, o) => {
    tone(t, { type: "triangle", freq: 210 * (o.pitch || 1), to: 120, release: 0.12, peak: 0.6 });
    noiseBurst(t, { type: "bandpass", freq: 1600, q: 2, release: 0.1, peak: 0.4 });
  },
  crack: (t, o) => {
    noiseBurst(t, { type: "highpass", freq: 1800, release: 0.12, peak: 0.9 * (o.gain || 1) });
    tone(t, { freq: 90, to: 40, release: 0.4, peak: 0.6 * (o.gain || 1) });
  },
  splash: (t, o) => {
    noiseBurst(t, { type: "bandpass", freq: 900, q: 0.7, attack: 0.01, hold: 0.05, release: 1.1 * (o.size || 1), peak: 0.7 * (o.gain || 1), sweep: 400 });
    noiseBurst(t + 0.05, { type: "highpass", freq: 3000, release: 0.6, peak: 0.25 });
  },
  whump: (t, o) => {
    noiseBurst(t, { type: "lowpass", freq: 600, attack: 0.03, hold: 0.05, release: 0.7, peak: 0.8 * (o.gain || 1), sweep: 2400 });
    tone(t, { freq: 48, release: 0.5, peak: 0.5 });
  },
  hiss: (t, o) => noiseBurst(t, { type: "highpass", freq: 2500, attack: 0.02, hold: 0.2 * (o.size || 1), release: 0.9 * (o.size || 1), peak: 0.45 * (o.gain || 1) }),
  bang: (t, o) => {
    noiseBurst(t, { type: "lowpass", freq: 3200, release: 0.5, peak: 1 });
    tone(t, { freq: 62, to: 30, release: 0.8, peak: 1 });
    noiseBurst(t + 0.03, { type: "highpass", freq: 2200, attack: 0.03, hold: 0.25, release: 1.2, peak: 0.4 });
  },
  clank: (t, o) => {
    tone(t, { type: "square", freq: 520 * (o.pitch || 1), release: 0.08, peak: 0.12 });
    tone(t, { type: "triangle", freq: 1240 * (o.pitch || 1), release: 0.18, peak: 0.12 });
    noiseBurst(t, { type: "bandpass", freq: 3000, q: 4, release: 0.05, peak: 0.25 });
  },
  pump: (t, o) => noiseBurst(t, { type: "bandpass", freq: 500, q: 3, attack: 0.05, hold: 0.06, release: 0.12, peak: 0.3, sweep: 900 }),
  crackle: (t) => {
    for (let i = 0; i < 6; i++) noiseBurst(t + Math.random() * 0.4, { type: "highpass", freq: 2500 + Math.random() * 3000, release: 0.015, peak: 0.25 * Math.random() + 0.05 });
  },
};

// play(name, { at, pitch, gain, size, gap }): `gap` throttles repeats of the same sound.
export function play(name, o = {}) {
  if (!enabled || !ctx || ctx.state !== "running") return;
  const fn = SOUNDS[name];
  if (!fn) return;
  const now = ctx.currentTime;
  const gap = o.gap ?? 0.03;
  if (last[name] && now - last[name] < gap) return;
  last[name] = now;
  try {
    fn(now + (o.at || 0), o);
  } catch (e) {}
}
