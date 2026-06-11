/**
 * Asset capsule — first concrete cachedProjection instance pattern.
 * Each asset declares source path + kind + decoder budget; the factory
 * emits decode benches + loader property tests from it. Scenes
 * reference assets by id via AssetRef().
 *
 * `defineAsset` resolves the asset's decode function — the declared
 * `decoder` override, or the built-in for the media kind — and threads
 * it onto the capsule as its `derive` handler, so the harness and the
 * host commands consume the asset's OWN decoder.
 *
 * @module
 */

import { Schema } from 'effect';
import { defineCapsule } from '@czap/core';
import type { AttributionDecl, Invariant, CapsuleDef, Site } from '@czap/core';
import { mkAssetRefId, type AssetRefId } from './brands.js';
import { audioDecoder, type DecodedAudio } from './decoders/audio.js';
import { videoDecoder, type DecodedVideo } from './decoders/video.js';
import { imageDecoder, type DecodedImage } from './decoders/image.js';

/** Supported asset kinds. */
export type AssetKind = 'audio' | 'video' | 'image' | 'beat-markers' | 'onsets' | 'waveform';

/**
 * Decoded output for each media {@link AssetKind}. Analysis kinds
 * (beat-markers / onsets / waveform) have no built-in decoder — their
 * projections come from the dedicated factories (BeatMarkerProjection,
 * OnsetProjection, WaveformProjection) — so they map to `unknown`.
 */
export type DecodedAsset<K extends AssetKind> = K extends 'audio'
  ? DecodedAudio
  : K extends 'video'
    ? DecodedVideo
    : K extends 'image'
      ? DecodedImage
      : unknown;

/** Asset declaration shape consumed by `defineAsset`. */
export interface AssetDecl<K extends AssetKind> {
  readonly id: string;
  readonly source: string;
  readonly kind: K;
  /**
   * Optional per-asset decode override. When omitted, media kinds fall
   * back to the built-in decoder for `kind` (audio → audioDecoder,
   * video → videoDecoder, image → imageDecoder). Must produce the
   * kind's decoded shape so downstream projections (beat/onset/waveform
   * over {@link DecodedAudio}) keep working.
   */
  readonly decoder?: (bytes: ArrayBuffer) => Promise<DecodedAsset<K>>;
  /**
   * Optional explicit site override. When omitted, the capsule's site is
   * derived from decoder presence: a custom `decoder` keeps the permissive
   * `['node', 'browser']` (the declarer owns its runtime safety), while a
   * builtin decoder uses {@link builtinDecoderSiteFor} (video → `['node']`,
   * because ffprobe needs node:child_process). Override when the derivation
   * is wrong for THIS asset — e.g. a custom video decoder that itself
   * shells out to node tooling should declare `['node']`, or an audio
   * asset that must never ship to browsers can narrow to `['node']`.
   * Claims the builtin decoder cannot honor (e.g. `'browser'` for builtin
   * video) are rejected at decl time; an empty array is always rejected.
   */
  readonly site?: readonly Site[];
  readonly budgets: { readonly decodeP95Ms: number; readonly memoryMb?: number };
  readonly invariants: readonly Invariant<unknown, unknown>[];
  readonly attribution?: AttributionDecl;
}

type AnyAssetCapsule = CapsuleDef<'cachedProjection', unknown, unknown, unknown>;

/** Decode function shape shared by AssetDecl.decoder and the built-ins. */
export type AssetDecoder = (bytes: ArrayBuffer) => Promise<unknown>;

const registry = new Map<string, AnyAssetCapsule>();

/**
 * Built-in decoder for a media kind. Analysis kinds (beat-markers /
 * onsets / waveform) have their own projection factories and no byte
 * decoder, so they resolve to undefined.
 */
export function builtinDecoderFor(kind: AssetKind): AssetDecoder | undefined {
  switch (kind) {
    case 'audio':
      return audioDecoder;
    case 'video':
      return videoDecoder;
    case 'image':
      return imageDecoder;
    default:
      return undefined;
  }
}

/**
 * Sites a media kind's BUILT-IN decoder can honestly run on. The video
 * built-in shells out to ffprobe (node:child_process / fs / os), so a
 * builtin-decoded video capsule is node-only — declaring 'browser' would
 * lie to bundlers and site routers. The audio built-in (pure RIFF walk)
 * and image built-in (header sniff) are byte-level and run anywhere.
 * Analysis kinds have no byte decoder, so they keep the permissive
 * default; their dedicated projection factories declare their own sites.
 */
export function builtinDecoderSiteFor(kind: AssetKind): readonly Site[] {
  return kind === 'video' ? ['node'] : ['node', 'browser'];
}

/**
 * Raw asset byte source. A Declaration-tagged schema (instanceOf), so the
 * harness honestly reports "not arbitrary-derivable" instead of feeding
 * `fc.anything()` garbage into real decoders that only accept ArrayBuffer.
 */
const AssetBytes = Schema.instanceOf(ArrayBuffer) as unknown as Schema.Schema<unknown>;

/**
 * Effective site for a declaration: the explicit `decl.site` override when
 * present, else derived from decoder presence. An override that relies on
 * a builtin decoder must stay within that decoder's honest site set — the
 * builtin's runtime needs don't change because a decl claims otherwise.
 */
function resolveDeclSite<K extends AssetKind>(decl: AssetDecl<K>): readonly Site[] {
  if (decl.site === undefined) {
    return decl.decoder !== undefined ? ['node', 'browser'] : builtinDecoderSiteFor(decl.kind);
  }
  if (decl.site.length === 0) {
    throw new Error(
      `defineAsset('${decl.id}') declares \`site: []\` — a capsule must run on at least one site. ` +
        `List the sites this asset decodes on (e.g. site: ['node']) or drop the override to keep the derived default.`,
    );
  }
  if (decl.decoder === undefined && builtinDecoderFor(decl.kind) !== undefined) {
    const honest = builtinDecoderSiteFor(decl.kind);
    const impossible = decl.site.filter((s) => !honest.includes(s));
    if (impossible.length > 0) {
      throw new Error(
        `defineAsset('${decl.id}') declares site [${decl.site.join(', ')}] but relies on the built-in ${decl.kind} decoder, ` +
          `which only runs on [${honest.join(', ')}] — advertising ${impossible.join('/')} would lie to bundlers and site routers. ` +
          `Provide a custom \`decoder\` that runs on ${impossible.join('/')}, or drop ${impossible.join('/')} from \`site\`.`,
      );
    }
  }
  return decl.site;
}

/**
 * Declare an asset as a cachedProjection capsule + register in the
 * module-level asset registry. Resolves `decl.decoder ?? builtinDecoderFor(decl.kind)`
 * and wires it as the capsule's `derive` handler (the harness decode
 * bench + determinism probes and the host commands run through it).
 *
 * The capsule's `site` follows the decoder that actually runs: builtin
 * decoders use {@link builtinDecoderSiteFor} (video → `['node']`, because
 * ffprobe needs node:child_process), while a declared custom `decoder`
 * keeps `['node', 'browser']` — the declarer owns its runtime safety
 * (e.g. a WebCodecs-based video decoder is legitimately browser-capable).
 * An explicit `decl.site` wins over both derivations after validation
 * (see {@link AssetDecl.site}).
 */
export function defineAsset<K extends AssetKind>(decl: AssetDecl<K>): AnyAssetCapsule {
  const decode: AssetDecoder | undefined = decl.decoder ?? builtinDecoderFor(decl.kind);
  const site: readonly Site[] = resolveDeclSite(decl);
  const cap = defineCapsule({
    _kind: 'cachedProjection',
    name: decl.id,
    input: decode !== undefined ? AssetBytes : Schema.Unknown,
    output: Schema.Unknown,
    capabilities: { reads: ['fs.read'], writes: [] },
    invariants: decl.invariants,
    budgets: { p95Ms: decl.budgets.decodeP95Ms, memoryMb: decl.budgets.memoryMb },
    site,
    attribution: decl.attribution,
    ...(decode !== undefined ? { derive: (source: unknown) => decode(source as ArrayBuffer) } : {}),
  });
  registry.set(decl.id, cap);
  return cap;
}

/** Resolve an asset id to a branded {@link AssetRefId} after confirming it's registered. Throws on unknown ids. */
export function AssetRef(id: string): AssetRefId {
  if (!registry.has(id)) {
    throw new Error(`AssetRef('${id}') not registered — did you call defineAsset?`);
  }
  return mkAssetRefId(id);
}

/** Read-only snapshot of the asset registry. */
export function getAssetRegistry(): ReadonlyMap<string, AnyAssetCapsule> {
  return registry;
}

/**
 * Resolve the decode function for an asset id: the registered capsule's
 * `derive` handler (which carries the asset's own decoder, custom or
 * built-in) when the asset was registered in this process, else the
 * audio built-in — host processes that never import the scene's asset
 * module (e.g. the CLI reading only the compiled manifest) keep today's
 * audio-decode behavior. The audio fallback matches the only consumers
 * (beat/onset/waveform are audio projections).
 */
export function resolveAssetDecoder(assetId: string): AssetDecoder {
  const derive = registry.get(assetId)?.derive;
  if (derive !== undefined) {
    return async (bytes: ArrayBuffer) => derive(bytes);
  }
  return audioDecoder;
}

/** Clear the registry. Intended for tests only. */
export function resetAssetRegistry(): void {
  registry.clear();
}
