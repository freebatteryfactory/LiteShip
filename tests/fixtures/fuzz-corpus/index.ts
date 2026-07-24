/**
 * The VERSIONED fuzz CORPUS — the committed, content-addressed seed inputs the
 * decode fuzzer ALWAYS replays (regression) before it explores beyond them.
 *
 * Three classes of seed live here:
 *  (a) the KNOWN prototype-pollution CVE input (the `__proto__` CBOR map — the
 *      regression that MUST stay closed; see the `pre-cut 0.3.0` memory + the
 *      `cbor-decode.test.ts` `__proto__` regression). Replayed every run; if it
 *      ever pollutes / crashes / misparses, the CVE reopened.
 *  (b) MALFORMED / ADVERSARIAL seeds per decoder — truncated, oversized,
 *      reserved-encoding, wrong-version, deeply-nested, NaN/Infinity,
 *      duplicate-key, pollution-keyed — the specific encodings a generator is
 *      unlikely to hit by chance, pinned so they are exercised EVERY run.
 *  (c) the DEOPT→TEST slot ({@link FOUND_BUG_SEEDS}): a fuzzer-found failure
 *      becomes a PERMANENT corpus seed here, so a fixed bug never silently
 *      regresses. The slot starts empty (a live run found nothing new); the
 *      moment one does, its byte-exact input lands here.
 *
 * Each seed is CONTENT-ADDRESSED through the ONE kernel (`contentAddressOf`),
 * deterministic + machine-checkable: the corpus's identity is the address over
 * its seeds, so a silent edit is detectable. The corpus is a TYPED module (not
 * loose JSON/binary blobs) so it round-trips through the same import graph the
 * SUTs do, and the bytes are constructed from the encoder where possible (the
 * CVE seed is the encoder's OWN output for `{ __proto__: [] }`, so it tracks the
 * encoder, never a hand-typed mirror that could drift).
 *
 * @module
 */

import { contentAddressOf } from '@liteship/core';
import { CanonicalCbor } from '@liteship/canonical';
import type { ContentAddress } from '@liteship/core';

/**
 * One corpus seed: an input bound to the decoder SUT it targets (by id), with a
 * declared EXPECTED outcome class so the driver can assert the FULL contract
 * (not just "didn't crash"): a CVE seed expects `failed-closed` OR
 * `returned-typed` with no pollution; an adversarial malformed seed expects
 * `failed-closed`. `kind` documents WHY the seed exists; `address` is its
 * content identity through the one kernel.
 */
export interface CorpusSeed {
  /** Stable seed id — unique within the corpus. */
  readonly id: string;
  /** The decoder SUT this seed targets (matches a {@link DecoderSut.id}). */
  readonly decoderId: string;
  /** Why this seed exists — the adversarial class it pins. */
  readonly kind: 'cve-regression' | 'adversarial' | 'found-bug';
  /** Human note on what the seed exercises. */
  readonly note: string;
  /** The raw input the decoder ingests (bytes / value / string). */
  readonly input: unknown;
  /**
   * The acceptable outcome classes for this seed. EVERY seed must end
   * fail-closed-or-typed with NO pollution; a malformed seed additionally
   * REQUIRES `failed-closed` (a malformed input that "returns" would be a
   * misparse). A CVE/round-trippable seed allows either acceptable class.
   */
  readonly expect: readonly ('failed-closed' | 'returned-typed')[];
}

// ── (a) The CVE regression seed — the `__proto__` CBOR map ────────────────────

/**
 * The KNOWN prototype-pollution CVE input: canonical CBOR for `{ __proto__: [] }`.
 *
 * Constructed from the ENCODER (`CanonicalCbor.encode`) so it is byte-identical
 * to what the encoder emits for an object carrying a `__proto__` OWN key — never
 * a hand-typed byte mirror that could drift from the encoder. Decoding it MUST
 * yield an object with `__proto__` as an OWN data property (an empty array) and
 * leave `Object.prototype` UNPOLLUTED (the `defineProperty` fix). If a future
 * change reverts to `out[key] = value`, this seed reopens the CVE: the decode
 * pollutes the prototype, the guard fires, the gate blocks.
 *
 * Built via `defineProperty` on the SOURCE object so `__proto__` is an enumerable
 * OWN key (the `{ __proto__: … }` object literal would set the prototype, not an
 * own key — exactly the trap the decoder defends against on the read side).
 */
function protoCveSourceObject(): Record<string, unknown> {
  const source: Record<string, unknown> = {};
  Object.defineProperty(source, '__proto__', { value: [], enumerable: true, writable: true, configurable: true });
  return source;
}

/** The canonical-CBOR bytes of `{ __proto__: [] }` — the CVE regression seed bytes. */
export const PROTO_POLLUTION_CVE_BYTES: Uint8Array = CanonicalCbor.encode(protoCveSourceObject());

/**
 * A second CVE-class seed: `{ constructor: { prototype: { polluted: true } } }`
 * — the `constructor.prototype` pollution vector (the sibling of `__proto__`).
 * A correct decoder reads `constructor` as an ordinary OWN string key and never
 * walks it onto the prototype chain.
 */
export const CONSTRUCTOR_POLLUTION_CVE_BYTES: Uint8Array = CanonicalCbor.encode({
  constructor: { prototype: { polluted: true } },
});

// ── (b) Adversarial seeds per decoder ─────────────────────────────────────────

/** A CBOR head byte for major-type `m` with additional-info `ai`. */
const head = (major: number, ai: number): number => ((major << 5) | ai) & 0xff;

/** Build the full corpus seed list. Pure: deterministic byte/value construction. */
function buildSeeds(): readonly CorpusSeed[] {
  const seeds: CorpusSeed[] = [];

  // (a) the CVE regression seeds — must stay closed (fail-closed OR a clean typed
  // return with no pollution; the guard in the harness asserts no pollution).
  seeds.push({
    id: 'cve-proto-pollution-cbor',
    decoderId: 'canonical-cbor.decode',
    kind: 'cve-regression',
    note: 'canonical CBOR for { __proto__: [] } — the known prototype-pollution CVE; decode must NOT pollute Object.prototype.',
    input: PROTO_POLLUTION_CVE_BYTES,
    expect: ['returned-typed', 'failed-closed'],
  });
  seeds.push({
    id: 'cve-constructor-pollution-cbor',
    decoderId: 'canonical-cbor.decode',
    kind: 'cve-regression',
    note: 'canonical CBOR for { constructor: { prototype: { polluted } } } — the constructor.prototype pollution sibling.',
    input: CONSTRUCTOR_POLLUTION_CVE_BYTES,
    expect: ['returned-typed', 'failed-closed'],
  });

  // (b.1) CBOR adversarial bytes — truncation, reserved AI, indefinite length,
  // oversized declared length, non-canonical encoding, deep nesting.
  const cborAdversarial: ReadonlyArray<{ id: string; note: string; bytes: Uint8Array }> = [
    { id: 'cbor-empty', note: 'zero bytes — unexpected EOF at the top-level head.', bytes: Uint8Array.from([]) },
    {
      id: 'cbor-truncated-array',
      note: 'array head declaring 4 items but no payload — truncated input.',
      bytes: Uint8Array.from([head(4, 4)]),
    },
    {
      id: 'cbor-oversized-bytestring-length',
      note: 'byte-string head declaring 2^32-1 bytes that are not present — oversized length, must EOF not allocate.',
      bytes: Uint8Array.from([head(2, 26), 0xff, 0xff, 0xff, 0xff]),
    },
    {
      id: 'cbor-reserved-additional-info',
      note: 'additional-info 28 (reserved) — must reject malformed, not crash.',
      bytes: Uint8Array.from([head(0, 28)]),
    },
    {
      id: 'cbor-indefinite-length-map',
      note: 'indefinite-length map (ai=31) — non-canonical, must reject.',
      bytes: Uint8Array.from([head(5, 31)]),
    },
    {
      id: 'cbor-non-canonical-uint',
      note: 'uint 0 encoded in 2 bytes (0x18 0x00) instead of shortest form — non-canonical.',
      bytes: Uint8Array.from([head(0, 24), 0x00]),
    },
    {
      id: 'cbor-trailing-bytes',
      note: 'a valid uint 0 followed by a trailing byte — trailing data after the top-level item.',
      bytes: Uint8Array.from([0x00, 0x00]),
    },
    {
      id: 'cbor-non-string-map-key',
      note: 'map with a uint key (major 0) where only text-string keys are legal — malformed key.',
      bytes: Uint8Array.from([head(5, 1), 0x00, 0x00]),
    },
    {
      id: 'cbor-deeply-nested-arrays',
      note: '64 nested single-element arrays — recursion-depth adversary; must not stack-overflow into a raw crash.',
      bytes: Uint8Array.from(Array.from({ length: 64 }, () => head(4, 1))),
    },
  ];
  for (const a of cborAdversarial) {
    seeds.push({
      id: a.id,
      decoderId: 'canonical-cbor.decode',
      kind: 'adversarial',
      note: a.note,
      input: a.bytes,
      expect: ['failed-closed'],
    });
  }

  // (b.2) HLC adversarial strings — missing parts, non-hex, pollution-shaped.
  const hlcAdversarial: ReadonlyArray<{ id: string; note: string; value: string }> = [
    { id: 'hlc-empty', note: 'empty string — fewer than 3 colon-separated parts.', value: '' },
    { id: 'hlc-too-few-parts', note: 'two parts only — malformed.', value: 'abc:def' },
    { id: 'hlc-non-hex-wall', note: 'non-hex wall_ms — malformed.', value: 'zzzz:0000:node' },
    { id: 'hlc-non-hex-counter', note: 'non-hex counter — malformed.', value: '0000:zzzz:node' },
    { id: 'hlc-proto-node-id', note: '__proto__ as the node id — must be ordinary data, not a prototype walk.', value: '0:0:__proto__' },
    { id: 'hlc-many-colons', note: 'a node id full of colons — must rejoin, not crash.', value: '0:0:a:b:c:d:e' },
  ];
  for (const a of hlcAdversarial) {
    seeds.push({
      id: a.id,
      decoderId: 'hlc.decode',
      kind: 'adversarial',
      note: a.note,
      input: a.value,
      expect: ['failed-closed', 'returned-typed'],
    });
  }

  // (b.3) GraphPatch adversarial values — wrong tag/version, pollution, chaos.
  const futureVersions: readonly unknown[] = [2, 999, Number.NaN, Number.POSITIVE_INFINITY, '1', null, undefined];
  for (const v of futureVersions) {
    seeds.push({
      id: `graph-patch-version-${String(v)}`,
      decoderId: 'graph-patch.decode',
      kind: 'adversarial',
      note: `GraphPatch envelope with _version=${String(v)} — version-skew; must reject (unsupported_version / wrong shape), never misparse as v1.`,
      input: { _tag: 'GraphPatch', _version: v, base: 'fnv1a:00000000', ops: [] },
      expect: ['failed-closed'],
    });
  }
  seeds.push({
    id: 'graph-patch-wrong-tag',
    decoderId: 'graph-patch.decode',
    kind: 'adversarial',
    note: 'a DocumentGraph-tagged value fed to GraphPatch.decode — wrong _tag, must reject.',
    input: { _tag: 'DocumentGraph', _version: 1, nodes: [], edges: [] },
    expect: ['failed-closed'],
  });
  seeds.push({
    id: 'graph-patch-proto-pollution',
    decoderId: 'graph-patch.decode',
    kind: 'adversarial',
    note: 'a GraphPatch-shaped value carrying a __proto__/constructor pollution payload — must not pollute on the version check.',
    input: { _tag: 'GraphPatch', _version: 1, __proto__: { __polluted__: true }, constructor: { prototype: { isAdmin: true } } },
    expect: ['failed-closed', 'returned-typed'],
  });
  seeds.push({
    id: 'graph-patch-array',
    decoderId: 'graph-patch.decode',
    kind: 'adversarial',
    note: 'an array fed to GraphPatch.decode — not an object, must reject not_an_object.',
    input: [1, 2, 3],
    expect: ['failed-closed'],
  });
  seeds.push({
    id: 'graph-patch-null',
    decoderId: 'graph-patch.decode',
    kind: 'adversarial',
    note: 'null fed to GraphPatch.decode — must reject not_an_object.',
    input: null,
    expect: ['failed-closed'],
  });

  // (b.4) DocumentGraph adversarial values — wrong tag/version, malformed parts.
  for (const v of futureVersions) {
    seeds.push({
      id: `document-graph-version-${String(v)}`,
      decoderId: 'document-graph.decode',
      kind: 'adversarial',
      note: `DocumentGraph envelope with _version=${String(v)} — version-skew; must reject, never misparse as v1.`,
      input: { _tag: 'DocumentGraph', _version: v, nodes: [], edges: [], meta: {} },
      expect: ['failed-closed'],
    });
  }
  seeds.push({
    id: 'document-graph-malformed-nodes',
    decoderId: 'document-graph.decode',
    kind: 'adversarial',
    note: 'DocumentGraph with non-array `nodes` — malformed_nodes, must reject.',
    input: { _tag: 'DocumentGraph', _version: 1, nodes: 'not-an-array', edges: [], meta: { version: 1 } },
    expect: ['failed-closed'],
  });
  seeds.push({
    id: 'document-graph-malformed-node',
    decoderId: 'document-graph.decode',
    kind: 'adversarial',
    note: 'DocumentGraph with a non-well-formed node — malformed_node, must reject.',
    input: { _tag: 'DocumentGraph', _version: 1, nodes: [{ not: 'a node' }], edges: [], meta: { version: 1, created: {}, updated: {} } },
    expect: ['failed-closed'],
  });
  seeds.push({
    id: 'document-graph-proto-pollution',
    decoderId: 'document-graph.decode',
    kind: 'adversarial',
    note: 'a DocumentGraph-shaped value carrying a pollution payload — must not pollute on the envelope check.',
    input: { _tag: 'DocumentGraph', _version: 1, nodes: [], edges: [], __proto__: { __polluted__: true } },
    expect: ['failed-closed', 'returned-typed'],
  });

  // (b.5) ShipCapsule adversarial bytes — non-CBOR, wrong shape, future version.
  seeds.push({
    id: 'ship-capsule-garbage-bytes',
    decoderId: 'ship-capsule.decode',
    kind: 'adversarial',
    note: 'random non-CBOR bytes — malformed_cbor (the cborg parse fails), must fail-closed.',
    input: Uint8Array.from([0xde, 0xad, 0xbe, 0xef, 0xff, 0x00, 0x42]),
    expect: ['failed-closed'],
  });
  seeds.push({
    id: 'ship-capsule-wrong-shape',
    decoderId: 'ship-capsule.decode',
    kind: 'adversarial',
    note: 'valid CBOR of a non-capsule object — invalid_shape, must fail-closed.',
    input: CanonicalCbor.encode({ not: 'a capsule', schema_version: 1 }),
    expect: ['failed-closed'],
  });
  seeds.push({
    id: 'ship-capsule-empty',
    decoderId: 'ship-capsule.decode',
    kind: 'adversarial',
    note: 'zero bytes — malformed_cbor, must fail-closed.',
    input: Uint8Array.from([]),
    expect: ['failed-closed'],
  });

  return seeds;
}

/** Every committed corpus seed — replayed in full on every fuzz run (the regression floor). */
export const CORPUS_SEEDS: readonly CorpusSeed[] = buildSeeds();

/**
 * The DEOPT→TEST slot: fuzzer-found failures that have been promoted to permanent
 * regression seeds. EMPTY today — the live run found no new crash / pollution /
 * misparse on the L4 decode surface (a genuine green). When the fuzzer finds one,
 * its byte-exact input is appended here (with a `found-bug` kind + the seed that
 * reproduced it) so the fixed bug can never silently regress.
 */
export const FOUND_BUG_SEEDS: readonly CorpusSeed[] = [];

/** The full corpus the driver replays: the committed seeds + any promoted found-bug seeds. */
export const FUZZ_CORPUS: readonly CorpusSeed[] = [...CORPUS_SEEDS, ...FOUND_BUG_SEEDS];

/**
 * The content address of a single seed — its deterministic identity through the
 * ONE kernel. Bytes are addressed as the byte array; values/strings as themselves.
 * Used to pin the corpus (a silent edit changes the address) and to key a
 * found-bug seed.
 */
export function seedAddress(seed: CorpusSeed): ContentAddress {
  const addressable =
    seed.input instanceof Uint8Array ? { id: seed.id, bytes: [...seed.input] } : { id: seed.id, value: seed.input };
  return contentAddressOf(addressable);
}

/**
 * The content address of the WHOLE corpus — the address over every seed's
 * (id, decoderId, kind, address) tuple, sorted by id. The corpus's stable
 * identity: a committed-corpus drift guard asserts this against a pinned value,
 * so an unreviewed edit to the seed set is caught.
 */
export function corpusAddress(): ContentAddress {
  const manifest = [...FUZZ_CORPUS]
    .map((seed) => ({ id: seed.id, decoderId: seed.decoderId, kind: seed.kind, address: seedAddress(seed) }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return contentAddressOf(manifest);
}

/** Corpus seeds targeting a given decoder. */
export function seedsForDecoder(decoderId: string): readonly CorpusSeed[] {
  return FUZZ_CORPUS.filter((s) => s.decoderId === decoderId);
}
