/**
 * Realm-neutral audio, video, sample, frame, analysis, and synchronization meaning.
 *
 * Browser AudioContext/WebCodecs and server ffmpeg/filesystem behavior remain host
 * capabilities. Realtime and offline execution share the same semantic sample
 * coordinates and analysis products.
 *
 * @module
 */

import type { Algebra, Brand, Reference } from '../../types.js';
import type { CanonicalValue, ContentAddress, MediaType } from '../01_encoding/types.js';
import type { SchemaReference } from '../03_schema/types.js';
import type { FrameIndex, SampleIndex, TimeCut, Timecode } from '../04_time/types.js';

export type MediaAssetId<Name extends string = string> = Brand<Name, 'liteship.media-asset-id'>;
export type MediaAssetReference<Id extends MediaAssetId = MediaAssetId> = Reference<'media-asset', Id>;
export type SampleRate = Brand<number, 'liteship.sample-rate'>;
export type FrameRate = Brand<number, 'liteship.frame-rate'>;

export type MediaKind = 'audio' | 'video' | 'image' | 'font' | 'binary';

/** Addressed media source descriptor. */
export interface MediaAsset {
  readonly id: MediaAssetId;
  readonly kind: MediaKind;
  readonly mediaType: MediaType;
  readonly source: ContentAddress;
  readonly metadataSchema?: SchemaReference;
  readonly metadata?: CanonicalValue;
}

export interface SampleRange {
  readonly start: SampleIndex;
  readonly end: SampleIndex;
  readonly rate: SampleRate;
}

export interface FrameRange {
  readonly start: FrameIndex;
  readonly end: FrameIndex;
  readonly rate: FrameRate;
}

/** Standard media-analysis products. */
export type MediaAnalysis = Algebra<{
  waveform: { readonly samples: readonly number[]; readonly range: SampleRange };
  onset: { readonly samples: readonly SampleIndex[]; readonly strength?: readonly number[] };
  beat: { readonly samples: readonly SampleIndex[]; readonly tempo?: number };
  peak: { readonly samples: readonly SampleIndex[]; readonly value: readonly number[] };
  metadata: { readonly value: CanonicalValue; readonly schema: SchemaReference };
}>;

/** Exact A/V coordinate at one semantic cut. */
export interface MediaTimeCut extends TimeCut {
  readonly sample: SampleIndex;
  readonly frame?: FrameIndex;
  readonly sampleRate: SampleRate;
  readonly frameRate?: FrameRate;
}

/** Target-neutral media frame state. Physical pixels or samples are host projections. */
export interface MediaFrame<State = unknown> {
  readonly frame: FrameIndex;
  readonly samples: SampleRange;
  readonly time: MediaTimeCut;
  readonly state: State;
}

/** Semantic media event suitable for timelines and streams. */
export type MediaEvent = Algebra<{
  analysis: { readonly asset: MediaAssetReference; readonly value: MediaAnalysis; readonly at: Timecode };
  frame: { readonly asset: MediaAssetReference; readonly value: MediaFrame };
  ended: { readonly asset: MediaAssetReference; readonly at: Timecode };
}>;

/** Type summary consumed by the root core topology. */
export interface MediaTypeSurface {
  readonly asset: MediaAsset;
  readonly sampleRange: SampleRange;
  readonly frameRange: FrameRange;
  readonly analysis: MediaAnalysis;
  readonly time: MediaTimeCut;
  readonly frame: MediaFrame;
  readonly event: MediaEvent;
}
