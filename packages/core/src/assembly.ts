/**
 * Assembly catalog — 7-arm closed vocabulary of capsule kinds.
 * `defineCapsule` validates a contract, computes its content address,
 * and registers it in the module-level catalog for the compiler to walk.
 *
 * @module
 */

import type { CapsuleContract, AssemblyKind } from './capsule.js';
import type { ContentAddress } from './brands.js';
import { fnv1aBytes } from './fnv.js';
import { CanonicalCbor } from './cbor.js';
import { Diagnostics } from './diagnostics.js';

/** A capsule declaration plus its content-addressed id. */
export interface CapsuleDef<K extends AssemblyKind, In, Out, R> extends CapsuleContract<K, In, Out, R> {
  readonly id: ContentAddress;
}

const catalog: CapsuleDef<AssemblyKind, unknown, unknown, unknown>[] = [];

function computeId(contract: Omit<CapsuleContract<AssemblyKind, unknown, unknown, unknown>, 'id'>): ContentAddress {
  // ADR-0003: route through CanonicalCbor to obtain a deterministic byte
  // sequence (RFC 8949 §4.2.1) before hashing. Stable across key order,
  // platform endianness, and stringification quirks.
  const canonicalBytes = CanonicalCbor.encode({
    kind: contract._kind,
    name: contract.name,
    site: contract.site,
    budgets: contract.budgets,
    capabilities: contract.capabilities,
    invariantNames: contract.invariants.map((i) => i.name),
  });
  return fnv1aBytes(canonicalBytes);
}

/**
 * Declare a capsule. Validates shape, computes content address,
 * registers in the module-level catalog, returns a typed def.
 * No runtime behavior beyond registration — behavior comes from
 * the harness/compiler walking the catalog.
 */
export function defineCapsule<K extends AssemblyKind, In, Out, R>(
  decl: Omit<CapsuleContract<K, In, Out, R>, 'id'>,
): CapsuleDef<K, In, Out, R> {
  // For pureTransform capsules: omitting `run` downgrades the generated
  // harness test to `it.skip` (Task 8 honest-skip discipline). Warn so
  // contributors notice rather than silently skip property tests.
  // Other arms don't yet have a wired runtime channel — see ADR-TODO.
  if (decl._kind === 'pureTransform' && decl.invariants.length > 0 && decl.run === undefined) {
    Diagnostics.warn({
      source: 'defineCapsule',
      code: 'pure_transform_missing_run',
      message:
        `pureTransform capsule "${decl.name}" declares ${decl.invariants.length} invariant(s) but no ` +
        '`run` function — invariants are type-only without one. Add `run: (input) => ...` to enable runtime validation against your invariants.',
    });
  }
  // receiptedMutation discriminated requirement (ADR-0011 amendment): a
  // receipted mutation MUST EITHER expose a pure `mutate` core (driving real
  // idempotency / audit / fault-injection tests) OR explicitly declare a typed
  // `receiptKind: 'effect-outcome'` exemption WITH a non-empty `reason`. Having
  // NEITHER is illegal — the absence of a pure core must be a declared,
  // justified choice (a waiver with teeth), never a silent gate-on-absence that
  // ships idempotency/audit/fault as quietly non-emitted. Pre-1.0: no compat
  // shim — this throws at declaration time.
  if (decl._kind === 'receiptedMutation') {
    const hasMutate = typeof decl.mutate === 'function';
    const exemptsAsEffect = decl.receiptKind === 'effect-outcome';
    const hasReason = typeof decl.reason === 'string' && decl.reason.trim().length > 0;
    if (!hasMutate && !exemptsAsEffect) {
      throw new Error(
        `receiptedMutation capsule "${decl.name}" declares neither a pure \`mutate\` core nor a ` +
          `\`receiptKind: 'effect-outcome'\` exemption. A receipted mutation must EITHER expose a ` +
          `pure receipt-producing \`mutate(input) => receipt\` (so idempotency + audit-receipt + ` +
          `fault-injection are real, provable tests) OR explicitly declare ` +
          `\`receiptKind: 'effect-outcome', reason: '...'\` when its receipt is fundamentally the ` +
          `outcome of an effect that cannot be driven purely. Silent absence is not allowed.`,
      );
    }
    if (exemptsAsEffect && !hasReason) {
      throw new Error(
        `receiptedMutation capsule "${decl.name}" declares \`receiptKind: 'effect-outcome'\` without ` +
          `a non-empty \`reason\`. The exemption must be justified in prose — it is recorded in the ` +
          `generated test file and the capsule manifest as a tracked, visible waiver, not a silent gate.`,
      );
    }
    if (exemptsAsEffect && hasMutate) {
      throw new Error(
        `receiptedMutation capsule "${decl.name}" declares BOTH a \`mutate\` core and a ` +
          `\`receiptKind: 'effect-outcome'\` exemption. These are mutually exclusive: a capsule with a ` +
          `pure core needs no exemption. Drop the exemption (the pure core drives the real checks).`,
      );
    }
  }

  const id = computeId(decl as Omit<CapsuleContract<AssemblyKind, unknown, unknown, unknown>, 'id'>);
  const def = { ...decl, id } as CapsuleDef<K, In, Out, R>;
  catalog.push(def as CapsuleDef<AssemblyKind, unknown, unknown, unknown>);
  return def;
}

/** Read-only snapshot of all registered capsules. */
export function getCapsuleCatalog(): readonly CapsuleDef<AssemblyKind, unknown, unknown, unknown>[] {
  return catalog.slice();
}

/** Clear the registry. Intended for tests and hot-reload only. */
export function resetCapsuleCatalog(): void {
  catalog.length = 0;
}
