/**
 * Asset capsule — first concrete cachedProjection instance pattern.
 * Each asset declares source path + kind + decoder budget; the factory
 * emits decode benches + loader property tests from it. Scenes
 * reference assets by id via an {@link AssetRegistry}'s `ref()`.
 *
 * `defineAsset` is PURE: it resolves the asset's decode function — the
 * declared `decoder` override, or the built-in for the media kind — and
 * threads it onto the capsule as its `derive` handler, then returns the
 * capsule with NO side effect. Registration is explicit and immutable:
 * assemble an {@link AssetRegistry} via {@link AssetRegistry.make} over the
 * capsules you defined, then thread it to the consumers (`ref`,
 * `resolveDecoder`, the projection factories) that need to validate or
 * resolve an id. There is no module-global registry and no import-order
 * dependence — asset resolution is a function of the registry you built,
 * not of which modules happened to load.
 *
 * @module
 */

import { NotFoundError, ValidationError } from '@liteship/error';
import { closestMatch, defineCapsule, S } from '@liteship/core';
import type { AttributionDecl, Invariant, CapsuleDef, Site } from '@liteship/core';
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
  readonly budgets?: { readonly decodeP95Ms?: number; readonly memoryMb?: number };
  readonly invariants?: readonly Invariant<unknown, unknown>[];
  readonly attribution?: AttributionDecl;
}

/** Any asset capsule, regardless of its decoded shape. The unit an {@link AssetRegistry} indexes. */
export type AssetCapsule = CapsuleDef<'cachedProjection', unknown, unknown, unknown>;

/** Decode function shape shared by AssetDecl.decoder and the built-ins. */
export type AssetDecoder = (bytes: ArrayBuffer) => Promise<unknown>;

/** Per-kind decode p95 budget defaults (ms). Explicit `decl.budgets.decodeP95Ms` overrides. */
export function defaultDecodeP95MsFor(kind: AssetKind): number {
  switch (kind) {
    case 'beat-markers':
    case 'onsets':
      return 200;
    case 'waveform':
      return 100;
    case 'video':
      return 100;
    case 'image':
      return 20;
    case 'audio':
    default:
      return 50;
  }
}

/**
 * Nearest registered id to `id` by edit distance, when one is close enough to
 * plausibly be a typo. The threshold scales with id length (≤2 edits, capped at
 * a third of the id) so 'intro-bd' → 'intro-bed' suggests but 'xyz' → 'beats'
 * stays silent. Delegates to @liteship/core's shared Levenshtein picker, passing the
 * assets-registry threshold policy through its `threshold` parameter.
 */
function suggestId(id: string, ids: readonly string[]): string | undefined {
  const threshold = Math.max(1, Math.min(2, Math.floor(id.length / 3)));
  return closestMatch(id, ids, threshold);
}

function registryMissError(subject: string, id: string, ids: readonly string[]): NotFoundError {
  const listed = ids.length > 0 ? ids.join(', ') : '(none)';
  const suggestion = suggestId(id, ids);
  const didYouMean = suggestion !== undefined ? `Did you mean '${suggestion}'? ` : '';
  return NotFoundError(
    'asset',
    id,
    `${subject}: registry-miss — '${id}' is not registered. ` +
      `Registered ids: ${listed}. ` +
      didYouMean +
      `Add the defineAsset('${id}', ...) capsule to AssetRegistry.make([...]) before referencing it.`,
  );
}

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
 * Raw asset byte source — a first-class kernel `bytes` DECLARATION over the
 * `ArrayBuffer` carrier. The `bytes` node is opaque to structural derivation, so
 * the harness honestly reports "not arbitrary-derivable" instead of feeding
 * `fc.anything()` garbage into real decoders that only accept ArrayBuffer; a
 * scene supplies the canonical fixture bytes instead. Decode accepts any
 * `ArrayBuffer` instance, and the capsule input slot takes it directly (a kernel
 * `Schema<ArrayBuffer>` is structurally the `SchemaPort<ArrayBuffer>` the slot
 * declares — no `asDeclaration` bridge and no double-cast through `unknown`).
 */
export const AssetBytes = S.bytes(ArrayBuffer);

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
    throw ValidationError(
      'defineAsset',
      `defineAsset('${decl.id}') declares \`site: []\` — a capsule must run on at least one site. ` +
        `List the sites this asset decodes on (e.g. site: ['node']) or drop the override to keep the derived default.`,
    );
  }
  if (decl.decoder === undefined && builtinDecoderFor(decl.kind) !== undefined) {
    const honest = builtinDecoderSiteFor(decl.kind);
    const impossible = decl.site.filter((s) => !honest.includes(s));
    if (impossible.length > 0) {
      throw ValidationError(
        'defineAsset',
        `defineAsset('${decl.id}') declares site [${decl.site.join(', ')}] but relies on the built-in ${decl.kind} decoder, ` +
          `which only runs on [${honest.join(', ')}] — advertising ${impossible.join('/')} would lie to bundlers and site routers. ` +
          `Provide a custom \`decoder\` that runs on ${impossible.join('/')}, or drop ${impossible.join('/')} from \`site\`.`,
      );
    }
  }
  // Defensive copy: the capsule stores this array and hashes it into the
  // content address exactly once — returning the caller's reference would
  // let a later mutation change cap.site without changing cap.id.
  return Object.freeze([...decl.site]);
}

/**
 * Declare an asset as a cachedProjection capsule. PURE — returns the capsule
 * with NO side effect; assemble the returned capsules into an
 * {@link AssetRegistry} via {@link AssetRegistry.make} to make them
 * resolvable. Resolves `decl.decoder ?? builtinDecoderFor(decl.kind)`
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
export function defineAsset<K extends AssetKind>(
  decl: AssetDecl<K>,
): CapsuleDef<'cachedProjection', ArrayBuffer, DecodedAsset<K>, unknown> {
  const decode: AssetDecoder | undefined = decl.decoder ?? builtinDecoderFor(decl.kind);
  const site: readonly Site[] = resolveDeclSite(decl);
  const decodeP95Ms = decl.budgets?.decodeP95Ms ?? defaultDecodeP95MsFor(decl.kind);
  const capsule = defineCapsule({
    _kind: 'cachedProjection',
    name: decl.id,
    input: decode !== undefined ? AssetBytes : S.unknown,
    output: S.unknown,
    capabilities: { reads: ['fs.read'], writes: [] },
    invariants: decl.invariants ?? [],
    budgets: { p95Ms: decodeP95Ms, memoryMb: decl.budgets?.memoryMb },
    site,
    attribution: decl.attribution,
    ...(decode !== undefined
      ? {
          derive: (source: unknown) =>
            decl.kind === 'video' && decl.decoder === undefined
              ? videoDecoder(source as ArrayBuffer, decl.source)
              : decode(source as ArrayBuffer),
        }
      : {}),
  });
  return capsule as CapsuleDef<'cachedProjection', ArrayBuffer, DecodedAsset<K>, unknown>;
}

// ---------------------------------------------------------------------------
// AssetRegistry — immutable, explicitly assembled. No module global, no reset.
// ---------------------------------------------------------------------------

/**
 * An immutable, explicitly-assembled index of asset capsules. Replaces the
 * old mutable module-global registry: there is no import-time mutation, so
 * resolution no longer depends on which modules happened to load first, and
 * no test-only reset hook is needed (build a fresh registry per scope).
 *
 * Construct one with {@link AssetRegistry.make} over the capsules you got
 * from {@link defineAsset}, then thread it to the consumers that validate or
 * resolve an id (`ref`, `resolveDecoder`, the projection factories).
 */
export interface AssetRegistry {
  /** True when `id` names a capsule in this registry. */
  has(id: string): boolean;
  /** Sorted ids of every capsule in this registry (for teaching errors / listing). */
  ids(): readonly string[];
  /** The capsule registered under `id`, or `undefined`. */
  capsule(id: string): AssetCapsule | undefined;
  /**
   * Validate `id` is registered and return it as a branded {@link AssetRefId}.
   * Throws a registry-miss teaching error (with did-you-mean) on an unknown id.
   */
  ref(id: string): AssetRefId;
  /**
   * Validate that an audio asset id is registered before constructing a
   * projection capsule for it. Throws a registry-miss teaching error naming
   * `factory` when missing.
   */
  assertAudioRegistered(audioAssetId: string, factory: string): void;
  /**
   * Resolve the decode function for an asset id: the registered capsule's
   * `derive` handler (which carries the asset's own decoder, custom or
   * built-in) when present, else the audio built-in — host processes that
   * build a registry without the scene's asset module (e.g. the CLI reading
   * only the compiled manifest) keep the audio-decode fallback. The audio
   * fallback matches the only consumers (beat/onset/waveform are audio
   * projections).
   */
  resolveDecoder(assetId: string): AssetDecoder;
}

function makeAssetRegistry(capsules: readonly AssetCapsule[]): AssetRegistry {
  const index = new Map<string, AssetCapsule>();
  for (const capsule of capsules) {
    if (index.has(capsule.name)) {
      throw ValidationError(
        'AssetRegistry.make',
        `duplicate asset id '${capsule.name}' — two capsules cannot share an id in one registry. ` +
          `Each defineAsset({ id }) must be unique within the registry you assemble.`,
      );
    }
    index.set(capsule.name, capsule);
  }
  const sortedIds = (): readonly string[] => [...index.keys()].sort();
  return Object.freeze({
    has: (id: string): boolean => index.has(id),
    ids: sortedIds,
    capsule: (id: string): AssetCapsule | undefined => index.get(id),
    ref: (id: string): AssetRefId => {
      if (!index.has(id)) throw registryMissError(`AssetRef('${id}')`, id, sortedIds());
      return mkAssetRefId(id);
    },
    assertAudioRegistered: (audioAssetId: string, factory: string): void => {
      if (!index.has(audioAssetId)) {
        throw registryMissError(`${factory}('${audioAssetId}')`, audioAssetId, sortedIds());
      }
    },
    resolveDecoder: (assetId: string): AssetDecoder => {
      const derive = index.get(assetId)?.derive;
      if (derive !== undefined) return async (bytes: ArrayBuffer) => derive(bytes);
      return audioDecoder;
    },
  });
}

/**
 * Assemble an immutable {@link AssetRegistry} from the capsules returned by
 * {@link defineAsset}. Duplicate ids throw at assembly time. This is the ONE
 * registration seam — no module-global Map, no import-order dependence.
 *
 * @example
 * ```ts
 * const introBed = defineAsset({ id: 'intro-bed', source: 'intro-bed.wav', kind: 'audio' });
 * const registry = AssetRegistry.make([introBed]);
 * registry.ref('intro-bed');                 // branded id, validated
 * const decode = registry.resolveDecoder('intro-bed');
 * ```
 */
export const AssetRegistry = {
  make: makeAssetRegistry,
} as const;
