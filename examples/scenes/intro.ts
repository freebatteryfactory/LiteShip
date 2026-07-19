/**
 * Reference music-video scene — proves the factory + scene stack
 * end-to-end. Declares a sceneComposition capsule with a video
 * quantizer, audio bed, crossfade transitions, and a beat-pulsed
 * effect. Compiles via capsule:compile, can render via a (future)
 * liteship scene render command.
 *
 * @module
 */

import { defineCapsule, S } from '@liteship/core';
import { Track, Beat, fade, syncTo, compileScene, resolveBeatProjectionToSceneBeats } from '@liteship/scene';
import type { SceneContract, SceneBeat } from '@liteship/scene';
import type { BeatMarkerSet } from '@liteship/assets';
// The scene's immutable asset registry — assembled in ./assets.ts from the
// declared capsules. `ref('intro-bed')` validates the id against it (no
// module-global lookup, no import-order dependence).
import { assetRegistry } from './assets.js';

const SceneInputSchema = S.unknown;
const SceneOutputSchema = S.unknown;

// Phantom-kinded ids — declared once, referenced by syncTo / target / between
// so cross-kind references fail at compile time.
const heroId = Track.videoId('hero');
const outroId = Track.videoId('outro');
const bedId = Track.audioId('bed');

// Beat markers, sourced through the official projection→scene bridge.
// In production these come from running BeatMarkerProjection('intro-bed')
// over decoded audio; here we synthesize the equivalent sample-space
// projection (a steady 128bpm pulse) and feed it through the canonical
// resolver, so the real wiring path is exercised end-to-end without a
// real audio decode in CI. `samplesPerBeat` is integral at 48 kHz, so the
// resolver's `index / sampleRate * 1000` reproduces exact 60_000/bpm spacing.
const _sampleRate = 48_000;
const _samplesPerBeat = (_sampleRate * 60) / 128;
const _beatCount = Math.floor(4000 / (60_000 / 128));
const introBeatProjection: BeatMarkerSet = {
  bpm: 128,
  beats: Array.from({ length: _beatCount }, (_, i) => i * _samplesPerBeat),
};
const introBeats: readonly SceneBeat[] = resolveBeatProjectionToSceneBeats({
  projection: introBeatProjection,
  sampleRate: _sampleRate,
  anchorTrackId: 'bed',
});

/**
 * Intro scene contract — 4 second music-video intro at 60fps, BPM 128.
 *
 * Track ranges are authored in musical time per Spec 1 §5.1 —
 * `from: Beat(0), to: Beat(8)` — and `compileScene` resolves each
 * `Beat(n)` to a frame index via the scene's BPM + fps (one beat at
 * 128 bpm / 60 fps = 28.125 frames, so Beat(8) = frame 225). The hero
 * video fades in over one beat, the audio bed fades out over the last
 * two, and the hero→outro crossfade eases with the cubic curve.
 */
const contract: SceneContract = {
  name: 'intro',
  duration: 4000,
  fps: 60,
  bpm: 128,
  tracks: [
    Track.video('hero', {
      from: Beat(0),
      to: Beat(4),
      source: { _t: 'quantizer', id: 'hero-boundary' },
      envelope: fade.in(Beat(1)),
    }),
    Track.video('outro', { from: Beat(4), to: Beat(8), source: { _t: 'quantizer', id: 'outro-boundary' } }),
    Track.audio('bed', {
      from: Beat(0),
      to: Beat(8),
      source: assetRegistry.ref('intro-bed'),
      mix: { volume: -6 },
      envelope: fade.out(Beat(2)),
    }),
    Track.transition('fade-in', { from: Beat(0), to: Beat(1), kind: 'crossfade', between: [heroId, heroId] }),
    Track.transition('hero-outro', {
      from: Beat(3.5),
      to: Beat(4.5),
      kind: 'crossfade',
      between: [heroId, outroId],
      ease: 'cubic',
    }),
    Track.effect('beat-pulse', {
      from: Beat(0),
      to: Beat(8),
      kind: 'pulse',
      target: heroId,
      syncTo: syncTo.beat(bedId),
    }),
  ],
  invariants: [
    {
      name: 'tracks-within-duration',
      check: (s) => s.tracks.every((t) => t.to <= Math.ceil((s.duration / 1000) * s.fps)),
      message: 'no track may extend past scene duration',
    },
  ],
  budgets: { p95FrameMs: 16, memoryMb: 200 },
  site: ['node', 'browser'],
  beats: introBeats,
};

/** The declared scene capsule. Registered in the factory catalog at import time. */
export const intro = defineCapsule({
  _kind: 'sceneComposition',
  name: 'examples.intro',
  input: SceneInputSchema,
  output: SceneOutputSchema,
  capabilities: { reads: ['asset:intro-bed', 'asset:intro-bed:beats'], writes: [] },
  invariants: [],
  budgets: { p95Ms: contract.budgets.p95FrameMs },
  site: contract.site,
});

/** The scene contract, exported for compile/test access. */
export const introContract = contract;

/** Compile the scene to a pure {@link CompiledScene} descriptor. */
export const compileIntro = () => compileScene(contract);
