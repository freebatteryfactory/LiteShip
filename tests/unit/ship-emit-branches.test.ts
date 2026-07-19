/**
 * `cli.ship-emit` capsule (ADR-0011) — direct coverage of the
 * `receiptedMutation` arm's surface, bypassing `commands/ship.ts`.
 *
 * `commands/ship.ts` is excluded from coverage matching the existing
 * `bin.ts` / `http-server.ts` pattern, so the only way to hit the
 * branches in `capsules/ship-emit.ts` is to construct a valid
 * {@link ShipCapsule.Shape} and call into the capsule's surface
 * directly. This file covers:
 *
 *   - `ShipEmit.run` write-path success (the fs-write EFFECT) and
 *     `writeFileSync` failure (ENOENT on a missing parent directory).
 *   - `shipEmitCapsule.input` / `shipEmitCapsule.output` Schema
 *     accept + reject (the publishable-snapshot input + receipt output).
 *   - The PURE `mutate` core: deterministic receipt derivation
 *     (idempotency) plus its declared, reachable faults
 *     (`empty-target-path`, `empty-version`, `empty-capsule-id` → status `rejected`).
 *   - The two invariant `check` functions: `id-matches-bytes`
 *     (path echo / path-drift) and `bytes-positive-when-emitted`
 *     (emitted > 0 / rejected = 0 / non-number).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  ContentAddress,
  IntegrityDigest,
  ShipCapsule,
  decode,
  type AddressedDigest,
  type HLCBrand as HLC,
} from '@liteship/core';
import { ShipEmit, shipEmitCapsule } from '../../packages/cli/src/capsules/ship-emit.js';

const fakeDigest = (label: string): AddressedDigest => ({
  display_id: ContentAddress(`fnv1a:${label.padStart(8, '0').slice(0, 8)}`),
  integrity_digest: IntegrityDigest(`sha256:${label.padEnd(64, '0').slice(0, 64)}`),
  algo: 'sha256',
});

const sampleInput = (): ShipCapsule.Input => ({
  _kind: 'shipCapsule',
  schema_version: 1,
  package_name: '@liteship/_spine',
  package_version: '0.1.0',
  source_commit: '0123456789abcdef0123456789abcdef01234567',
  source_dirty: false,
  lockfile_address: fakeDigest('aaaaaaaa'),
  workspace_manifest_address: fakeDigest('bbbbbbbb'),
  tarball_manifest_address: fakeDigest('cccccccc'),
  build_env: {
    node_version: 'v24.13.1',
    pnpm_version: '10.32.1',
    os: 'linux',
    arch: 'x64',
  },
  package_manager: 'pnpm',
  package_manager_version: '10.32.1',
  publish_dry_run_address: fakeDigest('dddddddd'),
  lifecycle_scripts_observed: [],
  generated_at: { wall_ms: 1_715_500_000_000, counter: 0, node_id: 'test-emit' } as HLC,
  previous_ship_capsule: null,
});

let workDir: string;
let capsule: ShipCapsule.Shape;

beforeAll(() => {
  workDir = mkdtempSync(join(tmpdir(), 'litesip-ship-emit-'));
  capsule = ShipCapsule.make(sampleInput());
});

afterAll(() => {
  if (workDir && existsSync(workDir)) {
    rmSync(workDir, { recursive: true, force: true });
  }
});

describe('ShipEmit.run write-path', () => {
  it('serializes to canonical CBOR + writes to disk on the happy path, and surfaces `writeFileSync` ENOENT when the parent dir is missing', () => {
    // Happy path: hits every return-field branch (ship-emit.ts:86-90) and
    // verifies bytes match `ShipCapsule.canonicalize(capsule)` on disk.
    const capsulePath = join(workDir, 'success.shipcapsule.cbor');
    const output = ShipEmit.run({ capsule, capsule_path: capsulePath });
    expect(output.capsule_path).toBe(capsulePath);
    expect(output.capsule_id).toBe(capsule.id);
    expect(output.bytes_written).toBeGreaterThan(0);
    expect(existsSync(capsulePath)).toBe(true);
    expect(statSync(capsulePath).size).toBe(output.bytes_written);
    const onDisk = new Uint8Array(readFileSync(capsulePath));
    const expectedBytes = ShipCapsule.canonicalize(capsule);
    expect(onDisk.length).toBe(expectedBytes.length);
    for (let i = 0; i < expectedBytes.length; i++) {
      expect(onDisk[i]).toBe(expectedBytes[i]);
    }

    // Failure path: writeFileSync to a missing dir throws ENOENT (ship-emit.ts:85).
    // The capsule has no try/catch — the caller (`commands/ship.ts:418`) catches.
    const missingDir = join(workDir, 'does-not-exist-yet');
    const failPath = join(missingDir, 'fail.shipcapsule.cbor');
    expect(() => ShipEmit.run({ capsule, capsule_path: failPath })).toThrow(/ENOENT/);
    expect(existsSync(failPath)).toBe(false);
  });
});

const sampleSnapshot = () => ({
  capsule_path: '/tmp/x.shipcapsule.cbor',
  capsule_id: 'fnv1a:deadbeef',
  package_name: '@liteship/_spine',
  package_version: '0.1.0',
  source_commit: '0123456789abcdef0123456789abcdef01234567',
  lifecycle_scripts_observed: [] as string[],
});

describe('shipEmitCapsule schema validation', () => {
  it('input / output schemas accept well-formed shapes and reject malformed ones', () => {
    // input schema accept branch — the publishable snapshot. `.input` is
    // typed as the phantom `SchemaPort`, so feed it to the kernel strict
    // `decode` through the sanctioned `as never` bridge (same idiom the
    // generated harness templates use for `cap.input`/`cap.output`).
    const okIn = decode(shipEmitCapsule.input as never, sampleSnapshot());
    expect(okIn.ok).toBe(true);
    if (okIn.ok) {
      const decoded = okIn.value as { capsule_path: string; package_version: string };
      expect(decoded.capsule_path).toBe('/tmp/x.shipcapsule.cbor');
      expect(decoded.package_version).toBe('0.1.0');
    }

    // input schema reject branches: missing field, then wrong type.
    expect(decode(shipEmitCapsule.input as never, { capsule_path: '/tmp/x.cbor' }).ok).toBe(false);
    expect(decode(shipEmitCapsule.input as never, { ...sampleSnapshot(), capsule_path: 42 }).ok).toBe(false);

    // output schema accept branch, fed by the pure `mutate` core's receipt.
    const receipt = shipEmitCapsule.mutate!(sampleSnapshot());
    const okOut = decode(shipEmitCapsule.output as never, receipt);
    expect(okOut.ok).toBe(true);
    if (okOut.ok) {
      const decoded = okOut.value as { status: string; bytes_written: number; capsule_path: string };
      expect(decoded.status).toBe('emitted');
      expect(decoded.bytes_written).toBeGreaterThan(0);
      expect(decoded.capsule_path).toBe('/tmp/x.shipcapsule.cbor');
    }
  });
});

describe('shipEmitCapsule pure mutate core', () => {
  it('derives an emission receipt deterministically (idempotent) and rejects unshippable snapshots', () => {
    const mutate = shipEmitCapsule.mutate!;
    // Idempotency: same snapshot → deep-equal receipt, no fs/clock/spawn.
    const a = mutate(sampleSnapshot());
    const b = mutate(sampleSnapshot());
    expect(b).toEqual(a);
    expect(a.status).toBe('emitted');
    expect(a.bytes_written).toBeGreaterThan(0);
    expect(a.capsule_id).toBe('fnv1a:deadbeef');

    // The assembled capsule id is part of the canonical snapshot bytes, and the
    // receipt reports that assembled id verbatim rather than deriving a fallback.
    const shortId = mutate({ ...sampleSnapshot(), capsule_id: 'fnv1a:a' });
    const longId = mutate({ ...sampleSnapshot(), capsule_id: 'fnv1a:aaaaaaaaaaaaaaaa' });
    expect(shortId.capsule_id).toBe('fnv1a:a');
    expect(longId.capsule_id).toBe('fnv1a:aaaaaaaaaaaaaaaa');
    expect(longId.bytes_written).toBeGreaterThan(shortId.bytes_written);

    // Declared fault `empty-target-path` → status 'rejected', zero bytes.
    const noPath = mutate({ ...sampleSnapshot(), capsule_path: '' });
    expect(noPath.status).toBe('rejected');
    expect(noPath.bytes_written).toBe(0);

    // Declared fault `empty-version` → status 'rejected', zero bytes.
    const noVersion = mutate({ ...sampleSnapshot(), package_version: '' });
    expect(noVersion.status).toBe('rejected');
    expect(noVersion.bytes_written).toBe(0);

    // Declared fault `empty-capsule-id` → status 'rejected', zero bytes.
    const noCapsuleId = mutate({ ...sampleSnapshot(), capsule_id: '   ' });
    expect(noCapsuleId.status).toBe('rejected');
    expect(noCapsuleId.bytes_written).toBe(0);
  });

  it('declares exactly the reachable faults the harness injects', () => {
    expect(shipEmitCapsule.faults!.map((f) => f.name)).toEqual([
      'empty-target-path',
      'empty-version',
      'empty-capsule-id',
    ]);
    for (const fault of shipEmitCapsule.faults!) {
      // Each fault's trigger drives the pure core to its declared status.
      const receipt = shipEmitCapsule.mutate!(fault.trigger());
      expect(receipt.status).toBe(fault.status);
    }
  });
});

describe('shipEmitCapsule invariants', () => {
  it('`id-matches-bytes` and `bytes-positive-when-emitted` check functions cover their true and false branches', () => {
    const idMatches = shipEmitCapsule.invariants.find((i) => i.name === 'id-matches-bytes');
    const bytesPositive = shipEmitCapsule.invariants.find((i) => i.name === 'bytes-positive-when-emitted');
    expect(idMatches).toBeDefined();
    expect(bytesPositive).toBeDefined();
    const input = { capsule_path: '/a/b.cbor' };

    // id-matches-bytes: true when the path echoes through, false on path drift.
    expect(idMatches!.check!(input, { capsule_path: '/a/b.cbor' })).toBe(true);
    expect(idMatches!.check!(input, { capsule_path: '/a/different.cbor' })).toBe(false);

    // bytes-positive-when-emitted: emitted needs > 0 bytes; rejected needs 0.
    expect(bytesPositive!.check!(input, { status: 'emitted', bytes_written: 1 })).toBe(true);
    expect(bytesPositive!.check!(input, { status: 'emitted', bytes_written: 0 })).toBe(false);
    expect(bytesPositive!.check!(input, { status: 'rejected', bytes_written: 0 })).toBe(true);
    expect(bytesPositive!.check!(input, { status: 'rejected', bytes_written: 5 })).toBe(false);
    expect(
      bytesPositive!.check!(input, {
        status: 'emitted',
        bytes_written: 'oops' as unknown as number,
      }),
    ).toBe(false);
  });
});
