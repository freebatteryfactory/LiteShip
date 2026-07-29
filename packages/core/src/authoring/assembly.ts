/**
 * Assembly declarations — 7-arm closed vocabulary of capsule kinds.
 * `defineCapsule` validates and snapshots one declaration; catalog composition
 * is explicit, immutable, and independent of module-evaluation order.
 *
 * @module
 */

import { InvariantViolationError } from '@liteship/error';
import type { CapsuleContract, AssemblyKind } from './capsule.js';
import type { ContentAddress } from '../schema/brands.js';
import type { SchemaPort } from '../schema/schema-port.js';
import type { Infer } from '../schema/infer.js';
import { fnv1aBytes } from '../evidence/fnv.js';
import { CanonicalCbor } from '../schema/cbor.js';
import { Diagnostics } from '../evidence/diagnostics.js';
import { snapshotDefinitionValue } from '../evidence/definition-snapshot.js';

/** A capsule declaration plus its content-addressed id. */
export interface CapsuleDef<K extends AssemblyKind, In, Out, R> extends CapsuleContract<K, In, Out, R> {
  readonly id: ContentAddress;
}

/** An immutable, deterministically ordered set of capsule declarations. */
export type CapsuleCatalog = readonly CapsuleDef<AssemblyKind, unknown, unknown, unknown>[];

/**
 * The {@link defineCapsule} argument, generic over the schema VALUE types
 * `InS`/`OutS` rather than the decoded `In`/`Out`. In/Out are DERIVED via
 * `Infer<InS>`/`Infer<OutS>`, so every handler slot (`run`/`step`/`derive`/
 * `mutate`/`decide`), each {@link CapsuleContract.invariants} entry, and each
 * `faults[].trigger` are contextually typed off the schema the author passes —
 * no `(o as T)` cast, no hand-written `Type` alias.
 *
 * The constraint is the STRUCTURAL {@link SchemaPort}, so a kernel schema value,
 * an effect `Schema` value, and a `DeclarationSchema` are all accepted, and
 * `Infer` reads the decoded type off any of them by reading its phantom `Type`.
 * `input`/`output` keep the concrete `InS`/`OutS` types (the inference sources);
 * everything else is the resolved `CapsuleContract` over `Infer<InS>`/`Infer<OutS>`.
 */
export type CapsuleDecl<
  K extends AssemblyKind,
  InS extends SchemaPort<unknown, unknown>,
  OutS extends SchemaPort<unknown, unknown>,
  R,
> = Omit<CapsuleContract<K, Infer<InS>, Infer<OutS>, R>, 'id' | 'input' | 'output'> & {
  readonly input: InS;
  readonly output: OutS;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function snapshotDecl<
  K extends AssemblyKind,
  InS extends SchemaPort<unknown, unknown>,
  OutS extends SchemaPort<unknown, unknown>,
  R,
>(decl: CapsuleDecl<K, InS, OutS, R>): CapsuleDecl<K, InS, OutS, R> {
  const capabilities = Object.freeze({
    reads: Object.freeze([...decl.capabilities.reads]),
    writes: Object.freeze([...decl.capabilities.writes]),
    ...(decl.capabilities.effects === undefined ? {} : { effects: Object.freeze([...decl.capabilities.effects]) }),
  });
  const invariants = Object.freeze(
    decl.invariants.map((invariant) =>
      Object.freeze({ name: invariant.name, check: invariant.check, message: invariant.message }),
    ),
  );
  const faults =
    decl.faults === undefined
      ? undefined
      : Object.freeze(
          decl.faults.map((fault) =>
            Object.freeze({
              name: fault.name,
              trigger: fault.trigger,
              surfaces: fault.surfaces,
              ...(fault.status === undefined ? {} : { status: fault.status }),
            }),
          ),
        );
  const attribution =
    decl.attribution === undefined
      ? undefined
      : Object.freeze({
          license: decl.attribution.license,
          author: decl.attribution.author,
          ...(decl.attribution.url === undefined ? {} : { url: decl.attribution.url }),
        });
  const initialState = decl.initialState === undefined ? undefined : snapshotDefinitionValue(decl.initialState);

  return Object.freeze({
    ...decl,
    capabilities,
    invariants,
    budgets: snapshotDefinitionValue(decl.budgets),
    site: Object.freeze([...decl.site]),
    ...(faults === undefined ? {} : { faults }),
    ...(attribution === undefined ? {} : { attribution }),
    ...(initialState === undefined ? {} : { initialState }),
  }) as CapsuleDecl<K, InS, OutS, R>;
}

function validateReceiptedMutationFaults(
  name: string,
  hasMutate: boolean,
  faults: unknown,
): asserts faults is readonly unknown[] | undefined {
  if (faults === undefined) return;
  if (!Array.isArray(faults)) {
    throw InvariantViolationError(
      'assembly.contract',
      `receiptedMutation capsule "${name}" declares malformed \`faults\`: expected an array.`,
    );
  }
  if (faults.length > 0 && !hasMutate) {
    throw InvariantViolationError(
      'assembly.contract',
      `receiptedMutation capsule "${name}" declares faults but exposes no pure \`mutate\` core. ` +
        `Fault injection can only be proven against the pure mutation channel; either add \`mutate\` ` +
        `or remove the fault declarations.`,
    );
  }
  for (let i = 0; i < faults.length; i++) {
    const fault = faults[i];
    if (!isRecord(fault)) {
      throw InvariantViolationError(
        'assembly.contract',
        `receiptedMutation capsule "${name}" declares malformed fault #${i}: expected an object.`,
      );
    }
    if (typeof fault.name !== 'string' || fault.name.trim().length === 0) {
      throw InvariantViolationError(
        'assembly.contract',
        `receiptedMutation capsule "${name}" declares malformed fault #${i}: \`name\` must be non-empty.`,
      );
    }
    if (typeof fault.trigger !== 'function') {
      throw InvariantViolationError(
        'assembly.contract',
        `receiptedMutation capsule "${name}" declares malformed fault "${fault.name}": \`trigger\` must be a function.`,
      );
    }
    if (fault.surfaces !== 'throws' && fault.surfaces !== 'receipt-status') {
      throw InvariantViolationError(
        'assembly.contract',
        `receiptedMutation capsule "${name}" declares malformed fault "${fault.name}": ` +
          `\`surfaces\` must be 'throws' or 'receipt-status'.`,
      );
    }
    if (fault.surfaces === 'receipt-status' && (typeof fault.status !== 'string' || fault.status.trim().length === 0)) {
      throw InvariantViolationError(
        'assembly.contract',
        `receiptedMutation capsule "${name}" declares malformed fault "${fault.name}": ` +
          `receipt-status faults require a non-empty \`status\`.`,
      );
    }
  }
}

function computeId(contract: Omit<CapsuleContract<AssemblyKind, unknown, unknown, unknown>, 'id'>): ContentAddress {
  // Route through CanonicalCbor to obtain a deterministic byte
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
 * Declare a capsule. Validates shape, snapshots retained authored data, and
 * computes its content address. This function is pure: importing a capsule
 * module never mutates process-global state.
 */
export function defineCapsule<
  K extends AssemblyKind,
  InS extends SchemaPort<unknown, unknown>,
  OutS extends SchemaPort<unknown, unknown>,
  R,
>(decl: CapsuleDecl<K, InS, OutS, R>): CapsuleDef<K, Infer<InS>, Infer<OutS>, R> {
  // For pureTransform capsules: omitting `run` leaves the declared invariants
  // type-only (no runtime validation). The generated harness still emits a REAL
  // test — never an `it.skip` (no-skip discipline) — so warn here, otherwise a
  // contributor could assume the invariants are enforced when they aren't.
  if (decl._kind === 'pureTransform' && decl.invariants.length > 0 && decl.run === undefined) {
    Diagnostics.warnRegistered({
      source: 'defineCapsule',
      code: 'core/assembly/pure_transform_missing_run',
      message:
        `pureTransform capsule "${decl.name}" declares ${decl.invariants.length} invariant(s) but no ` +
        '`run` function — invariants are type-only without one. Add `run: (input) => ...` to enable runtime validation against your invariants.',
    });
  }
  // receiptedMutation discriminated requirement: a
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
    validateReceiptedMutationFaults(decl.name, hasMutate, decl.faults);
    if (!hasMutate && !exemptsAsEffect) {
      throw InvariantViolationError(
        'assembly.contract',
        `receiptedMutation capsule "${decl.name}" declares neither a pure \`mutate\` core nor a ` +
          `\`receiptKind: 'effect-outcome'\` exemption. A receipted mutation must EITHER expose a ` +
          `pure receipt-producing \`mutate(input) => receipt\` (so idempotency + audit-receipt + ` +
          `fault-injection are real, provable tests) OR explicitly declare ` +
          `\`receiptKind: 'effect-outcome', reason: '...'\` when its receipt is fundamentally the ` +
          `outcome of an effect that cannot be driven purely. Silent absence is not allowed.`,
      );
    }
    if (exemptsAsEffect && !hasReason) {
      throw InvariantViolationError(
        'assembly.contract',
        `receiptedMutation capsule "${decl.name}" declares \`receiptKind: 'effect-outcome'\` without ` +
          `a non-empty \`reason\`. The exemption must be justified in prose — it is recorded in the ` +
          `generated test file and the capsule manifest as a tracked, visible waiver, not a silent gate.`,
      );
    }
    if (exemptsAsEffect && hasMutate) {
      throw InvariantViolationError(
        'assembly.contract',
        `receiptedMutation capsule "${decl.name}" declares BOTH a \`mutate\` core and a ` +
          `\`receiptKind: 'effect-outcome'\` exemption. These are mutually exclusive: a capsule with a ` +
          `pure core needs no exemption. Drop the exemption (the pure core drives the real checks).`,
      );
    }
  }

  // policyGate mandatory-`decide` requirement: a policyGate
  // is a permission/authz check — its whole job is to resolve a verdict against a
  // subject. A policyGate with NO `decide` core has no decision to drive, so the
  // allow/deny coverage, reason-chain integrity, and determinism checks would have
  // nothing to invoke. Per the harness law (emit a REAL test or FAIL LOUD), this is
  // illegal at declaration time — exactly as a receiptedMutation must EITHER expose
  // a pure `mutate` core OR declare a typed exemption. There is no `policyGate`
  // exemption: a gate that cannot decide is not a gate. Pre-1.0: this throws.
  if (decl._kind === 'policyGate' && typeof decl.decide !== 'function') {
    throw InvariantViolationError(
      'assembly.contract',
      `policyGate capsule "${decl.name}" declares no \`decide\` core. A policyGate is a permission/authz ` +
        `check: it MUST expose a pure \`decide(subject) => { effect, reasons }\` verdict so the harness can ` +
        `drive its allow/deny coverage, reason-chain integrity, and determinism for real. A gate that cannot ` +
        `decide is not a gate — add a \`decide\` handler (or remove the capsule). Silent absence is not allowed.`,
    );
  }

  const snapped = snapshotDecl(decl);
  const id = computeId(snapped as Omit<CapsuleContract<AssemblyKind, unknown, unknown, unknown>, 'id'>);
  return Object.freeze({ ...snapped, id }) as CapsuleDef<K, Infer<InS>, Infer<OutS>, R>;
}

/**
 * Compose capsule declarations explicitly. The returned catalog is sorted by
 * name then id, so import/discovery order cannot affect generated projections.
 * Duplicate names or identities are refused rather than silently shadowed.
 */
export function defineCapsuleCatalog(capsules: CapsuleCatalog): CapsuleCatalog {
  const byName = new Set<string>();
  const byId = new Set<ContentAddress>();
  const ordered = [...capsules].sort((left, right) =>
    left.name === right.name ? left.id.localeCompare(right.id) : left.name.localeCompare(right.name),
  );

  for (const capsule of ordered) {
    if (byName.has(capsule.name)) {
      throw InvariantViolationError(
        'assembly.catalog',
        `duplicate capsule name "${capsule.name}" — a catalog cannot choose between two declarations.`,
      );
    }
    if (byId.has(capsule.id)) {
      throw InvariantViolationError(
        'assembly.catalog',
        `duplicate capsule identity "${capsule.id}" — a catalog cannot contain the same declaration twice.`,
      );
    }
    byName.add(capsule.name);
    byId.add(capsule.id);
  }

  return Object.freeze(ordered);
}
