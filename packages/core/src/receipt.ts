/**
 * Receipt -- chain validation and envelope construction.
 *
 * Salvaged from `@kit/core`.
 *
 * @module
 */

import { Effect } from 'effect';
import { ParseError } from '@czap/error';
import type { HLC } from './brands.js';
import { TypedRef as TypedRefModule, type TypedRef } from './typed-ref.js';
import { HLC as HLCOps } from './hlc.js';

/** The logical entity a receipt describes: an effect, a run, an artifact, or an intent. */
export interface ReceiptSubject {
  readonly type: 'effect' | 'run' | 'artifact' | 'intent';
  readonly id: string;
}

/**
 * Single link in a receipt chain: timestamped, content-addressed, and linked
 * to its predecessor(s). Merge envelopes carry an array of `previous` hashes;
 * optionally MAC-signed via `Receipt.macEnvelope`.
 */
export interface ReceiptEnvelope {
  readonly kind: string;
  /**
   * Causal clock (CUT B2): an {@link HLC}, NOT a wall-clock string. It is
   * INCLUDED in `hashEnvelope` and monotonic-validated by `validateChain`
   * (`hlc_not_increasing`) — i.e. identity- and ordering-bearing. Not
   * interchangeable with a `WallClockTimestamp` (the volatile, identity-irrelevant
   * ISO stamp on command/CLI receipts).
   */
  readonly timestamp: HLC;
  readonly subject: ReceiptSubject;
  readonly payload: TypedRef.Shape;
  readonly hash: string;
  readonly previous: string | readonly string[];
  readonly signature?: string;
}

/** Structured failure returned by `Receipt.validateChainDetailed`. */
export type ChainValidationError =
  | { readonly type: 'not_genesis'; readonly index: 0 }
  | { readonly type: 'hash_mismatch'; readonly index: number; readonly computed: string; readonly stored: string }
  | { readonly type: 'chain_break'; readonly index: number; readonly expected: string; readonly actual: string }
  | { readonly type: 'hlc_not_increasing'; readonly index: number }
  | { readonly type: 'checkpoint_invalid'; readonly reason: string };

/**
 * Options that let a chain be validated as a COMPACTED TAIL instead of a full
 * history (see `DAG.checkpoint`). Optional everywhere — omitting them is the
 * back-compat genesis-rooted check.
 *
 * - `base`: a checkpoint watermark hash. The index-0 genesis predicate widens to
 *   accept `previous === base`, so a retained tail validates without its dropped
 *   prefix.
 * - `checkpoint`: the genesis-shaped checkpoint attestation that authorizes
 *   `base`. When supplied it is integrity-checked (hash + genesis shape +
 *   `subject.id === "czap/checkpoint:<base>"`); a mismatch fails `checkpoint_invalid`.
 */
export interface ChainValidationOptions {
  readonly base?: string;
  readonly checkpoint?: ReceiptEnvelope;
}

/** Sentinel `previous` value marking the root of a receipt chain. */
export const GENESIS: string = 'genesis';

/**
 * Compute the content hash of a receipt envelope.
 *
 * Normalizes the `previous` field (sorts array form), canonicalizes the
 * payload, and hashes with SHA-256 via TypedRef.
 *
 * @example
 * ```ts
 * import { Effect } from 'effect';
 *
 * const hash = yield* Receipt.hashEnvelope(envelope);
 * // hash === envelope.hash (if envelope is valid)
 * ```
 */
export const hashEnvelope = (envelope: ReceiptEnvelope): Effect.Effect<string> => {
  const previousNormalized = Array.isArray(envelope.previous)
    ? [...(envelope.previous as readonly string[])].sort()
    : envelope.previous;
  const hashInput = TypedRefModule.canonicalize({
    kind: envelope.kind,
    timestamp: envelope.timestamp,
    subject: envelope.subject,
    payload: envelope.payload,
    previous: previousNormalized,
  });
  return TypedRefModule.hash(hashInput);
};

/**
 * Create a new receipt envelope with an auto-computed content hash.
 *
 * @example
 * ```ts
 * const envelope = yield* Receipt.createEnvelope(
 *   'state-change',
 *   { type: 'effect', id: 'actor-1' },
 *   { _tag: 'TypedRef', mediaType: 'application/json', data: { key: 'value' } },
 *   hlcTimestamp,
 *   Receipt.GENESIS,
 * );
 * // envelope.hash is the computed SHA-256 content address
 * ```
 */
export const createEnvelope = (
  kind: string,
  subject: ReceiptSubject,
  payload: TypedRef.Shape,
  timestamp: HLC,
  previousHash: string | readonly string[],
): Effect.Effect<ReceiptEnvelope> =>
  Effect.gen(function* () {
    const previousNormalized = Array.isArray(previousHash)
      ? [...(previousHash as readonly string[])].sort()
      : previousHash;
    const partial = { kind, timestamp, subject, payload, previous: previousNormalized };
    const h = yield* TypedRefModule.hash(TypedRefModule.canonicalize(partial));
    return { kind, timestamp, subject, payload, hash: h, previous: previousNormalized };
  });

/**
 * Build a linear chain of receipt envelopes from an array of entries.
 *
 * Each envelope's `previous` points to the prior envelope's hash,
 * starting from GENESIS.
 *
 * @example
 * ```ts
 * const chain = yield* Receipt.buildChain([
 *   { kind: 'init', subject: { type: 'effect', id: 'a' }, payload, timestamp: ts1 },
 *   { kind: 'update', subject: { type: 'effect', id: 'a' }, payload, timestamp: ts2 },
 * ]);
 * // chain.length === 2
 * // chain[1].previous === chain[0].hash
 * ```
 */
export const buildChain = (
  entries: ReadonlyArray<{
    kind: string;
    subject: ReceiptSubject;
    payload: TypedRef.Shape;
    timestamp: HLC;
  }>,
): Effect.Effect<ReceiptEnvelope[]> =>
  Effect.gen(function* () {
    const chain: ReceiptEnvelope[] = [];
    let previousHash = GENESIS;
    for (const entry of entries) {
      const envelope = yield* createEnvelope(entry.kind, entry.subject, entry.payload, entry.timestamp, previousHash);
      chain.push(envelope);
      previousHash = envelope.hash;
    }
    return chain;
  });

/**
 * Validate a receipt chain: genesis link, hash integrity, chain continuity, HLC ordering.
 *
 * The ergonomic everyday check: resolves only to `true` and signals every
 * violation through the `Error` channel with a human-readable message.
 *
 * @example
 * ```ts
 * const chain = yield* Receipt.buildChain(entries);
 * const valid = yield* Receipt.validateChain(chain);
 * // valid === true
 * ```
 *
 * @see validateChainDetailed for typed `ChainValidationError` handling.
 */
export const validateChain = (
  chain: ReadonlyArray<ReceiptEnvelope>,
  options?: ChainValidationOptions,
): Effect.Effect<boolean, Error> =>
  validateChainDetailed(chain, options).pipe(Effect.mapError((error) => new Error(formatChainError(error, chain))));

/**
 * Render a {@link ChainValidationError} as the human-readable message
 * {@link validateChain} promises: what broke, on which envelope, with the
 * offending values and the literal next step.
 */
const formatChainError = (error: ChainValidationError, chain: ReadonlyArray<ReceiptEnvelope>): string => {
  switch (error.type) {
    case 'not_genesis': {
      const got = chain[0]?.previous;
      const gotText = Array.isArray(got) ? `[${got.join(', ')}]` : String(got);
      return (
        `Envelope 0: previous="${gotText}" but a chain must start at previous="${GENESIS}". ` +
        'If you sliced a longer chain, validate from index 0 of the original, or build the chain from Receipt.GENESIS.'
      );
    }
    case 'hash_mismatch':
      return `Envelope ${error.index}: hash mismatch (expected "${error.stored}", computed "${error.computed}")`;
    case 'chain_break':
      return (
        `Envelope ${error.index}: chain break — its previous="${error.actual}" does not equal ` +
        `envelope ${error.index - 1}'s hash "${error.expected}". The chain was reordered, truncated, ` +
        `or an envelope was tampered with; re-fetch the chain from its source or inspect envelope ${error.index}'s previous link.`
      );
    case 'hlc_not_increasing':
      return `Envelope ${error.index}: HLC not monotonically increasing — its timestamp does not advance past envelope ${error.index - 1}'s. Re-issue the envelope with a fresh HLC.increment of the predecessor's timestamp.`;
    case 'checkpoint_invalid':
      return `Checkpoint attestation invalid: ${error.reason}. The compacted tail cannot be trusted against this checkpoint; re-fetch the checkpoint envelope from its source.`;
  }
};

/**
 * Validate a receipt chain with detailed, structured error reporting.
 *
 * The typed taxonomy for programmatic handling: returns `true` on success
 * or fails with a `ChainValidationError` discriminated union
 * (not_genesis | hash_mismatch | chain_break | hlc_not_increasing).
 *
 * @example
 * ```ts
 * import { Effect } from 'effect';
 *
 * const result = yield* Effect.either(Receipt.validateChainDetailed(chain));
 * // result._tag === 'Right' on success
 * // result._tag === 'Left' with .left.type on failure
 * ```
 *
 * @see validateChain for the simple Error-channel form.
 */
export const validateChainDetailed = (
  chain: ReadonlyArray<ReceiptEnvelope>,
  options?: ChainValidationOptions,
): Effect.Effect<true, ChainValidationError> =>
  Effect.gen(function* () {
    if (chain.length === 0) return true as const;

    const base = options?.base;
    const checkpoint = options?.checkpoint;

    // When a checkpoint is supplied, bind it to `base`: verify its content hash,
    // genesis shape, and that its subject commits exactly this watermark. This is
    // what authorizes the widened index-0 predicate below.
    if (checkpoint !== undefined) {
      if (base === undefined) {
        return yield* Effect.fail({
          type: 'checkpoint_invalid' as const,
          reason: 'a checkpoint was supplied without a base watermark to bind it to',
        });
      }
      const computedCheckpointHash = yield* hashEnvelope(checkpoint);
      if (computedCheckpointHash !== checkpoint.hash) {
        return yield* Effect.fail({
          type: 'checkpoint_invalid' as const,
          reason: `checkpoint hash mismatch (expected "${checkpoint.hash}", computed "${computedCheckpointHash}")`,
        });
      }
      if (!isGenesis(checkpoint)) {
        return yield* Effect.fail({
          type: 'checkpoint_invalid' as const,
          reason: 'checkpoint is not genesis-shaped (previous must be GENESIS)',
        });
      }
      const expectedSubjectId = `czap/checkpoint:${base}`;
      if (checkpoint.subject.id !== expectedSubjectId) {
        return yield* Effect.fail({
          type: 'checkpoint_invalid' as const,
          reason: `checkpoint subject "${checkpoint.subject.id}" does not commit base watermark (expected "${expectedSubjectId}")`,
        });
      }
    }

    const first = chain[0]!;
    const firstPrev = first.previous;
    // Index-0 genesis predicate, widened for a compacted tail: a retained tail's
    // first envelope points at the dropped watermark (`base`), not GENESIS.
    const firstIsGenesis =
      firstPrev === GENESIS ||
      (Array.isArray(firstPrev) && (firstPrev as readonly string[]).includes(GENESIS)) ||
      (base !== undefined &&
        (firstPrev === base || (Array.isArray(firstPrev) && (firstPrev as readonly string[]).includes(base))));
    if (!firstIsGenesis) {
      return yield* Effect.fail({ type: 'not_genesis' as const, index: 0 as const });
    }

    for (let i = 0; i < chain.length; i++) {
      const envelope = chain[i]!;
      const isMerge = Array.isArray(envelope.previous);

      const computedHash = yield* hashEnvelope(envelope);
      if (computedHash !== envelope.hash) {
        return yield* Effect.fail({
          type: 'hash_mismatch' as const,
          index: i,
          computed: computedHash,
          stored: envelope.hash,
        });
      }

      if (!isMerge && i > 0 && envelope.previous !== chain[i - 1]!.hash) {
        return yield* Effect.fail({
          type: 'chain_break' as const,
          index: i,
          expected: chain[i - 1]!.hash,
          actual: envelope.previous as string,
        });
      }

      if (!isMerge && i > 0 && HLCOps.compare(chain[i - 1]!.timestamp, envelope.timestamp) >= 0) {
        return yield* Effect.fail({
          type: 'hlc_not_increasing' as const,
          index: i,
        });
      }
    }

    return true as const;
  });

/**
 * Check whether a receipt envelope is a genesis (root) envelope.
 *
 * @example
 * ```ts
 * const chain = yield* Receipt.buildChain(entries);
 * Receipt.isGenesis(chain[0]); // true
 * Receipt.isGenesis(chain[1]); // false
 * ```
 */
export const isGenesis = (receipt: ReceiptEnvelope): boolean =>
  receipt.previous === GENESIS ||
  (Array.isArray(receipt.previous) && (receipt.previous as readonly string[]).includes(GENESIS));

/**
 * Get the last (most recent) envelope in a chain.
 *
 * @example
 * ```ts
 * const latest = Receipt.head(chain);
 * // latest === chain[chain.length - 1]
 * ```
 */
export const head = (chain: ReadonlyArray<ReceiptEnvelope>): ReceiptEnvelope | undefined =>
  chain.length > 0 ? chain[chain.length - 1] : undefined;

/**
 * Get the first (genesis) envelope in a chain.
 *
 * @example
 * ```ts
 * const first = Receipt.tail(chain);
 * // first === chain[0]
 * ```
 */
export const tail = (chain: ReadonlyArray<ReceiptEnvelope>): ReceiptEnvelope | undefined =>
  chain.length > 0 ? chain[0] : undefined;

/**
 * Append a new entry to an existing chain, auto-linking to the previous hash.
 *
 * Optionally accepts explicit previous hashes for merge envelopes.
 *
 * @example
 * ```ts
 * const chain = yield* Receipt.buildChain([entry1]);
 * const extended = yield* Receipt.append(chain, {
 *   kind: 'update', subject: { type: 'effect', id: 'a' }, payload, timestamp: ts2,
 * });
 * // extended.length === 2
 * ```
 */
export const append = (
  chain: ReadonlyArray<ReceiptEnvelope>,
  entry: { kind: string; subject: ReceiptSubject; payload: TypedRef.Shape; timestamp: HLC },
  previousHashes?: readonly string[],
): Effect.Effect<ReceiptEnvelope[]> =>
  Effect.gen(function* () {
    const previousHash: string | readonly string[] = previousHashes
      ? previousHashes
      : chain.length > 0
        ? chain[chain.length - 1]!.hash
        : GENESIS;
    const envelope = yield* createEnvelope(entry.kind, entry.subject, entry.payload, entry.timestamp, previousHash);
    return [...chain, envelope];
  });

/**
 * Find an envelope in a chain by its content hash.
 *
 * @example
 * ```ts
 * const found = Receipt.findByHash(chain, targetHash);
 * // found?.hash === targetHash
 * ```
 */
export const findByHash = (chain: ReadonlyArray<ReceiptEnvelope>, hash: string): ReceiptEnvelope | undefined =>
  chain.find((e) => e.hash === hash);

/**
 * Find all envelopes in a chain matching a given kind.
 *
 * @example
 * ```ts
 * const updates = Receipt.findByKind(chain, 'update');
 * // updates contains all envelopes with kind === 'update'
 * ```
 */
export const findByKind = (chain: ReadonlyArray<ReceiptEnvelope>, kind: string): ReceiptEnvelope[] =>
  chain.filter((e) => e.kind === kind);

/**
 * Generate an HMAC-SHA-256 key for signing receipt envelopes.
 *
 * @example
 * ```ts
 * const key = yield* Receipt.generateMACKey();
 * const signed = yield* Receipt.macEnvelope(envelope, key);
 * // signed.signature is a hex string
 * ```
 */
export const generateMACKey = (): Effect.Effect<CryptoKey, Error> =>
  Effect.tryPromise({
    try: () => crypto.subtle.generateKey({ name: 'HMAC', hash: { name: 'SHA-256' } }, true, ['sign', 'verify']),
    catch: (error) => new Error(`Failed to generate MAC key: ${error}`),
  });

/**
 * Sign a receipt envelope with an HMAC key, adding a `signature` field.
 *
 * @example
 * ```ts
 * const key = yield* Receipt.generateMACKey();
 * const signed = yield* Receipt.macEnvelope(envelope, key);
 * // signed.signature !== undefined
 * ```
 */
export const macEnvelope = (envelope: ReceiptEnvelope, key: CryptoKey): Effect.Effect<ReceiptEnvelope, Error> =>
  Effect.gen(function* () {
    const data = new TextEncoder().encode(envelope.hash);
    const signatureBuffer = yield* Effect.tryPromise({
      try: () => crypto.subtle.sign('HMAC', key, data),
      catch: (error) => new Error(`Failed to MAC envelope: ${error}`),
    });
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const signature = signatureArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return { ...envelope, signature };
  });

/**
 * Verify an envelope's HMAC signature against a key.
 *
 * Returns false if the envelope has no signature.
 *
 * @example
 * ```ts
 * const valid = yield* Receipt.verifyMAC(signedEnvelope, key);
 * // valid === true if signature matches
 * ```
 */
export const verifyMAC = (envelope: ReceiptEnvelope, key: CryptoKey): Effect.Effect<boolean, ParseError | Error> =>
  Effect.gen(function* () {
    if (!envelope.signature) return false;
    const signatureHex = envelope.signature;
    if (!/^[0-9a-fA-F]+$/.test(signatureHex) || signatureHex.length % 2 !== 0) {
      return yield* Effect.fail(ParseError('signature-hex', 'expected even-length hex string', { code: 'malformed' }));
    }
    const signatureArray = new Uint8Array(signatureHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
    const data = new TextEncoder().encode(envelope.hash);
    const valid = yield* Effect.tryPromise({
      try: () => crypto.subtle.verify('HMAC', key, signatureArray, data),
      catch: (error) => new Error(`Failed to verify signature: ${error}`),
    });
    return valid;
  });

/**
 * Receipt namespace -- chain validation and envelope construction.
 *
 * Build, validate, append, query, and sign linear receipt chains.
 * Each envelope is content-addressed and linked to its predecessor.
 * Supports HMAC signing/verification for tamper detection.
 *
 * @example
 * ```ts
 * import { Effect } from 'effect';
 * import { Receipt, HLC } from '@czap/core';
 *
 * const program = Effect.gen(function* () {
 *   const ts = HLC.increment(HLC.create('node-1'), Date.now());
 *   const chain = yield* Receipt.buildChain([
 *     { kind: 'init', subject: { type: 'effect', id: 'a' }, payload, timestamp: ts },
 *   ]);
 *   const valid = yield* Receipt.validateChain(chain);
 *   const latest = Receipt.head(chain);
 * });
 * ```
 */
export const Receipt = {
  GENESIS,
  createEnvelope,
  buildChain,
  validateChain,
  validateChainDetailed,
  hashEnvelope,
  isGenesis,
  head,
  tail,
  append,
  findByHash,
  findByKind,
  generateMACKey,
  macEnvelope,
  verifyMAC,
};

export declare namespace Receipt {
  /** Alias for {@link ReceiptSubject}. */
  export type Subject = ReceiptSubject;
  /** Alias for {@link ReceiptEnvelope}. */
  export type Envelope = ReceiptEnvelope;
  /** Alias for {@link ChainValidationError}. */
  export type ChainError = ChainValidationError;
}
