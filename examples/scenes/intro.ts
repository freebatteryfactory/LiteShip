/**
 * Reference music-video scene — proves the factory + scene stack
 * end-to-end. Declares a sceneComposition capsule with a video
 * quantizer, audio bed, crossfade transitions, and a beat-pulsed
 * effect. Compiles via capsule:compile, can render via a (future)
 * czap scene render command.
 *
 * @module
 */

import { Schema } from 'effect';
import { defineCapsule } from '@czap/core';
import { Track, syncTo, compileScene, resolveBeatProjectionToSceneBeats } from '@czap/scene';
import type { SceneContract, SceneBeat } from '@czap/scene';
import { AssetRef } from '@czap/assets';
import type { BeatMarkerSet } from '@czap/assets';
// Side-effect import registers introBed + introBedBeats in the asset registry.
import './assets.js';

const SceneInputSchema = Schema.Unknown;
const SceneOutputSchema = Schema.Unknown;

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

/** Intro scene contract — 4 second music-video intro at 60fps, BPM 128. */
const contract: SceneContract = {
  name: 'intro',
  duration: 4000,
  fps: 60,
  bpm: 128,
  tracks: [
    Track.video('hero', { from: 0, to: 120, source: { _t: 'quantizer', id: 'hero-boundary' } }),
    Track.video('outro', { from: 120, to: 240, source: { _t: 'quantizer', id: 'outro-boundary' } }),
    Track.audio('bed', { from: 0, to: 240, source: AssetRef('intro-bed'), mix: { volume: -6 } }),
    Track.transition('fade-in', { from: 0, to: 30, kind: 'crossfade', between: [heroId, heroId] }),
    Track.transition('hero-outro', { from: 110, to: 130, kind: 'crossfade', between: [heroId, outroId] }),
    Track.effect('beat-pulse', {
      from: 0, to: 240, kind: 'pulse', target: heroId, syncTo: syncTo.beat(bedId),
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
