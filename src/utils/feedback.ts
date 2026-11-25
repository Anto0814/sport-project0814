let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function primeAudio(): void {
  getAudioContext();
}

export function playFeedbackBeep(type: 'tick' | 'restDone' | 'holdDone', enabled: boolean): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const playTone = (freq: number, start: number, duration: number, gainPeak = 0.14) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(gainPeak, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  };

  if (type === 'tick') {
    playTone(660, now, 0.08, 0.08);
  } else if (type === 'restDone') {
    playTone(587.33, now, 0.12, 0.16);
    playTone(880, now + 0.14, 0.22, 0.18);
  } else if (type === 'holdDone') {
    playTone(523.25, now, 0.1, 0.15);
    playTone(659.25, now + 0.11, 0.1, 0.15);
    playTone(783.99, now + 0.22, 0.25, 0.18);
  }
}

export function triggerVibration(pattern: number | number[], enabled: boolean): void {
  if (!enabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Ignore on unsupported devices
  }
}

export async function acquireWakeLock(): Promise<WakeLockSentinel | null> {
  if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return null;
  try {
    return await navigator.wakeLock.request('screen');
  } catch {
    return null;
  }
}
