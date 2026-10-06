/** Tiny synthesized sound effects — no audio assets needed. */
let ctx: AudioContext | null = null;
let muted = false;

try {
  muted = localStorage.getItem("kt-muted") === "1";
} catch {
  /* storage unavailable */
}

export function isMuted() {
  return muted;
}

export function setMuted(value: boolean) {
  muted = value;
  try {
    localStorage.setItem("kt-muted", value ? "1" : "0");
  } catch {
    /* storage unavailable */
  }
}

function audio(): AudioContext | null {
  if (muted) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.05, slideTo?: number) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  click: () => tone(880, 0, 0.06, "triangle", 0.025),
  hover: () => tone(1320, 0, 0.03, "sine", 0.01),
  open: () => tone(420, 0, 0.18, "sine", 0.04, 840),
  close: () => tone(700, 0, 0.14, "sine", 0.03, 350),
  scan: () => {
    for (let i = 0; i < 4; i++) tone(300 + i * 120, i * 0.09, 0.12, "sawtooth", 0.012);
  },
  grow: () => {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.07, 0.25, "triangle", 0.035));
  },
  xp: () => {
    tone(988, 0, 0.08, "square", 0.018);
    tone(1319, 0.07, 0.16, "square", 0.018);
  },
  levelUp: () => {
    [392, 523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.09, 0.4, "triangle", 0.045));
  },
  achievement: () => {
    [659, 880, 1174, 1568].forEach((f, i) => tone(f, i * 0.11, 0.5, "sine", 0.045));
  },
  error: () => tone(220, 0, 0.3, "sawtooth", 0.03, 110),
  success: () => {
    tone(784, 0, 0.12, "triangle", 0.04);
    tone(1175, 0.1, 0.25, "triangle", 0.04);
  },
};
