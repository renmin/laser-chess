let audioCtx: AudioContext | null = null;
let bgmGain: GainNode | null = null;
let sfxEnabled = true;
let bgmEnabled = true;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    bgmGain = audioCtx.createGain();
    bgmGain.gain.value = 0.08;
    bgmGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  if (!sfxEnabled) return;
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function playNoise(duration: number, volume = 0.1, filterFreq = 1000) {
  if (!sfxEnabled) return;
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

export const SoundManager = {
  init() {
    getCtx();
  },

  laserFire() {
    const ctx = getCtx();
    if (!sfxEnabled) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  },

  laserReflect() {
    playTone(3000, 0.08, 'sine', 0.06);
    setTimeout(() => playTone(4000, 0.05, 'sine', 0.04), 20);
  },

  pieceMove() {
    playNoise(0.12, 0.06, 400);
  },

  pieceRotate() {
    playTone(800, 0.06, 'square', 0.05);
    setTimeout(() => playTone(1000, 0.04, 'square', 0.03), 30);
  },

  pieceDestroy() {
    playNoise(0.3, 0.15, 800);
    playTone(150, 0.3, 'sawtooth', 0.1);
    setTimeout(() => playNoise(0.2, 0.08, 400), 100);
  },

  kingDestroy() {
    playNoise(0.6, 0.2, 1200);
    playTone(80, 0.5, 'sawtooth', 0.15);
    setTimeout(() => {
      playTone(60, 0.4, 'sawtooth', 0.12);
      playNoise(0.4, 0.15, 600);
    }, 150);
    setTimeout(() => playTone(40, 0.6, 'sine', 0.1), 300);
  },

  turnChange() {
    playTone(600, 0.15, 'sine', 0.06);
    setTimeout(() => playTone(800, 0.12, 'sine', 0.05), 80);
  },

  startBGM() {
    if (!bgmEnabled) return;
    const ctx = getCtx();
    if (!bgmGain) return;

    const playDrone = () => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.value = 55;
      osc2.frequency.value = 82.5;

      const gain1 = ctx.createGain();
      gain1.gain.value = 0.5;
      osc1.connect(gain1);
      gain1.connect(bgmGain!);

      const gain2 = ctx.createGain();
      gain2.gain.value = 0.3;
      osc2.connect(gain2);
      gain2.connect(bgmGain!);

      osc1.start();
      osc2.start();

      return () => { osc1.stop(); osc2.stop(); };
    };

    playDrone();
  },

  setSFXEnabled(enabled: boolean) {
    sfxEnabled = enabled;
  },

  setBGMEnabled(enabled: boolean) {
    bgmEnabled = enabled;
    if (bgmGain) bgmGain.gain.value = enabled ? 0.08 : 0;
  },
};
