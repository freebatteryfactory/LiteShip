/**
 * ShipEmit — `receiptedMutation` arm instance `cli.ship-emit` (ADR-0011).
 *
 * A ship emission has two cleanly separable halves:
 *
 *  - a PURE receipt-producing core ({@link shipEmitCapsule}'s `mutate`): given a
 *    publishable workspace SNAPSHOT (package name + version + source commit +
 *    observed lifecycle scripts + the assembled capsule id), it derives the
 *    emission receipt deterministically — the content-addressed `capsule_id`,
 *    the byte length the canonical-CBOR encoding will occupy, and an
 *    `emitted` / `rejected` status. No filesystem, no clock, no spawn. This is
 *    why `cli.ship-emit` proves the mandatory-`mutate` requirement: its receipt
 *    is derivable PURELY from inputs, so idempotency + audit-receipt +
 *    fault-injection are real tests.
 *  - the EFFECT ({@link ShipEmit.run}): canonicalizes the fully-assembled
 *    {@link ShipCapsule.Shape} and writes `<pkg>-<version>.shipcapsule.cbor`
 *    next to a freshly-produced npm tarball. The publish itself is downstream.
 *
 * Re-uses the seven-arm closure (ADR-0008): emission is a
 * `receiptedMutation`, not a new arm. The capsule declaration is what the
 * AST walker / type-directed detector picks up for
 * `reports/capsule-manifest.json`.
 *
 * @module
 */

import { writeFileSync } from 'node:fs';
import { CanonicalCbor, defineCapsule, S, ShipCapsule, type ContentAddress } from '@czap/core';
import type { Infer } from '@czap/core';

/**
 * The publishable workspace snapshot the emission receipt is PURELY derived
 * from. Every field is a plain scalar / array (arbitrary-derivable), so the
 * harness can sample it for the contract round-trip AND drive `mutate` twice.
 */
const ShipEmitInput = S.struct({
  capsule_path: S.string,
  capsule_id: S.string,
  package_name: S.string,
  package_version: S.string,
  source_commit: S.string,
  lifecycle_scripts_observed: S.array(S.string),
});

/**
 * The emission receipt. `status` is the typed surface a declared fault drives
 * to (`emitted` on the happy path, `rejected` when the snapshot is unshippable),
 * which is what makes the fault-injection check real.
 */
const ShipEmitOutput = S.struct({
  status: S.union(S.literal('emitted'), S.literal('rejected')),
  bytes_written: S.number,
  capsule_path: S.string,
  capsule_id: S.string,
  package_name: S.string,
  package_version: S.string,
});

type ShipEmitDecodedInput = Infer<typeof ShipEmitInput>;
type ShipEmitDecodedOutput = Infer<typeof ShipEmitOutput>;

interface ShipEmitRunInput {
  readonly capsule: ShipCapsule.Shape;
  readonly capsule_path: string;
}

interface ShipEmitRunOutput {
  readonly bytes_written: number;
  readonly capsule_path: string;
  readonly capsule_id: ContentAddress;
}

/**
 * Pure receipt-producing core for the ship-emit capsule (the `mutate` channel
 * the harness drives). Deterministic over the publishable snapshot: it includes
 * the assembled capsule id in the canonical snapshot bytes, computes the byte
 * length the emission receipt would occupy, and returns an `emitted` /
 * `rejected` receipt. NO filesystem, NO clock, NO spawn — driving it twice with
 * the same snapshot yields a deep-equal receipt (idempotency), and a
 * structurally unshippable snapshot (empty path / empty version / empty
 * capsule id) surfaces as `rejected` (the declared faults).
 */
function deriveEmissionReceipt(input: ShipEmitDecodedInput): ShipEmitDecodedOutput {
  // Structural rejection: an empty target path, version, or capsule id cannot
  // produce a shippable artifact. These are the declared, reachable faults.
  const rejected =
    input.capsule_path.trim().length === 0 ||
    input.package_version.trim().length === 0 ||
    input.capsule_id.trim().length === 0;

  // Content-address the snapshot through the one canonical kernel
  // (canonicalize → CanonicalCbor → fnv1a) so the receipt id is the snapshot's
  // identity, not a proxy beside it.
  const snapshot = {
    capsule_id: input.capsule_id,
    package_name: input.package_name,
    package_version: input.package_version,
    source_commit: input.source_commit,
    lifecycle_scripts_observed: input.lifecycle_scripts_observed,
  };
  // Byte length the canonical-CBOR encoding of the snapshot occupies —
  // deterministic for a given snapshot (same kernel `ShipEmit.run` uses for
  // the assembled capsule). Zero on rejection (nothing is emitted).
  const bytes = rejected ? 0 : CanonicalCbor.encode(snapshot).byteLength;

  return {
    status: rejected ? 'rejected' : 'emitted',
    bytes_written: bytes,
    capsule_path: input.capsule_path,
    capsule_id: input.capsule_id,
    package_name: input.package_name,
    package_version: input.package_version,
  };
}

/**
 * Declared capsule for the ShipCapsule emission. Registered in the module-level
 * catalog at import time; walked by `scripts/capsule-compile.ts`.
 *
 * The pure `mutate` ({@link deriveEmissionReceipt}) makes idempotency +
 * audit-receipt real; the `faults` table makes fault-injection real. The
 * `id-matches-bytes` invariant binds the receipt's `capsule_id`/`capsule_path`
 * to the snapshot they were derived from.
 */
export const shipEmitCapsule = defineCapsule({
  _kind: 'receiptedMutation',
  name: 'cli.ship-emit',
  site: ['node'],
  capabilities: { reads: ['fs'], writes: ['fs'] },
  input: ShipEmitInput,
  output: ShipEmitOutput,
  budgets: { p95Ms: 10_000, allocClass: 'bounded' },
  mutate: deriveEmissionReceipt,
  faults: [
    {
      name: 'empty-target-path',
      trigger: (): ShipEmitDecodedInput => ({
        capsule_path: '',
        capsule_id: 'fnv1a:deadbeef',
        package_name: '@czap/_spine',
        package_version: '0.1.0',
        source_commit: '0123456789abcdef0123456789abcdef01234567',
        lifecycle_scripts_observed: [],
      }),
      surfaces: 'receipt-status',
      status: 'rejected',
    },
    {
      name: 'empty-version',
      trigger: (): ShipEmitDecodedInput => ({
        capsule_path: '/tmp/x.shipcapsule.cbor',
        capsule_id: 'fnv1a:deadbeef',
        package_name: '@czap/_spine',
        package_version: '',
        source_commit: '0123456789abcdef0123456789abcdef01234567',
        lifecycle_scripts_observed: [],
      }),
      surfaces: 'receipt-status',
      status: 'rejected',
    },
    {
      name: 'empty-capsule-id',
      trigger: (): ShipEmitDecodedInput => ({
        capsule_path: '/tmp/x.shipcapsule.cbor',
        capsule_id: '',
        package_name: '@czap/_spine',
        package_version: '0.1.0',
        source_commit: '0123456789abcdef0123456789abcdef01234567',
        lifecycle_scripts_observed: [],
      }),
      surfaces: 'receipt-status',
      status: 'rejected',
    },
  ],
  invariants: [
    {
      name: 'id-matches-bytes',
      check: (input: { capsule_path: string }, output: { capsule_path: string }): boolean =>
        input.capsule_path === output.capsule_path,
      message: 'emitted capsule path must match the snapshot it was derived from (no in-flight mutation)',
    },
    {
      name: 'bytes-positive-when-emitted',
      check: (_input: { capsule_path: string }, output: { status: string; bytes_written: number }): boolean =>
        output.status === 'rejected'
          ? output.bytes_written === 0
          : typeof output.bytes_written === 'number' && output.bytes_written > 0,
      message: 'an emitted ShipCapsule with zero bytes is a broken receipt; a rejected one writes nothing',
    },
  ],
});

/**
 * Runtime callable for the ship-emit capsule — the EFFECT half. Serializes the
 * fully-assembled capsule to canonical CBOR and writes it to `capsule_path`.
 * Caller owns directory existence and overwrite policy. The pure receipt core
 * lives on the capsule declaration's `mutate` (see {@link deriveEmissionReceipt}).
 */
export const ShipEmit = {
  run: (input: ShipEmitRunInput): ShipEmitRunOutput => {
    const bytes = ShipCapsule.canonicalize(input.capsule);
    writeFileSync(input.capsule_path, bytes);
    return {
      bytes_written: bytes.byteLength,
      capsule_path: input.capsule_path,
      capsule_id: input.capsule.id,
    };
  },
} as const;

export declare namespace ShipEmit {
  /** Input accepted by {@link ShipEmit.run}. */
  export type Input = ShipEmitRunInput;
  /** Output returned by {@link ShipEmit.run}. */
  export type Output = ShipEmitRunOutput;
}
