/**
 * LIVE audio signal producer for the `audio.*` boundary family.
 *
 * Publishes a normalized amplitude (0..1 RMS loudness) and a beat pulse (0/1
 * spectral-flux onset) that {@link readSignalValue}/{@link attachSignalObserver}
 * in `boundary.ts` read on rAF, so an `audio.amplitude` / `audio.beat` boundary
 * carves named states through the existing source-agnostic carve-path.
 *
 * WHY a main-thread `AnalyserNode` (not the AudioWorklet in
 * `@czap/web` `processor-bootstrap.ts`): the AnalyserNode path needs no SAB and
 * no COOP/COEP cross-origin-isolation headers, so it is fully unblocked in any
 * Astro deploy. The worklet remains the alternative when SAB headers are
 * guaranteed.
 *
 * MIRROR NOTICE: {@link analyseFrame}'s RMS + spectral-flux beat pick is a NEW
 * runtime MIRROR of the OFFLINE reference `detectOnsets` from `@czap/assets`
 * (`assets/src/analysis/onsets.ts`): RMS = `sqrt(mean(x^2))` over the frame, and
 * a beat is `flux >= maxFlux * FLUX_BEAT_RATIO` where `flux = max(0, rms - prevRms)`,
 * with a refractory window. The drift guard
 * `tests/unit/astro/audio-signal-drift.test.ts` pins this math to the reference
 * (LAW: never open a new mirror without its guard). The reference is the
 * ALGORITHM source only — it runs offline in node at build time and is never
 * the runtime source.
 *
 * @module
 */

/** Beat threshold as a fraction of the running peak flux — mirrors onsets.ts `* 0.3`. */
export const FLUX_BEAT_RATIO = 0.3;
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
 * `prevRms` / `maxFlux` thread the running envelope + peak-flux across calls
 * (the streaming analog of onsets.ts's full-buffer arrays). Returns the next
 * carry-state so the caller stays pure.
 */
export function analyseFrame(
  frame: Float32Array,
  prevRms: number,
  maxFlux: number,
): { rms: number; flux: number; beat: boolean; nextMaxFlux: number } {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) {
    const v = frame[i] ?? 0;
    sum += v * v;
  }
  const rms = frame.length > 0 ? Math.sqrt(sum / frame.length) : 0;
  const flux = Math.max(0, rms - prevRms);
  const nextMaxFlux = Math.max(maxFlux, flux);
  // A beat is a positive flux peak above a fraction of the running peak.
  const beat = nextMaxFlux > 0 && flux >= nextMaxFlux * FLUX_BEAT_RATIO && flux > 0;
  return { rms, flux, beat, nextMaxFlux };
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

let observers = 0;
const callbacks = new Set<() => void>();
let rafId: number | null = null;

/**
 * Attach an rAF observer that re-runs `callback` each frame while any audio
 * boundary is live (the producer publishes new values per frame). Returns a
 * cleanup that drops the callback and stops the loop once the last observer
 * detaches. Matches the frozen-`null` contract of the other observers when
 * `requestAnimationFrame` is unavailable (SSR).
 */
export function attachAudioObserver(callback: () => void): (() => void) | null {
  if (typeof requestAnimationFrame === 'undefined') return null;

  callbacks.add(callback);
  observers += 1;

  if (rafId === null) {
    const tick = (): void => {
      for (const cb of callbacks) cb();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  return () => {
    if (!callbacks.delete(callback)) return;
    observers -= 1;
    if (observers <= 0 && rafId !== null) {
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
  const sampleRate = analyser.context.sampleRate;
  // Refractory in frames: each rAF reads ~one analyser buffer.
  const refractoryFrames = Math.max(1, Math.round((sampleRate * BEAT_REFRACTORY_SEC) / buffer.length));
  let prevRms = 0;
  let maxFlux = 0;
  let sinceBeat = refractoryFrames;
  let id: number | null = null;

  const tick = (): void => {
    analyser.getFloatTimeDomainData(buffer);
    const { rms, beat, nextMaxFlux } = analyseFrame(buffer, prevRms, maxFlux);
    prevRms = rms;
    maxFlux = nextMaxFlux;
    state.amplitude = Math.min(1, rms);
    sinceBeat += 1;
    if (beat && sinceBeat >= refractoryFrames) {
      state.beat = 1;
      sinceBeat = 0;
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
  observers = 0;
  if (rafId !== null && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(rafId);
  rafId = null;
}

/** Test-only: publish amplitude/beat directly to exercise the boundary readers. */
export function __setAudioSignalForTest(next: Partial<AudioSignalState>): void {
  if (next.amplitude !== undefined) state.amplitude = next.amplitude;
  if (next.beat !== undefined) state.beat = next.beat;
}
