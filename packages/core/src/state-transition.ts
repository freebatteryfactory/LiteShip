/**
 * DiscreteStateTransition — the typed, attestation-checked authority record for a
 * discrete state crossing (#133). It REPLACES the dead-wrong
 * `discreteSignalPayloadsFromPatch`, which derived a runtime state VALUE from a
 * {@link SignalNode}'s content-address / axis. That was a category error: a
 * signal node's identity is not the runtime value the cell crossed to.
 *
 * A transition is a VALUE, never a closure: the crossing's next-state value
 * arrives IN the receipt payload (`next`/`generation`), minted by the authority
 * — nothing infers a value from patch ops. It reuses the ONE hash law
 * ({@link TypedRef.create} → {@link Receipt.createEnvelope} → sha256; Law 4),
 * mirroring {@link GraphPatch.receipt} byte-for-byte, so there is no second
 * hashing path. The subject law binds a receipt to exactly one `(base, cell)`
 * pair, so a receipt minted for `base#cellA` cannot be replayed against `cellB`
 * or another graph.
 *
 * Because a {@link DiscreteStateTransition} carries `kind: 'discrete'` BY
 * CONSTRUCTION and is only produced by the authority mint, there is no function
 * that turns a continuous cell / raw {@link SignalNode} into one — so "widen the
 * SSE replay payload with a signal" is UNCOMPILABLE (Law 16). See the
 * `@ts-expect-error` compile fixture in `state-transition.test.ts`.
 *
 * @module
 */

import { ParseError } from '@liteship/error';
import type { ContentAddress, HLC, StateName } from './brands.js';
import { Receipt, type ReceiptEnvelope } from './receipt.js';
import { TypedRef } from './typed-ref.js';
import { HLC as HLCOps } from './hlc.js';
import type { StateAuthority, StateCell, StateCellStoreShape } from './state-cell.js';

/**
 * A typed authority record for a single discrete state crossing. The
 * next-state VALUE lives in `next`/`generation` (minted by the authority), never
 * inferred from a graph node's content-address. `base`/`resultId` carry the
 * graph identity the crossing occurred against (and the recast result, when the
 * crossing recast the graph), so a composed chain can filter to the adopted
 * branch. `kind: 'discrete'` is the literal that makes the replay input
 * unrepresentable for continuous transients (Law 16).
 */
export interface DiscreteStateTransition {
  readonly _tag: 'DiscreteStateTransition';
  readonly _version: 1;
  /** StateCellStore authority key (the cell name). */
  readonly cell: string;
  /** Prior state when known (undefined at genesis). */
  readonly previous?: StateName;
  /** Value-bearing next state — the crossing target. */
  readonly next: StateName;
  /** Monotonic per-cell generation ({@link StateCell.generation}). */
  readonly generation: number;
  /** Reuse the existing authority union. */
  readonly authority: StateAuthority;
  /** Graph identity the crossing occurred against. */
  readonly base: ContentAddress;
  /** Graph id after recast, when the crossing recast the graph. */
  readonly resultId?: ContentAddress;
  /** Literal — the uncompilable-seam anchor. */
  readonly kind: 'discrete';
}

/**
 * The ONE `_version` this build's {@link DiscreteStateTransition} reader
 * understands. A transition stamped with a different `_version` is rejected
 * fail-closed by {@link decodeDiscreteStateTransition}.
 */
export const SUPPORTED_TRANSITION_VERSION = 1 as const;

/**
 * The receipt subject id for a transition — `${base}#${cell}`. The SINGLE source
 * of the subject law (Law 6): both the mint ({@link transitionReceipt}) and the
 * client-side attestation-check (`recordStreamPatchReceipt`) derive the expected
 * subject from HERE, so a receipt for `(base, cellA)` can never be replayed
 * against `cellB` or another graph.
 */
export function discreteTransitionSubjectId(transition: Pick<DiscreteStateTransition, 'base' | 'cell'>): string {
  return `${transition.base}#${transition.cell}`;
}

/**
 * The receipt PAYLOAD ref for a transition — a {@link TypedRef} over the crossing VALUE
 * (`cell`/`previous`/`next`/`generation`/`authority`/`base`/`resultId`/`kind`). The SINGLE
 * source of the payload law (Law 6): both the mint ({@link transitionReceipt}) AND the
 * client-side attestation-check (`recordStreamPatchReceipt`) derive the payload from HERE.
 * The subject law binds a receipt to a `(base, cell)` pair; THIS binds it to the exact
 * value, so a self-consistent receipt cannot be re-paired with a DIFFERENT `next`/
 * `generation`/`resultId` on the same subject.
 */
export function discreteTransitionPayload(transition: DiscreteStateTransition): Promise<TypedRef.Shape> {
  return TypedRef.create('DiscreteStateTransition@1', {
    cell: transition.cell,
    previous: transition.previous,
    next: transition.next,
    generation: transition.generation,
    authority: transition.authority,
    base: transition.base,
    resultId: transition.resultId,
    kind: transition.kind,
  });
}

/**
 * Mint a receipt for a {@link DiscreteStateTransition}, mirroring
 * {@link GraphPatch.receipt} byte-for-byte: a single genesis-or-linked envelope
 * whose payload is a {@link TypedRef} over the transition, subject-keyed by the
 * `(base, cell)` law. Async (`Promise`-returning) because the receipt byte law
 * hashes via `crypto.subtle` (SHA-256) — the same async kernel
 * `Receipt.createEnvelope` rides on; folding it to a sync value would force a
 * second, divergent hashing path (Law 4). `timestamp`/`previous` default to a
 * genesis stamp; pass them to chain this transition onto a prior receipt.
 */
export async function transitionReceipt(
  transition: DiscreteStateTransition,
  options?: { readonly timestamp?: HLC; readonly previous?: string | readonly string[] },
): Promise<ReceiptEnvelope> {
  const timestamp = options?.timestamp ?? HLCOps.create('discrete-transition');
  const previous = options?.previous ?? Receipt.GENESIS;
  const payload = await discreteTransitionPayload(transition);
  return Receipt.createEnvelope(
    'discrete-transition',
    { type: 'effect', id: discreteTransitionSubjectId(transition) },
    payload,
    timestamp,
    previous,
  );
}

/**
 * Companion mint the authority host calls AFTER a synchronous
 * {@link StateCellStoreShape.applyDiscrete} — builds the transition VALUE from
 * the crossing's `previous`/`next` cells plus the graph identity, then mints its
 * receipt via {@link transitionReceipt}. Kept separate so `applyDiscrete` stays
 * synchronous (no crypto in the hot path).
 */
export async function mintTransition(
  previous: StateCell | undefined,
  next: StateCell,
  options: {
    readonly base: ContentAddress;
    readonly resultId?: ContentAddress;
    readonly previousHash?: string | readonly string[];
    readonly timestamp?: HLC;
  },
): Promise<{ readonly transition: DiscreteStateTransition; readonly receipt: ReceiptEnvelope }> {
  const transition: DiscreteStateTransition = {
    _tag: 'DiscreteStateTransition',
    _version: 1,
    cell: next.name,
    ...(previous !== undefined ? { previous: previous.state } : {}),
    next: next.state,
    generation: next.generation,
    authority: next.authority,
    base: options.base,
    ...(options.resultId !== undefined ? { resultId: options.resultId } : {}),
    kind: 'discrete',
  };
  const receipt = await transitionReceipt(transition, {
    ...(options.timestamp !== undefined ? { timestamp: options.timestamp } : {}),
    ...(options.previousHash !== undefined ? { previous: options.previousHash } : {}),
  });
  return { transition, receipt };
}

/**
 * VERSION-AWARE, FAIL-CLOSED reader for an UNTRUSTED transition value (lowered
 * from an SSE frame / persisted JSON). Mirrors {@link GraphPatch.decode}: gates
 * `_tag`/`_version`/`kind` and rejects with ONE canonical tagged {@link ParseError}
 * — never silently misparsed. Scope is intentionally the tag/version/kind
 * ENVELOPE (the receipt hash + subject law are checked by the attestation seam).
 *
 * @throws `ParseError` (`source: 'DiscreteStateTransition'`) when the value is
 *   not a record, carries the wrong `_tag`, an unsupported `_version`, or a
 *   `kind` other than `'discrete'`.
 */
export function decodeDiscreteStateTransition(value: unknown): DiscreteStateTransition {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw ParseError('DiscreteStateTransition', `expected an object, got ${value === null ? 'null' : typeof value}`, {
      code: 'not_an_object',
    });
  }
  const record = value as Record<string, unknown>;
  if (record._tag !== 'DiscreteStateTransition') {
    throw ParseError(
      'DiscreteStateTransition',
      `expected _tag "DiscreteStateTransition", got ${JSON.stringify(record._tag)}`,
      { code: 'wrong_tag' },
    );
  }
  if (record._version !== SUPPORTED_TRANSITION_VERSION) {
    throw ParseError(
      'DiscreteStateTransition',
      `unsupported _version ${JSON.stringify(record._version)} — this build understands _version ${SUPPORTED_TRANSITION_VERSION} only`,
      { code: 'unsupported_version' },
    );
  }
  if (record.kind !== 'discrete') {
    throw ParseError('DiscreteStateTransition', `expected kind "discrete", got ${JSON.stringify(record.kind)}`, {
      code: 'wrong_kind',
    });
  }
  if (typeof record.cell !== 'string' || typeof record.next !== 'string' || typeof record.generation !== 'number') {
    throw ParseError('DiscreteStateTransition', 'missing required cell/next/generation fields', {
      code: 'malformed',
    });
  }
  return value as DiscreteStateTransition;
}

/**
 * Apply a validated {@link DiscreteStateTransition} to a cell store. The typed
 * parameter is the uncompilable seam (Law 16): a `StateCell & { kind: 'continuous' }`
 * or a raw {@link SignalNode} is NOT a `DiscreteStateTransition`, so it cannot be
 * passed here — the wrong call does not compile. The store's generation-rollback
 * guard makes a stale/duplicate transition a byte-identical no-op (Law 15).
 */
export function applyTransition(cellStore: StateCellStoreShape, transition: DiscreteStateTransition): StateCell {
  return cellStore.hydrateDiscrete(transition.cell, transition.next, transition.generation, transition.authority);
}
