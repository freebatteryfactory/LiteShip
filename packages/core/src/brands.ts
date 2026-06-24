/**
 * Branded type factories for `@czap/core`.
 *
 * All custom brands use unique symbols for nominal typing safety.
 * Brand helpers produce branded wrappers at zero runtime cost.
 *
 * Types are re-anchored from `@czap/_spine` (the canonical source) via local
 * type aliases so the names remain valid value exports (runtime constructors)
 * in the same module without triggering `isolatedModules` conflicts.
 *
 * @module
 */

import type {
  SignalInput as _SignalInput,
  ThresholdValue as _ThresholdValue,
  StateName as _StateName,
  ContentAddress as _ContentAddress,
  IntegrityDigest as _IntegrityDigest,
  AddressedDigest as _AddressedDigest,
  TokenRef as _TokenRef,
  Millis as _Millis,
} from '@czap/_spine';
import { ValidationError } from '@czap/error';

// Re-anchor types from the canonical source (_spine).
// Using local type aliases preserves declaration-merging with the const constructors below.

/** Branded input signal name. Dot-notation signal path (e.g. viewport.width, prefers-color-scheme). */
export type SignalInput<I extends string = string> = _SignalInput<I>;

/** Branded threshold number on a boundary. Finite number on the signal's continuous range. */
export type ThresholdValue = _ThresholdValue;

/** Branded state name -- e.g. 'mobile', 'tablet', 'desktop' */
export type StateName<S extends string = string> = _StateName<S>;

/**
 * Content-addressed hash.
 * Format: fnv1a:XXXXXXXX (8 hex digits). Computed from CBOR-canonical payload via FNV-1a hash.
 */
export type ContentAddress = _ContentAddress;

/**
 * Cryptographic content digest brand. Format: `sha256:<64-hex>` or `blake3:<64-hex>`.
 * The algorithmic complement to ContentAddress for external/release artifacts (ADR-0011).
 */
export type IntegrityDigest = _IntegrityDigest;

/** Pair of identity hash + cryptographic digest over the same canonical bytes (ADR-0011). */
export type AddressedDigest = _AddressedDigest;

/** Branded token reference name */
export type TokenRef<N extends string = string> = _TokenRef<N>;

/**
 * Branded millisecond duration -- forces explicit wrapping of raw numbers at temporal API boundaries.
 * Non-negative millisecond duration. Fractional values allowed. Use Millis(0) for immediate.
 */
export type Millis = _Millis;

/** Hybrid Logical Clock */
export interface HLC {
  readonly wall_ms: number;
  readonly counter: number;
  readonly node_id: string;
}

/** Generic brand factory */
export function brand<T, B extends symbol>(value: T): T & { readonly [K in B]: true } {
  return value as T & { readonly [K in B]: true };
}

// ---------------------------------------------------------------------------
// Validating smart constructors (parse-don't-validate).
//
// Each brand throws `ValidationError` on input that violates its REAL runtime
// invariant — never a check that merely re-asserts the TypeScript type. A
// branded value is therefore a proof of its invariant at every call site.
// ---------------------------------------------------------------------------

/**
 * `fnv1a:` + exactly 8 lowercase hex — the full width of the FNV-1a 32-bit
 * output (`(h >>> 0).toString(16).padStart(8, '0')`).
 */
const CONTENT_ADDRESS_RE = /^fnv1a:[0-9a-f]{8}$/;

/**
 * `sha256:`/`blake3:` + exactly 64 lowercase hex — the full width of a 256-bit
 * cryptographic digest (ADR-0011). Only these two algorithms are sanctioned.
 */
const INTEGRITY_DIGEST_RE = /^(?:sha256|blake3):[0-9a-f]{64}$/;

/** Type guard: `s` is a syntactically valid {@link ContentAddress}. */
export const isContentAddress = (s: string): s is ContentAddress => CONTENT_ADDRESS_RE.test(s);

/** Type guard: `s` is a syntactically valid {@link IntegrityDigest}. */
export const isIntegrityDigest = (s: string): s is IntegrityDigest => INTEGRITY_DIGEST_RE.test(s);

/**
 * Wrap a plain string as a {@link SignalInput}.
 *
 * The brand is DELIBERATELY lenient free-form (see `signal-input.ts`): real
 * values include colon payloads carrying spaces and parens, e.g.
 * `media:(min-width: 600px)` and `custom:my.signal.id`, so any
 * character-grammar would reject genuine inputs. The one real invariant is
 * that a signal must NAME something — the empty string addresses no signal.
 *
 * @throws {@link ValidationError} when `value` is the empty string.
 */
export const SignalInput = <I extends string>(value: I): SignalInput<I> => {
  if (value.length === 0) {
    throw ValidationError('SignalInput', 'signal name must be non-empty');
  }
  return value as SignalInput<I>;
};

/**
 * Wrap a plain number as a {@link ThresholdValue}.
 *
 * A threshold is compared against a continuous signal value; `NaN`/`Infinity`
 * break the ordered comparison the boundary evaluator relies on (every
 * comparison with `NaN` is false). The range is signal-specific, so finiteness
 * is the real generic invariant.
 *
 * @throws {@link ValidationError} when `value` is not finite.
 */
export const ThresholdValue = (value: number): ThresholdValue => {
  if (!Number.isFinite(value)) {
    throw ValidationError('ThresholdValue', `threshold must be a finite number, got ${value}`);
  }
  return value as ThresholdValue;
};

/**
 * Wrap a plain string as a {@link StateName}.
 *
 * A state name is serialized into the `data-czap` state token and used as a
 * CSS/selector-addressable label, so it must be a non-empty token with no
 * whitespace (e.g. `mobile`, `sm`, `desktop`).
 *
 * @throws {@link ValidationError} when `value` is empty or contains whitespace.
 */
export const StateName = <S extends string>(value: S): StateName<S> => {
  if (value.length === 0 || /\s/.test(value)) {
    throw ValidationError(
      'StateName',
      `state name must be a non-empty token with no whitespace, got ${JSON.stringify(value)}`,
    );
  }
  return value as StateName<S>;
};

/**
 * Wrap a plain string as a {@link ContentAddress}.
 * @throws {@link ValidationError} when `value` is not `fnv1a:` + 8 lowercase hex.
 */
export const ContentAddress = (value: string): ContentAddress => {
  if (!isContentAddress(value)) {
    throw ValidationError('ContentAddress', `expected fnv1a:<8 lowercase hex>, got ${JSON.stringify(value)}`);
  }
  return value as ContentAddress;
};

/**
 * Wrap a plain string as an {@link IntegrityDigest}.
 * @throws {@link ValidationError} when `value` is not `(sha256|blake3):` + 64 lowercase hex.
 */
export const IntegrityDigest = (value: string): IntegrityDigest => {
  if (!isIntegrityDigest(value)) {
    throw ValidationError(
      'IntegrityDigest',
      `expected (sha256|blake3):<64 lowercase hex>, got ${JSON.stringify(value)}`,
    );
  }
  return value as IntegrityDigest;
};

/**
 * Wrap a plain string as a {@link TokenRef}.
 *
 * A token ref names a design token and is emitted into a CSS custom-property
 * name, so it must be a non-empty token with no whitespace (e.g. `primary`,
 * `color-surface`, `font-size-lg`).
 *
 * @throws {@link ValidationError} when `value` is empty or contains whitespace.
 */
export const TokenRef = <N extends string>(value: N): TokenRef<N> => {
  if (value.length === 0 || /\s/.test(value)) {
    throw ValidationError(
      'TokenRef',
      `token ref must be a non-empty token with no whitespace, got ${JSON.stringify(value)}`,
    );
  }
  return value as TokenRef<N>;
};

/**
 * Wrap a plain number as a {@link Millis}.
 *
 * A duration cannot run backwards and `NaN`/`Infinity` are not realizable
 * delays, so the real invariant is finite and non-negative. Fractional values
 * are allowed (sub-millisecond timing). Use `Millis(0)` for immediate.
 *
 * @throws {@link ValidationError} when `value` is negative or not finite.
 */
export const Millis = (value: number): Millis => {
  if (!Number.isFinite(value) || value < 0) {
    throw ValidationError('Millis', `duration must be a finite, non-negative number of milliseconds, got ${value}`);
  }
  return value as Millis;
};
