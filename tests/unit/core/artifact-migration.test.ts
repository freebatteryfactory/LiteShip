/**
 * Artifact-MIGRATION harness (Slice C, the avionics tier).
 *
 * Every versioned serialized artifact in `@czap/core` must have a VERSION-AWARE,
 * FAIL-CLOSED reader: a current-version artifact round-trips, and an
 * UNKNOWN/FUTURE version is REJECTED with ONE canonical tagged error — never
 * silently misparsed into the current shape. Pre-stable, an artifact break is
 * fine, but it must be HONEST (parse / migrate / fail-canonically).
 *
 * The four versioned (or version-bearing) artifacts:
 *
 *  1. ShipCapsule (`schema_version: 1`) — HAD a version-aware decode that
 *     conflated version with shape (a v2 capsule was reported `invalid_shape`).
 *     The decode now surfaces a DISTINCT `unsupported_version` verdict.
 *
 *  2. DocumentGraph (`_version: 1`) — was a GAP: `sealGraph` only re-mints ids; a
 *     graph reconstructed from untrusted JSON had no version-aware reader. Added
 *     `decodeDocumentGraph`, which fails-closed with a tagged `ParseError`.
 *
 *  3. GraphPatch (`_version: 1`) — was a GAP: `apply` trusts its `patch`
 *     argument's `_version`. Added `GraphPatch.decode` (version-check-only),
 *     which fails-closed with a tagged `ParseError`.
 *
 *  4. Receipt — uses a `kind` discriminator and carries NO `_version`. It is
 *     therefore NOT a versioned artifact in the schema-evolution sense; its
 *     evolution is handled by adding a new `kind`, and the chain hash law pins
 *     its bytes. Documented here so the absence is intentional, not an oversight.
 *
 * @module
 */

import { describe, test, expect } from 'vitest';
import { Effect } from 'effect';
import { hasTag, getTag } from '@czap/error';
import { encode as cborEncode } from 'cborg';
import {
  ContentAddress,
  IntegrityDigest,
  ShipCapsule,
  sealNode,
  sealGraph,
  decodeDocumentGraph,
  GraphPatch,
  type AddressedDigest,
  type HLCBrand as HLC,
  type SignalNode,
  type DocumentGraphNode,
  type DocumentGraphEdge,
  type DocumentGraph as DocumentGraphType,
  type CellMeta,
} from '@czap/core';

const run = <A, E>(eff: Effect.Effect<A, E>) => Effect.runPromise(eff);

// ── Shared fixtures ──────────────────────────────────────────────────

const fakeDigest = (label: string): AddressedDigest => ({
  display_id: ContentAddress(`fnv1a:${'0'.repeat(8 - label.length)}${label}`.slice(0, 14)),
  integrity_digest: IntegrityDigest(`sha256:${label.padEnd(64, '0').slice(0, 64)}`),
  algo: 'sha256',
});

const sampleCapsuleInput = (overrides: Partial<ShipCapsule.Input> = {}): ShipCapsule.Input => ({
  _kind: 'shipCapsule',
  schema_version: 1,
  package_name: '@czap/_spine',
  package_version: '0.1.0',
  source_commit: '0123456789abcdef0123456789abcdef01234567',
  source_dirty: false,
  lockfile_address: fakeDigest('aaaaaaaa'),
  workspace_manifest_address: fakeDigest('bbbbbbbb'),
  tarball_manifest_address: fakeDigest('cccccccc'),
  build_env: { node_version: 'v24.13.1', pnpm_version: '10.32.1', os: 'linux', arch: 'x64' },
  package_manager: 'pnpm',
  package_manager_version: '10.32.1',
  publish_dry_run_address: fakeDigest('dddddddd'),
  lifecycle_scripts_observed: [],
  generated_at: { wall_ms: 1_715_500_000_000, counter: 0, node_id: 'test-node' } as HLC,
  previous_ship_capsule: null,
  ...overrides,
});

const META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 't' },
  updated: { wall_ms: 0, counter: 0, node_id: 't' },
  version: 1,
};

const node = (input: string): SignalNode =>
  sealNode({
    _tag: 'DocGraphSignalNode',
    _version: 1,
    family: 'signal',
    id: '',
    meta: META,
    input,
  } as unknown as SignalNode);

const graph = (nodes: DocumentGraphNode[], edges: DocumentGraphEdge[]): DocumentGraphType =>
  sealGraph({ _tag: 'DocumentGraph', _version: 1, meta: META, nodes, edges } as Omit<
    DocumentGraphType,
    'id' | 'digest'
  >);

// ── 1. ShipCapsule (schema_version: 1) ───────────────────────────────

describe('artifact migration — ShipCapsule (schema_version)', () => {
  test('a current-version (v1) capsule round-trips encode → decode → identical', async () => {
    const capsule = await run(ShipCapsule.make(sampleCapsuleInput()));
    const bytes = ShipCapsule.canonicalize(capsule);
    const decoded = await run(ShipCapsule.decode(bytes));
    expect(decoded).toEqual(capsule);
    expect(decoded.schema_version).toBe(1);
  });

  test('a FUTURE version (schema_version: 999) is REJECTED unsupported_version — never misparsed as v1', async () => {
    // Forge a shape-valid capsule stamped with a future schema_version. It must
    // surface a DISTINCT version verdict (not invalid_shape, not a silent v1
    // coercion): the migration boundary is honest.
    const futureInput = sampleCapsuleInput() as ShipCapsule.Input & { schema_version: number };
    futureInput.schema_version = 999;
    const capsule = await run(ShipCapsule.make(futureInput as ShipCapsule.Input));
    const bytes = ShipCapsule.canonicalize(capsule);

    const exit = await Effect.runPromiseExit(ShipCapsule.decode(bytes));
    expect(exit._tag).toBe('Failure');
    const err = await run(ShipCapsule.decode(bytes).pipe(Effect.flip));
    expect(err).toBe('unsupported_version');
  });

  test('the version verdict is DISTINCT from the shape verdict (a different drift = a different failure)', async () => {
    // A wrong-shape value still reports invalid_shape; only a shape-valid,
    // wrong-version value reports unsupported_version. The two are not conflated.
    const wrongShape = new Uint8Array(cborEncode({ not: 'a capsule', schema_version: 1 }));
    const shapeErr = await run(ShipCapsule.decode(wrongShape).pipe(Effect.flip));
    expect(shapeErr).toBe('invalid_shape');
  });
});

// ── 2. DocumentGraph (_version: 1) ───────────────────────────────────

describe('artifact migration — DocumentGraph (_version)', () => {
  test('a current-version (v1) graph round-trips through JSON → decodeDocumentGraph → identical', () => {
    const g = graph([node('a'), node('b')], [{ from: node('a').id, to: node('b').id, type: 'seq' }]);
    // Round-trip through JSON to model a persisted/wire payload (untrusted value).
    const wire = JSON.parse(JSON.stringify(g)) as unknown;
    const decoded = decodeDocumentGraph(wire);
    expect(decoded).toEqual(g);
    expect(decoded._version).toBe(1);
  });

  test('a FUTURE version (_version: 2) is REJECTED with one canonical tagged ParseError — never misparsed as v1', () => {
    const g = graph([node('a')], []);
    const futureGraph = { ...JSON.parse(JSON.stringify(g)), _version: 2 } as unknown;

    let thrown: unknown;
    try {
      decodeDocumentGraph(futureGraph);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeDefined();
    expect(hasTag(thrown, 'ParseError')).toBe(true);
    expect(getTag(thrown)).toBe('ParseError');
    expect((thrown as { source: string }).source).toBe('DocumentGraph');
    expect((thrown as { code?: string }).code).toBe('unsupported_version');
    // The error is a REAL Error (stack + instanceof), per the @czap/error algebra.
    expect(thrown).toBeInstanceOf(Error);
  });

  test('a wrong _tag is rejected (a non-graph value never decodes as a graph)', () => {
    const notAGraph = { _tag: 'GraphPatch', _version: 1, nodes: [], edges: [] } as unknown;
    let thrown: unknown;
    try {
      decodeDocumentGraph(notAGraph);
    } catch (e) {
      thrown = e;
    }
    expect(hasTag(thrown, 'ParseError')).toBe(true);
    expect((thrown as { code?: string }).code).toBe('wrong_tag');
  });

  test('a malformed node (fails the well-formedness gate) is rejected, not coerced', () => {
    const g = graph([node('a')], []);
    const wire = JSON.parse(JSON.stringify(g)) as { nodes: unknown[] };
    // Corrupt the node: a signal node with a non-string `input` fails isWellFormedNode.
    (wire.nodes[0] as { input: unknown }).input = 42;
    let thrown: unknown;
    try {
      decodeDocumentGraph(wire);
    } catch (e) {
      thrown = e;
    }
    expect(hasTag(thrown, 'ParseError')).toBe(true);
    expect((thrown as { code?: string }).code).toBe('malformed_node');
  });
});

// ── 3. GraphPatch (_version: 1) ──────────────────────────────────────

describe('artifact migration — GraphPatch (_version)', () => {
  test('a current-version (v1) patch round-trips through JSON → GraphPatch.decode → identical', () => {
    const base = graph([node('a')], []);
    const patch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('b') }]);
    const wire = JSON.parse(JSON.stringify(patch)) as unknown;
    const decoded = GraphPatch.decode(wire);
    expect(decoded).toEqual(patch);
    expect(decoded._version).toBe(1);
  });

  test('a FUTURE version (_version: 2) is REJECTED with one canonical tagged ParseError — never replayed as v1', () => {
    const base = graph([node('a')], []);
    const patch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('b') }]);
    const futurePatch = { ...JSON.parse(JSON.stringify(patch)), _version: 2 } as unknown;

    let thrown: unknown;
    try {
      GraphPatch.decode(futurePatch);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeDefined();
    expect(hasTag(thrown, 'ParseError')).toBe(true);
    expect((thrown as { source: string }).source).toBe('GraphPatch');
    expect((thrown as { code?: string }).code).toBe('unsupported_version');
    expect(thrown).toBeInstanceOf(Error);
  });

  test('a wrong _tag is rejected (a non-patch value never decodes as a patch)', () => {
    const notAPatch = { _tag: 'DocumentGraph', _version: 1, ops: [] } as unknown;
    let thrown: unknown;
    try {
      GraphPatch.decode(notAPatch);
    } catch (e) {
      thrown = e;
    }
    expect(hasTag(thrown, 'ParseError')).toBe(true);
    expect((thrown as { code?: string }).code).toBe('wrong_tag');
  });

  test('a non-object value is rejected (null/array/string never decode as a patch)', () => {
    for (const bad of [null, [], 'patch', 42] as const) {
      let thrown: unknown;
      try {
        GraphPatch.decode(bad as unknown);
      } catch (e) {
        thrown = e;
      }
      expect(hasTag(thrown, 'ParseError')).toBe(true);
    }
  });
});

// ── 4. Receipt — intentionally version-less (a `kind` discriminator) ─

describe('artifact migration — Receipt (kind discriminator, no _version)', () => {
  test('a ReceiptEnvelope carries NO _version field — its evolution is by `kind`, not schema_version', async () => {
    // This pins the deliberate design (see the receipt.ts module doc): the receipt
    // byte law hashes a `kind`-discriminated envelope; there is no schema_version
    // to migrate, so no version-aware decode is owed. Adding a `_version` here
    // would be a real artifact change that THIS guard would surface.
    const { Receipt, HLC: HLCNs, TypedRef } = await import('@czap/core');
    const ts = HLCNs.create('migration-test');
    const payload = await run(TypedRef.create('test/plain', { hello: 'world' }));
    const envelope = await run(
      Receipt.createEnvelope('migration-probe', { type: 'artifact', id: 'x' }, payload, ts, Receipt.GENESIS),
    );
    expect('_version' in envelope).toBe(false);
    expect('schema_version' in envelope).toBe(false);
    expect(typeof envelope.kind).toBe('string');
  });
});
