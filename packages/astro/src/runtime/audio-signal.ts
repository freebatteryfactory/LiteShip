/**
 * LIVE audio signal producer for the `audio.*` boundary family.
 *
 * Publishes a normalized amplitude (0..1 RMS loudness) and a beat pulse (0/1
 * spectral-flux onset) that {@link readSignalValue}/{@link attachSignalObserver}
 * in `boundary.ts` read on rAF, so an `audio.amplitude` / `audio.beat` boundary
 * carves named states through the existing source-agnostic carve-path.
 *
 * WHY a main-thread `AnalyserNode` (not the AudioWorklet in
 * `@liteship/web` `processor-bootstrap.ts`): the AnalyserNode path needs no SAB and
 * no COOP/COEP cross-origin-isolation headers, so it is fully unblocked in any
 * Astro deploy. The worklet remains the alternative when SAB headers are
 * guaranteed.
 *
 * MIRROR NOTICE: {@link analyseFrame}'s RMS + spectral-flux DETECTION FUNCTION
 * is shared with the OFFLINE reference `detectOnsets` from `@liteship/assets`
 * (`assets/src/analysis/onsets.ts`): RMS = `sqrt(mean(x^2))` over the frame and
 * `flux = max(0, rms - prevRms)` are identical. The THRESHOLD differs by
 * necessity — the offline reference normalizes flux against the GLOBAL peak over
 * the whole buffer (acausal, two-pass); a LIVE detector has no lookahead, so it
 * thresholds against a CAUSAL adaptive baseline: a beat is flux that exceeds
 * `FLUX_BEAT_MULT` times the EMA of recent flux, above an absolute floor
 * (Bello-style adaptive onset thresholding), which is what keeps a steady energy
 * ramp from firing every frame. The drift guard `tests/unit/astro/audio-signal-drift.test.ts` pins the
 * shared detection function to the reference AND the live detector's behavioral
 * contract (isolated onset → one beat; steady ramp → quiet) — LAW: never open a
 * new mirror without its guard. The reference is the ALGORITHM source only — it
 * runs offline in node at build time and is never the runtime source.
 *
 * @module
 */

/** A beat must exceed this multiple of the causal flux baseline (EMA of recent flux). */
export const FLUX_BEAT_MULT = 1.5;
/** Absolute flux floor so silence / quiet noise never fires a beat. */
export const FLUX_BEAT_FLOOR = 0.01;
/** EMA smoothing for the flux baseline — higher keeps a longer memory of recent flux. */
export const FLUX_BASELINE_ALPHA = 0.9;
/** Refractory gap between beats, seconds — mirrors onsets.ts `sampleRate * 0.05`. */
export const BEAT_REFRACTORY_SEC = 0.05;

/** Latest published amplitude (0..1 RMS) and beat pulse (0 or 1). */
interface AudioSignalState {
  amplitude: number;
  beat: number;
}

const state: AudioSignalState = { amplitude: 0, beat: 0 };

/**
 * Pure DSP core shared by the live producer and its drift guard: compute the
 * RMS of a time-domain frame and decide whether this frame is a beat onset.
 *
 * `prevRms` / `fluxBaseline` thread the running envelope + the causal flux
 * baseline (EMA of recent flux) across calls — the live, no-lookahead analog of
 * onsets.ts's full-buffer global-max normalization. Returns the next carry-state
 * so the caller stays pure.
 */
export function analyseFrame(
  frame: Float32Array,
  prevRms: number,
  fluxBaseline: number,
): { rms: number; flux: number; beat: boolean; nextFluxBaseline: number } {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) {
    const v = frame[i] ?? 0;
    sum += v * v;
  }
  const rms = frame.length > 0 ? Math.sqrt(sum / frame.length) : 0;
  const flux = Math.max(0, rms - prevRms);
  // Causal adaptive threshold: a beat is flux exceeding a multiple of the recent
  // baseline, above an absolute floor. Test against the PAST baseline, THEN fold
  // this frame in — so a sharp onset fires before the baseline absorbs it, and a
  // steady energy ramp (rising baseline) does not fire every frame.
  const threshold = Math.max(FLUX_BEAT_FLOOR, fluxBaseline * FLUX_BEAT_MULT);
  const beat = flux > threshold;
  const nextFluxBaseline = FLUX_BASELINE_ALPHA * fluxBaseline + (1 - FLUX_BASELINE_ALPHA) * flux;
  return { rms, flux, beat, nextFluxBaseline };
}

/**
 * Read the latest published value for an audio mode. `amplitude` → RMS 0..1;
 * `beat` → 0/1 pulse. `sample`/`normalized` are offline modes with no live
 * producer, so they read `0` (frozen) — author those via `Signal.audio`.
 */
export function readAudioSignal(mode: 'sample' | 'normalized' | 'amplitude' | 'beat'): number {
  if (mode === 'amplitude') return state.amplitude;
  if (mode === 'beat') return state.beat;
  return 0;
}

const callbacks = new Set<() => void>();
let rafId: number | null = null;

/**
 * Attach an rAF observer that re-runs `callback` each frame while any audio
 * boundary is live (the producer publishes new values per frame). Returns a
 * cleanup that drops the callback and stops the loop once the last observer
 * detaches. Matches the frozen-`null` contract of the other observers when
 * `requestAnimationFrame` is unavailable (SSR).
 *
 * The live-set IS the observer count — there is no separate counter beside it
 * to drift (a duplicate `add` is a Set no-op, so it can't inflate a tally and
 * keep the loop alive after detach). A throw in one callback must not stall the
 * loop for the others, so the next frame is always scheduled in `finally`.
 */
export function attachAudioObserver(callback: () => void): (() => void) | null {
  if (typeof requestAnimationFrame === 'undefined') return null;

  callbacks.add(callback);

  if (rafId === null) {
    const tick = (): void => {
      try {
        for (const cb of callbacks) cb();
      } finally {
        rafId = callbacks.size > 0 ? requestAnimationFrame(tick) : null;
      }
    };
    rafId = requestAnimationFrame(tick);
  }

  return () => {
    if (!callbacks.delete(callback)) return;
    if (callbacks.size === 0 && rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };
}

/**
 * Drive the published amplitude/beat from a live `AnalyserNode`, sampling its
 * time-domain buffer on rAF and folding each frame through {@link analyseFrame}.
 *
 * Call once after wiring the analyser into the audio graph (e.g.
 * `mediaSource.connect(analyser)`). Returns a stop function. This is the live
 * producer; the boundary readers above are its sink.
 *
 * @example
 * ```ts
 * const ctx = new AudioContext();
 * const src = ctx.createMediaElementSource(audioEl);
 * const analyser = ctx.createAnalyser();
 * analyser.fftSize = 2048;
 * src.connect(analyser);
 * analyser.connect(ctx.destination);
 * const stop = driveAudioFromAnalyser(analyser);
 * // ...later: stop();
 * ```
 */
export function driveAudioFromAnalyser(analyser: AnalyserNode): () => void {
  const buffer = new Float32Array(analyser.fftSize);
  // Refractory is enforced in WALL-CLOCK milliseconds off the rAF timestamp, not
  // a frame count. A frame count is wrong: rAF fires ~every 16ms regardless of
  // fftSize, and the analyser buffer is a SLIDING window re-read each frame (not
  // ~46ms of freshly-consumed audio), so `sampleRate * 0.05 / fftSize` rounds to
  // 1 frame at 2048/44.1kHz and a second transient could fire ~16ms after the
  // first — collapsing the 50ms gap BEAT_REFRACTORY_SEC promises.
  const refractoryMs = BEAT_REFRACTORY_SEC * 1000;
  let prevRms = 0;
  let fluxBaseline = 0;
  let lastBeatMs = Number.NEGATIVE_INFINITY;
  let id: number | null = null;

  const tick = (now: number): void => {
    analyser.getFloatTimeDomainData(buffer);
    const { rms, beat, nextFluxBaseline } = analyseFrame(buffer, prevRms, fluxBaseline);
    prevRms = rms;
    fluxBaseline = nextFluxBaseline;
    state.amplitude = Math.min(1, rms);
    if (beat && now - lastBeatMs >= refractoryMs) {
      state.beat = 1;
      lastBeatMs = now;
    } else {
      state.beat = 0;
    }
    id = requestAnimationFrame(tick);
  };

  id = requestAnimationFrame(tick);

  return () => {
    if (id !== null) cancelAnimationFrame(id);
    id = null;
    state.amplitude = 0;
    state.beat = 0;
  };
}

/** Test-only: reset published state + observers between cases. */
export function __resetAudioSignalForTest(): void {
  state.amplitude = 0;
  state.beat = 0;
  callbacks.clear();
  if (rafId !== null && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(rafId);
  rafId = null;
}

/** Test-only: publish amplitude/beat directly to exercise the boundary readers. */
export function __setAudioSignalForTest(next: Partial<AudioSignalState>): void {
  if (next.amplitude !== undefined) state.amplitude = next.amplitude;
  if (next.beat !== undefined) state.beat = next.beat;
}
