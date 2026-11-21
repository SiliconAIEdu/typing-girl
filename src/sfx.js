// Small synthesized sound effects for typing feedback. No audio files are loaded.
// Every sound is short and quiet so it never covers Luna's narration.
let ctx = null;
function audio() {
  if (!ctx) {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone(freq, { at = 0, length = 0.08, type = 'sine', volume = 0.06, slide = 0 } = {}) {
  const c = audio();
  if (!c) return;
  const start = c.currentTime + at;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slide) osc.frequency.exponentialRampToValueAtTime(freq * slide, start + length);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + length + 0.02);
}
const sounds = {
  key: () => tone(880, { length: 0.04, type: 'triangle', volume: 0.025 }),
  wrong: () => tone(220, { length: 0.14, type: 'sine', volume: 0.05, slide: 0.8 }),
  task: () => {
    tone(784, { length: 0.1, volume: 0.045 });
    tone(1047, { at: 0.08, length: 0.14, volume: 0.045 });
  },
  combo: () => [1047, 1319, 1568].forEach((f, i) => tone(f, { at: i * 0.06, length: 0.1, volume: 0.04 })),
  finish: () =>
    [523, 659, 784, 1047].forEach((f, i) => tone(f, { at: i * 0.09, length: 0.22, volume: 0.05 })),
};
export function createSfx(enabled) {
  return name => {
    if (!enabled()) return;
    try {
      sounds[name]?.();
    } catch {
      /* Audio is optional. */
    }
  };
}
