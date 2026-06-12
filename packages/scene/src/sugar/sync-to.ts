/**
 * syncTo — typed constructors for SyncAnchor components attached to
 * effect tracks. Three modes: beat (downbeats), onset (note attacks),
 * peak (loudness peaks). Each resolves at scene-compile time to a
 * derived BeatMarker/Onset/Waveform cachedProjection asset.
 *
 * The anchor parameter is narrowed to TrackId<'audio'> so cross-kind
 * references (e.g. syncTo.beat(videoTrackId)) fail at compile time.
 *
 * @module
 */

import type { EffectTrack } from '../contract.js';
import type { TrackRef } from '../track.js';
import { trackRefId } from '../track.js';

/** SyncAnchor shape extracted from EffectTrack. */
type SyncAnchor = NonNullable<EffectTrack['syncTo']>;

/** Typed SyncAnchor constructors for the three supported modes. Each accepts the audio track object or its id. */
export const syncTo = {
  /** Sync to downbeats (BeatMarkerProjection). */
  beat: (anchor: TrackRef<'audio'>): SyncAnchor => ({ anchor: trackRefId(anchor), mode: 'beat' }),
  /** Sync to note attacks (OnsetProjection). */
  onset: (anchor: TrackRef<'audio'>): SyncAnchor => ({ anchor: trackRefId(anchor), mode: 'onset' }),
  /** Sync to loudness peaks (WaveformProjection + peak-pick). */
  peak: (anchor: TrackRef<'audio'>): SyncAnchor => ({ anchor: trackRefId(anchor), mode: 'peak' }),
} as const;
