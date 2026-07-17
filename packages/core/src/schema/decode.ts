/**
 * The schema-kernel decoder — two contracts over one AST walk.
 *
 * - {@link decode} (STRICT): fail-closed. Returns an `ok` value or a path-tagged
 *   {@link DecodeIssue} list; it NEVER throws on bad input and NEVER touches a
 *   prototype. Struct issues accumulate in field order (deterministic); a union
 *   emits one issue; a brand folds a thrown `ValidationError` into a
 *   `schema/brand` issue; a hole always blocks with `schema/hole`.
 * - {@link decodeLenient} (COERCE-OR-NULL / PRUNE): the kv-cache policy. A
 *   malformed required leaf collapses its container to `null`; a malformed
 *   record/array leaf is pruned; a poison key is dropped. It returns a value or
 *   `null`, never throwing.
 *
 * Both are prototype-poison-safe: input is read through OWN data descriptors
 * only (inherited/accessor slots are invisible), poison keys
 * (`__proto__`/`constructor`/`prototype`) are refused or pruned, and every output
 * property is installed via `defineProperty` so a `__proto__` key can never reach
 * the prototype setter. This is the L4 fail-closed / never-crash / never-pollute
 * contract the fuzz registry enrolls these decoders under.
 *
 * @module
 */

import { assertNever, err, hasTag, ok, ParseError } from '@czap/error';
import type { Result } from '@czap/error';
import type { Schema, SchemaNode } from './ast.js';

/** A location within the decoded value — object keys and array indices. */
export type DecodePath = readonly (string | number)[];

/** The closed set of strict-decode issue codes. */
export type DecodeIssueCode =
  | 'schema/type'
  | 'schema/literal'
  | 'schema/missing'
  | 'schema/union'
  | 'schema/brand'
  | 'schema/hole'
  | 'schema/poison-key';

/** One strict-decode failure, tagged by the {@link DecodePath} it occurred at. */
export interface DecodeIssue {
  readonly path: DecodePath;
  readonly code: DecodeIssueCode;
  readonly message: string;
  /** The folded upstream cause (e.g. a brand's `ValidationError`), when present. */
  readonly cause?: unknown;
}

/** The strict-decode result: an `A`, or the accumulated issue list. */
export type DecodeResult<A> = Result<A, readonly DecodeIssue[]>;

/** Keys that must never be materialised from external data — the pollution vectors. */
const POISON_KEYS: ReadonlySet<string> = new Set(['__proto__', 'constructor', 'prototype']);

/** The lenient "no value here" sentinel — distinct from a genuinely-decoded `null`. */
const PRUNE: unique symbol = Symbol('prune');

/** Any non-null, non-array object — the shape struct/record decode reads OWN keys off. */
function isObjectInput(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Read one OWN DATA property. An inherited property, or an accessor (getter),
 * reports absent — decode never walks a prototype and never invokes a getter.
 */
function ownData(obj: Record<string, unknown>, key: string): { readonly present: boolean; readonly value: unknown } {
  const descriptor = Object.getOwnPropertyDescriptor(obj, key);
  if (descriptor === undefined || !('value' in descriptor)) return { present: false, value: undefined };
  return { present: true, value: descriptor.value };
}

/** Install an output property as own data via `defineProperty` — safe even for `__proto__`. */
function defineData(target: Record<string, unknown>, key: string, value: unknown): void {
  Object.defineProperty(target, key, { value, enumerable: true, writable: true, configurable: true });
}

function addIssue(
  issues: DecodeIssue[],
  path: DecodePath,
  code: DecodeIssueCode,
  message: string,
  cause?: unknown,
): void {
  issues.push(cause === undefined ? { path, code, message } : { path, code, message, cause });
}

function show(value: LiteralishForMessage): string {
  return typeof value === 'string' ? JSON.stringify(value) : String(value);
}
type LiteralishForMessage = string | number | boolean | null;

/** The strict per-node outcome — a value, or a failure whose issues are already recorded. */
type StrictOutcome = { readonly ok: true; readonly value: unknown } | { readonly ok: false };

function decodeStrictNode(node: SchemaNode, input: unknown, path: DecodePath, issues: DecodeIssue[]): StrictOutcome {
  switch (node.kind) {
    case 'string':
      if (typeof input === 'string') return { ok: true, value: input };
      addIssue(issues, path, 'schema/type', 'expected a string');
      return { ok: false };
    case 'number':
      if (typeof input === 'number') return { ok: true, value: input };
      addIssue(issues, path, 'schema/type', 'expected a number');
      return { ok: false };
    case 'boolean':
      if (typeof input === 'boolean') return { ok: true, value: input };
      addIssue(issues, path, 'schema/type', 'expected a boolean');
      return { ok: false };
    case 'literal':
      if (input === node.value) return { ok: true, value: input };
      addIssue(issues, path, 'schema/literal', `expected the literal ${show(node.value)}`);
      return { ok: false };
    case 'unknown':
    case 'any':
      return { ok: true, value: input };
    case 'union': {
      for (const member of node.members) {
        const probe: DecodeIssue[] = [];
        const outcome = decodeStrictNode(member, input, path, probe);
        if (outcome.ok) return outcome;
      }
      addIssue(issues, path, 'schema/union', 'no union member matched');
      return { ok: false };
    }
    case 'array': {
      if (!Array.isArray(input)) {
        addIssue(issues, path, 'schema/type', 'expected an array');
        return { ok: false };
      }
      const out: unknown[] = [];
      let clean = true;
      for (let i = 0; i < input.length; i++) {
        const outcome = decodeStrictNode(node.element, input[i], [...path, i], issues);
        if (outcome.ok) out.push(outcome.value);
        else clean = false;
      }
      return clean ? { ok: true, value: out } : { ok: false };
    }
    case 'tuple': {
      if (!Array.isArray(input)) {
        addIssue(issues, path, 'schema/type', 'expected a tuple (array)');
        return { ok: false };
      }
      // Arity is part of a tuple's type — a wrong length is a type mismatch, not a
      // per-element failure. Report it once at the tuple's own path and stop.
      if (input.length !== node.elements.length) {
        addIssue(
          issues,
          path,
          'schema/type',
          `expected a tuple of length ${node.elements.length}, got ${input.length}`,
        );
        return { ok: false };
      }
      const out: unknown[] = [];
      let clean = true;
      for (const [i, element] of node.elements.entries()) {
        const outcome = decodeStrictNode(element, input[i], [...path, i], issues);
        if (outcome.ok) out.push(outcome.value);
        else clean = false;
      }
      return clean ? { ok: true, value: out } : { ok: false };
    }
    case 'record': {
      if (!isObjectInput(input)) {
        addIssue(issues, path, 'schema/type', 'expected an object');
        return { ok: false };
      }
      const out: Record<string, unknown> = {};
      let clean = true;
      for (const key of Object.keys(input)) {
        if (POISON_KEYS.has(key)) {
          addIssue(issues, [...path, key], 'schema/poison-key', `refusing prototype-poisoning key "${key}"`);
          clean = false;
          continue;
        }
        const outcome = decodeStrictNode(node.value, ownData(input, key).value, [...path, key], issues);
        if (outcome.ok) defineData(out, key, outcome.value);
        else clean = false;
      }
      return clean ? { ok: true, value: out } : { ok: false };
    }
    case 'struct': {
      if (!isObjectInput(input)) {
        addIssue(issues, path, 'schema/type', 'expected an object');
        return { ok: false };
      }
      const out: Record<string, unknown> = {};
      let clean = true;
      for (const field of node.fields) {
        const slot = ownData(input, field.key);
        if (!slot.present) {
          if (field.optional) continue;
          addIssue(issues, [...path, field.key], 'schema/missing', `missing required field "${field.key}"`);
          clean = false;
          continue;
        }
        const outcome = decodeStrictNode(field.node, slot.value, [...path, field.key], issues);
        if (outcome.ok) defineData(out, field.key, outcome.value);
        else clean = false;
      }
      return clean ? { ok: true, value: out } : { ok: false };
    }
    case 'bytes':
      if (input instanceof node.ctor) return { ok: true, value: input };
      addIssue(issues, path, 'schema/type', `expected an instance of ${node.name}`);
      return { ok: false };
    case 'brand': {
      const base = decodeStrictNode(node.base, input, path, issues);
      if (!base.ok) return { ok: false };
      try {
        return { ok: true, value: node.refine(base.value) };
      } catch (cause) {
        const message = hasTag(cause, 'ValidationError') ? cause.message : `brand "${node.name}" rejected the value`;
        addIssue(issues, path, 'schema/brand', message, cause);
        return { ok: false };
      }
    }
    case 'hole':
      addIssue(issues, path, 'schema/hole', `unfilled hole "${node.name}" blocks decoding`);
      return { ok: false };
    default:
      return assertNever(node, 'schema node');
  }
}

/**
 * STRICT decode — fail-closed. Returns the decoded `A`, or an accumulated,
 * path-tagged {@link DecodeIssue} list. Never throws on bad input; never mutates
 * a prototype.
 */
export function decode<A, I>(schema: Schema<A, I>, input: unknown): DecodeResult<A> {
  const issues: DecodeIssue[] = [];
  const outcome = decodeStrictNode(schema.ast, input, [], issues);
  // `outcome.value` is the decoded `A` by construction of the walk over the AST
  // that produced this schema's phantom type.
  return outcome.ok ? ok(outcome.value as A) : err(Object.freeze(issues));
}

function decodeLenientNode(node: SchemaNode, input: unknown): unknown {
  switch (node.kind) {
    case 'string':
      return typeof input === 'string' ? input : PRUNE;
    case 'number':
      return typeof input === 'number' ? input : PRUNE;
    case 'boolean':
      return typeof input === 'boolean' ? input : PRUNE;
    case 'literal':
      return input === node.value ? input : PRUNE;
    case 'unknown':
    case 'any':
      return input;
    case 'union': {
      for (const member of node.members) {
        const decoded = decodeLenientNode(member, input);
        if (decoded !== PRUNE) return decoded;
      }
      return PRUNE;
    }
    case 'array': {
      if (!Array.isArray(input)) return PRUNE;
      const out: unknown[] = [];
      for (const item of input) {
        const decoded = decodeLenientNode(node.element, item);
        if (decoded !== PRUNE) out.push(decoded);
      }
      return out;
    }
    case 'tuple': {
      // A tuple's positions are FIXED: unlike an array, a failed element is NEVER
      // pruned (pruning would break arity and produce a value that lies about its
      // type). The coerce-or-null contract collapses the whole tuple to `null` on a
      // wrong length or any failed position.
      if (!Array.isArray(input) || input.length !== node.elements.length) return PRUNE;
      const out: unknown[] = [];
      for (const [i, element] of node.elements.entries()) {
        const decoded = decodeLenientNode(element, input[i]);
        if (decoded === PRUNE) return PRUNE;
        out.push(decoded);
      }
      return out;
    }
    case 'record': {
      if (!isObjectInput(input)) return PRUNE;
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(input)) {
        if (POISON_KEYS.has(key)) continue;
        const decoded = decodeLenientNode(node.value, ownData(input, key).value);
        if (decoded !== PRUNE) defineData(out, key, decoded);
      }
      return out;
    }
    case 'struct': {
      if (!isObjectInput(input)) return PRUNE;
      const out: Record<string, unknown> = {};
      for (const field of node.fields) {
        const slot = ownData(input, field.key);
        if (!slot.present) {
          if (field.optional) continue;
          return PRUNE;
        }
        const decoded = decodeLenientNode(field.node, slot.value);
        if (decoded === PRUNE) {
          if (field.optional) continue;
          return PRUNE;
        }
        defineData(out, field.key, decoded);
      }
      return out;
    }
    case 'bytes':
      return input instanceof node.ctor ? input : PRUNE;
    case 'brand': {
      const base = decodeLenientNode(node.base, input);
      if (base === PRUNE) return PRUNE;
      try {
        return node.refine(base);
      } catch {
        return PRUNE;
      }
    }
    case 'hole':
      return PRUNE;
    default:
      return assertNever(node, 'schema node');
  }
}

/**
 * LENIENT decode — coerce-or-null / prune. Returns the decoded `A`, or `null`
 * when a required leaf could not be produced. Malformed record/array leaves and
 * poison keys are pruned rather than fatal. Never throws.
 */
export function decodeLenient<A, I>(schema: Schema<A, I>, input: unknown): A | null {
  const decoded = decodeLenientNode(schema.ast, input);
  return decoded === PRUNE ? null : (decoded as A);
}

/**
 * Fold a {@link DecodeIssue} list into a single tagged `ParseError` (the value-or-
 * tagged-error shape a sync validator returns). The first issue's `code` and
 * path lead the message; `source` names the contract that failed.
 */
export function parseErrorFromIssues(issues: readonly DecodeIssue[], source = 'schema'): ParseError {
  const first = issues[0];
  if (first === undefined) return ParseError(source, 'decode failed with no issues');
  const at = first.path.length === 0 ? '(root)' : `/${first.path.join('/')}`;
  const head = `${first.code} at ${at}: ${first.message}`;
  const detail = issues.length > 1 ? `${head} (+${issues.length - 1} more)` : head;
  return ParseError(source, detail, { code: first.code });
}
