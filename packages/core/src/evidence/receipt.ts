/**
 * Receipt -- chain validation and envelope construction.
 *
 * Salvaged from `@kit/core`.
 *
 * @module
 */

import { IntegrityError, ParseError } from '@liteship/error';
import { bytesToHex } from '@liteship/canonical';
import type { HLC } from '../schema/brands.js';
import { TypedRef as TypedRefModule, type TypedRef } from '../internal/typed-ref.js';
import { HLC as HLCOps } from '../clock/hlc.js';

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
  readonly payload: TypedRef;
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
 *   `subject.id === "liteship/checkpoint:<base>"`); a mismatch fails `checkpoint_invalid`.
 * - `verifyCheckpoint`: an OPTIONAL provenance verifier for the checkpoint — the
 *   injectable capability that closes the one gap the structural checks cannot.
 */
export interface ChainValidationOptions {
  readonly base?: string;
  readonly checkpoint?: ReceiptEnvelope;
  /**
   * Provenance verifier for the checkpoint attestation (injected capability).
   *
   * The structural checks prove the checkpoint is WELL-FORMED (hash, `kind`,
   * `subject.type`, payload schema, genesis shape, `subject.id`, HLC-advance) but
   * NOT that it was minted by `DAG.checkpoint` over the real dropped set — a
   * compacted-tail validator does not hold the dropped set, so it cannot recompute
   * the summary `content_hash`. A forged genesis-shaped `kind:"checkpoint"` envelope
   * with the right subject id and an older timestamp therefore passes the structural
   * floor and could authorize an arbitrarily TRUNCATED tail.
   *
   * In a TRUSTED setting (single-actor self-compaction — you validate the checkpoint
   * YOU minted) the structural floor is sufficient and no verifier is needed. In an
   * ADVERSARIAL setting (an untrusted remote supplies the checkpoint) inject a
   * verifier that establishes provenance — e.g. checks a signature (a trusted
   * compactor's `Receipt.macEnvelope` over the attestation), or recomputes the
   * summary against a locally-held dropped set. It resolves `true` to accept, `false`
   * to reject (fails the chain `checkpoint_invalid`); any verification failure must
   * resolve `false`, not raise. Absent, only the structural floor applies.
   */
  readonly verifyCheckpoint?: (checkpoint: ReceiptEnvelope) => Promise<boolean>;
}

/** Sentinel `previous` value marking the root of a receipt chain. */
export const GENESIS: string = 'genesis';

/**
 * The schema id `DAG.checkpoint` stamps on its summary payload's `TypedRef`
 * (`schema_hash`). Compacted-tail validation binds authorization to this minted
 * shape — single source of truth, imported by `dag.ts` so the mint and the
 * verifier can never drift.
 */
export const CHECKPOINT_ATTESTATION_SCHEMA = 'liteship/checkpoint-summary/v1';

/**
 * Compute the content hash of a receipt envelope.
 *
 * Normalizes the `previous` field (sorts array form), canonicalizes the
 * payload, and hashes with SHA-256 via TypedRef.
 *
 * @example
 * ```ts
 * const hash = await Receipt.hashEnvelope(envelope);
 * // hash === envelope.hash (if envelope is valid)
 * ```
 */
export const hashEnvelope = (envelope: ReceiptEnvelope): Promise<string> => {
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
 * const envelope = await Receipt.createEnvelope(
 *   'state-change',
 *   { type: 'effect', id: 'actor-1' },
 *   { _tag: 'TypedRef', mediaType: 'application/json', data: { key: 'value' } },
 *   hlcTimestamp,
 *   Receipt.GENESIS,
 * );
 * // envelope.hash is the computed SHA-256 content address
 * ```
 */
export const createEnvelope = async (
  kind: string,
  subject: ReceiptSubject,
  payload: TypedRef,
  timestamp: HLC,
  previousHash: string | readonly string[],
): Promise<ReceiptEnvelope> => {
  const previousNormalized = Array.isArray(previousHash)
    ? [...(previousHash as readonly string[])].sort()
    : previousHash;
  const partial = { kind, timestamp, subject, payload, previous: previousNormalized };
  const h = await TypedRefModule.hash(TypedRefModule.canonicalize(partial));
  return { kind, timestamp, subject, payload, hash: h, previous: previousNormalized };
};

/**
 * Build a linear chain of receipt envelopes from an array of entries.
 *
 * Each envelope's `previous` points to the prior envelope's hash,
 * starting from GENESIS.
 *
 * @example
 * ```ts
 * const chain = await Receipt.buildChain([
 *   { kind: 'init', subject: { type: 'effect', id: 'a' }, payload, timestamp: ts1 },
 *   { kind: 'update', subject: { type: 'effect', id: 'a' }, payload, timestamp: ts2 },
 * ]);
 * // chain.length === 2
 * // chain[1].previous === chain[0].hash
 * ```
 */
export const buildChain = async (
  entries: ReadonlyArray<{
    kind: string;
    subject: ReceiptSubject;
    payload: TypedRef;
    timestamp: HLC;
  }>,
): Promise<ReceiptEnvelope[]> => {
  const chain: ReceiptEnvelope[] = [];
  let previousHash = GENESIS;
  for (const entry of entries) {
    const envelope = await createEnvelope(entry.kind, entry.subject, entry.payload, entry.timestamp, previousHash);
    chain.push(envelope);
    previousHash = envelope.hash;
  }
  return chain;
};

/**
 * Validate a receipt chain: genesis link, hash integrity, chain continuity, HLC ordering.
 *
 * The ergonomic everyday check: resolves only to `true` and signals every
 * violation through the `Error` channel with a human-readable message.
 *
 * @example
 * ```ts
 * const chain = await Receipt.buildChain(entries);
 * const valid = await Receipt.validateChain(chain);
 * // valid === true
 * ```
 *
 * @see validateChainDetailed for typed `ChainValidationError` handling.
 */
export const validateChain = async (
  chain: ReadonlyArray<ReceiptEnvelope>,
  options?: ChainValidationOptions,
): Promise<boolean> => {
  try {
    return await validateChainDetailed(chain, options);
  } catch (error) {
    // validateChainDetailed throws the typed `ChainValidationError` (a plain
    // tagged value) for a rule violation; a hash-primitive failure surfaces as a
    // real `Error`. Only the former is rendered into the human-readable message —
    // an unexpected `Error` (the old defect channel) propagates untouched.
    if (error instanceof Error) throw error;
    const chainError = error as ChainValidationError;
    throw IntegrityError('receipt-chain', formatChainError(chainError, chain), { code: chainError.type });
  }
};

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
 * try {
 *   await Receipt.validateChainDetailed(chain);
 *   // resolved true on success
 * } catch (error) {
 *   // error is a ChainValidationError with .type on failure
 * }
 * ```
 *
 * @see validateChain for the simple Error-channel form.
 */
export const validateChainDetailed = async (
  chain: ReadonlyArray<ReceiptEnvelope>,
  options?: ChainValidationOptions,
): Promise<true> => {
  const base = options?.base;
  const checkpoint = options?.checkpoint;

  // A `base` watermark widens the index-0 genesis predicate to accept a
  // compacted tail — but ONLY a verified checkpoint attestation authorizes that.
  // Accepting `base` alone would let any caller validate a TRUNCATED chain by
  // passing `base = tail[0].previous` with no proof the omitted prefix was ever
  // checkpointed. Require the checkpoint. (Codex finding #3.)
  if (base !== undefined && checkpoint === undefined) {
    throw {
      type: 'checkpoint_invalid' as const,
      reason: 'a base watermark requires a checkpoint attestation to authorize compacted-tail validation',
    };
  }

  // When a checkpoint is supplied, bind it to `base`: verify its content hash,
  // genesis shape, and that its subject commits exactly this watermark. This is
  // what authorizes the widened index-0 predicate below.
  if (checkpoint !== undefined) {
    if (base === undefined) {
      throw {
        type: 'checkpoint_invalid' as const,
        reason: 'a checkpoint was supplied without a base watermark to bind it to',
      };
    }
    const computedCheckpointHash = await hashEnvelope(checkpoint);
    if (computedCheckpointHash !== checkpoint.hash) {
      throw {
        type: 'checkpoint_invalid' as const,
        reason: `checkpoint hash mismatch (expected "${checkpoint.hash}", computed "${computedCheckpointHash}")`,
      };
    }
    // The attestation must actually be a checkpoint receipt — a different
    // genesis-shaped receipt that happens to carry the same subject id must NOT
    // authorize a compacted tail.
    if (checkpoint.kind !== 'checkpoint') {
      throw {
        type: 'checkpoint_invalid' as const,
        reason: `checkpoint attestation has kind "${checkpoint.kind}" (expected "checkpoint")`,
      };
    }
    // Bind to the MINTED checkpoint shape, not just kind + subject id: DAG.checkpoint
    // stamps subject.type "run" and a "liteship/checkpoint-summary" payload. Otherwise a
    // forger could mint a genesis-shaped kind:"checkpoint" envelope with the right
    // subject id but an arbitrary payload + an older timestamp to authorize a
    // truncated tail. (Full cryptographic provenance would need a signature; this
    // rejects the structural forgeries.)
    if (checkpoint.subject.type !== 'run') {
      throw {
        type: 'checkpoint_invalid' as const,
        reason: `checkpoint subject.type is "${checkpoint.subject.type}" (expected "run")`,
      };
    }
    if (checkpoint.payload.schema_hash !== CHECKPOINT_ATTESTATION_SCHEMA) {
      throw {
        type: 'checkpoint_invalid' as const,
        reason: `checkpoint payload schema is "${checkpoint.payload.schema_hash}" (expected "${CHECKPOINT_ATTESTATION_SCHEMA}")`,
      };
    }
    if (!isGenesis(checkpoint)) {
      throw {
        type: 'checkpoint_invalid' as const,
        reason: 'checkpoint is not genesis-shaped (previous must be GENESIS)',
      };
    }
    const expectedSubjectId = `liteship/checkpoint:${base}`;
    if (checkpoint.subject.id !== expectedSubjectId) {
      throw {
        type: 'checkpoint_invalid' as const,
        reason: `checkpoint subject "${checkpoint.subject.id}" does not commit base watermark (expected "${expectedSubjectId}")`,
      };
    }
    // Provenance gate (injected capability): the structural checks above prove the
    // checkpoint is well-formed but not that it attests to the REAL dropped set —
    // `validateChain` lacks that set, so it cannot recompute the summary
    // `content_hash`. An adversarial caller closes the residual forgery vector by
    // injecting `verifyCheckpoint` (e.g. a signature check); absent one, the
    // structural floor stands (sound for trusted self-compaction). See ADR-0026.
    if (options?.verifyCheckpoint !== undefined) {
      const attested = await options.verifyCheckpoint(checkpoint);
      if (!attested) {
        throw {
          type: 'checkpoint_invalid' as const,
          reason: 'checkpoint failed the injected provenance verifier (not attested by a trusted compactor)',
        };
      }
    }
  }

  // An empty chain is vacuously valid — but only AFTER any supplied checkpoint
  // is bound + verified, so `validateChainDetailed([], { base })` cannot pass
  // without the authorization a non-empty compacted tail requires.
  if (chain.length === 0) return true as const;

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
    throw { type: 'not_genesis' as const, index: 0 as const };
  }

  // A compacted tail (its first envelope names `base`, not GENESIS) is a child of
  // the dropped watermark, so it MUST advance the HLC beyond the checkpoint —
  // whose timestamp is the HLC-max over the dropped prefix. Otherwise a
  // self-consistent but stale-HLC envelope naming `base` as `previous` would
  // validate where the full chain rejects it at the prefix boundary.
  const firstNamesBase =
    base !== undefined &&
    (firstPrev === base || (Array.isArray(firstPrev) && (firstPrev as readonly string[]).includes(base)));
  if (firstNamesBase && checkpoint !== undefined && HLCOps.compare(first.timestamp, checkpoint.timestamp) <= 0) {
    throw {
      type: 'checkpoint_invalid' as const,
      reason: 'compacted tail does not advance the HLC beyond the checkpoint watermark',
    };
  }

  for (let i = 0; i < chain.length; i++) {
    const envelope = chain[i]!;
    const isMerge = Array.isArray(envelope.previous);

    const computedHash = await hashEnvelope(envelope);
    if (computedHash !== envelope.hash) {
      throw {
        type: 'hash_mismatch' as const,
        index: i,
        computed: computedHash,
        stored: envelope.hash,
      };
    }

    if (!isMerge && i > 0 && envelope.previous !== chain[i - 1]!.hash) {
      throw {
        type: 'chain_break' as const,
        index: i,
        expected: chain[i - 1]!.hash,
        actual: envelope.previous as string,
      };
    }

    if (!isMerge && i > 0 && HLCOps.compare(chain[i - 1]!.timestamp, envelope.timestamp) >= 0) {
      throw {
        type: 'hlc_not_increasing' as const,
        index: i,
      };
    }
  }

  return true as const;
};

/**
 * Check whether a receipt envelope is a genesis (root) envelope.
 *
 * @example
 * ```ts
 * const chain = await Receipt.buildChain(entries);
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
 * const chain = await Receipt.buildChain([entry1]);
 * const extended = await Receipt.append(chain, {
 *   kind: 'update', subject: { type: 'effect', id: 'a' }, payload, timestamp: ts2,
 * });
 * // extended.length === 2
 * ```
 */
export const append = async (
  chain: ReadonlyArray<ReceiptEnvelope>,
  entry: { kind: string; subject: ReceiptSubject; payload: TypedRef; timestamp: HLC },
  previousHashes?: readonly string[],
): Promise<ReceiptEnvelope[]> => {
  const previousHash: string | readonly string[] = previousHashes
    ? previousHashes
    : chain.length > 0
      ? chain[chain.length - 1]!.hash
      : GENESIS;
  const envelope = await createEnvelope(entry.kind, entry.subject, entry.payload, entry.timestamp, previousHash);
  return [...chain, envelope];
};

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
 * const key = await Receipt.generateMACKey();
 * const signed = await Receipt.macEnvelope(envelope, key);
 * // signed.signature is a hex string
 * ```
 */
export const generateMACKey = async (): Promise<CryptoKey> => {
  try {
    return await crypto.subtle.generateKey({ name: 'HMAC', hash: { name: 'SHA-256' } }, true, ['sign', 'verify']);
  } catch (error) {
    throw IntegrityError('mac-key', `Failed to generate MAC key: ${error}`);
  }
};

/**
 * Sign a receipt envelope with an HMAC key, adding a `signature` field.
 *
 * @example
 * ```ts
 * const key = await Receipt.generateMACKey();
 * const signed = await Receipt.macEnvelope(envelope, key);
 * // signed.signature !== undefined
 * ```
 */
export const macEnvelope = async (envelope: ReceiptEnvelope, key: CryptoKey): Promise<ReceiptEnvelope> => {
  const data = new TextEncoder().encode(envelope.hash);
  let signatureBuffer: ArrayBuffer;
  try {
    signatureBuffer = await crypto.subtle.sign('HMAC', key, data);
  } catch (error) {
    throw IntegrityError('signature', `Failed to MAC envelope: ${error}`);
  }
  const signature = bytesToHex(new Uint8Array(signatureBuffer));
  return { ...envelope, signature };
};

/**
 * Verify an envelope's HMAC signature against a key.
 *
 * Returns false if the envelope has no signature.
 *
 * @example
 * ```ts
 * const valid = await Receipt.verifyMAC(signedEnvelope, key);
 * // valid === true if signature matches
 * ```
 */
export const verifyMAC = async (envelope: ReceiptEnvelope, key: CryptoKey): Promise<boolean> => {
  if (!envelope.signature) return false;
  const signatureHex = envelope.signature;
  if (!/^[0-9a-fA-F]+$/.test(signatureHex) || signatureHex.length % 2 !== 0) {
    throw ParseError('signature-hex', 'expected even-length hex string', { code: 'malformed' });
  }
  const signatureArray = new Uint8Array(signatureHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
  const data = new TextEncoder().encode(envelope.hash);
  try {
    return await crypto.subtle.verify('HMAC', key, signatureArray, data);
  } catch (error) {
    throw IntegrityError('signature', `Failed to verify signature: ${error}`);
  }
};

/**
 * A structured, human-debuggable view of one {@link ReceiptEnvelope} — the shape
 * {@link inspectReceipt} returns. Purely derived (no hashing, no I/O): the causal
 * facts a caller reads when tracing a chain link.
 */
export interface ReceiptInspection {
  /** The envelope's semantic kind (e.g. `'state-change'`, `'checkpoint'`). */
  readonly kind: string;
  /** The logical entity the receipt describes. */
  readonly subject: ReceiptSubject;
  /** The envelope's content hash (SHA-256 hex). */
  readonly hash: string;
  /** The predecessor link(s), always normalized to an array (single or merge). */
  readonly previous: readonly string[];
  /** True when this is a genesis (root) envelope — `previous` includes the `GENESIS` sentinel. */
  readonly isGenesis: boolean;
  /** True when this is a merge envelope — it names more than one predecessor. */
  readonly isMerge: boolean;
  /** True when the envelope carries a MAC `signature`. */
  readonly signed: boolean;
  /** The causal clock stamped on the envelope. */
  readonly timestamp: HLC;
}

/**
 * Return a structured, human-debuggable view of a receipt envelope (verb grammar,
 * ADR-0046 — `inspect` returns structured debug information). A thin, synchronous
 * facade over the existing {@link Receipt} namespace: it derives the causal facts
 * (genesis/merge/signed classification, normalized predecessor links) a caller
 * reads when tracing a chain link, WITHOUT recomputing the hash or touching I/O.
 *
 * @example
 * ```ts
 * import { inspectReceipt } from '@liteship/core';
 *
 * const view = inspectReceipt(chain[0]);
 * // { kind, subject, hash, previous, isGenesis: true, isMerge: false, signed, timestamp }
 * ```
 */
export const inspectReceipt = (envelope: ReceiptEnvelope): ReceiptInspection => {
  const raw = envelope.previous;
  const previous: readonly string[] = typeof raw === 'string' ? [raw] : raw;
  return {
    kind: envelope.kind,
    subject: envelope.subject,
    hash: envelope.hash,
    previous,
    isGenesis: isGenesis(envelope),
    isMerge: Array.isArray(envelope.previous),
    signed: envelope.signature !== undefined,
    timestamp: envelope.timestamp,
  };
};

/**
 * Receipt namespace -- chain validation and envelope construction.
 *
 * Build, validate, append, query, and sign linear receipt chains.
 * Each envelope is content-addressed and linked to its predecessor.
 * Supports HMAC signing/verification for tamper detection.
 *
 * @example
 * ```ts
 * import { Receipt, HLC } from '@liteship/core';
 *
 * const ts = HLC.increment(HLC.create('node-1'), Date.now());
 * const chain = await Receipt.buildChain([
 *   { kind: 'init', subject: { type: 'effect', id: 'a' }, payload, timestamp: ts },
 * ]);
 * const valid = await Receipt.validateChain(chain);
 * const latest = Receipt.head(chain);
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
