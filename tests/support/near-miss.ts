/**
 * near-miss — auto-derived strictness mutators for the schema kernel (scar S1.1).
 *
 * The EdgeSeed scar: an arity-2 tuple silently widened to `S.array(S.number)`
 * during the Wave-0 migration (the kernel had no tuple node), and EVERY existing
 * test stayed green because tests feed VALID values — a happy-path blind spot. The
 * disposition (master plan Methodology §7 / scar-ledger S1.1) is to derive
 * *near-miss* mutators from a schema's OWN AST and property-assert that strict
 * decode REJECTS each one with the right issue code and path. Every schema, past
 * and future, then gets strictness-fidelity coverage for free.
 *
 * This module is the derivation kernel: given a kernel {@link Schema} value and a
 * single SEED value that decodes cleanly through it, it walks the frozen plain-data
 * {@link SchemaNode} AST (read via the public `schema.ast` surface — kernel schema
 * values are WeakSet-branded, their node kind/children fully introspectable) and
 * produces the closed set of near-miss mutations the scar enumerates:
 *
 *   - drop each REQUIRED struct key            → `schema/missing` at the field path
 *   - wrong-primitive at each leaf             → `schema/type`    at the leaf path
 *   - tuple arity +1 / -1                      → `schema/type`    at the tuple path
 *   - literal swapped to a non-member          → `schema/literal` at the literal path
 *   - union replaced with a no-branch value    → `schema/union`   at the union path
 *   - poison key (`__proto__`/`constructor`)   → `schema/poison-key` at the record key
 *     injected under a RECORD
 *
 * Each mutation carries the issue code AND path prefix decode is REQUIRED to
 * report — the prediction the property suite checks against the real decoder.
 *
 * HONEST CARVE-OUTS (semantics differ, stated at the site, never silent):
 *   - `unknown` / `any` accept every value — no near-miss exists; skipped.
 *   - a STRUCT silently IGNORES a non-declared poison key (struct decode reads
 *     declared fields only; it never enumerates input keys), so poison injection is
 *     a REJECTION near-miss only under a RECORD. The struct non-materialisation
 *     property is a separate law (decode.test.ts), not a strictness rejection.
 *   - `brand` rejection is defined by an opaque smart constructor, not derivable
 *     from the AST; a brand node yields no mutator (its base-type reject would need
 *     a valid base value distinct from the branded output). Valid-decode still runs.
 *   - a UNION's members are NOT independently mutated: a mutation of one member can
 *     coincidentally satisfy another branch. Only the union-level no-match is minted.
 *   - `hole` never carries a valid seed (the arbitrary walker refuses it), so it is
 *     never reached here.
 *
 * @module
 */

import { assertNever } from '@czap/error';
import type { LiteralValue, Schema, SchemaNode } from '../../packages/core/src/schema/ast.js';
import type { DecodeIssueCode, DecodePath } from '../../packages/core/src/schema/decode.js';

/**
 * One derived near-miss: a value that mutates a single, valid SEED value at one
 * path so that strict decode MUST fail there with {@link code}, at a path having
 * {@link pathPrefix} as its prefix.
 */
export interface NearMiss {
  /** Human-readable mutator description (for test diagnostics). */
  readonly label: string;
  /** The issue code strict decode is required to emit. */
  readonly code: DecodeIssueCode;
  /** The prefix the failing issue's path must start with. */
  readonly pathPrefix: DecodePath;
  /** The mutated ROOT value fed to strict decode. */
  readonly mutated: unknown;
}

/** A path-addressed edit plus the decode failure it predicts. */
interface PredictedEdit {
  readonly edit: Edit;
  readonly code: DecodeIssueCode;
  readonly pathPrefix: DecodePath;
  readonly label: string;
}

/** The three structural edits a near-miss applies to a valid seed value. */
type Edit =
  | { readonly op: 'replace'; readonly path: DecodePath; readonly value: unknown }
  | { readonly op: 'deleteKey'; readonly objectPath: DecodePath; readonly key: string }
  | { readonly op: 'addPoisonKey'; readonly objectPath: DecodePath; readonly key: string };

// Wrong-TYPE sentinels — each is definitively the wrong primitive for the leaf it
// replaces, so strict decode must report `schema/type` (never a coincidental pass).
const NOT_A_STRING = 0;
const NOT_A_NUMBER = '\x00not-a-number';
const NOT_A_BOOLEAN = '\x00not-a-boolean';
const NOT_AN_INSTANCE = '\x00not-an-instance';

/** Poison keys a record decode refuses with `schema/poison-key`. */
const POISON_KEYS: readonly string[] = ['__proto__', 'constructor'];

function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * True iff `node` accepts EVERY value (so no near-miss exists): an `unknown`/`any`
 * node, or a union with such a member. Consumed at the ROOT to skip a schema that
 * has nothing to strict-reject, and internally as the union no-match carve-out.
 */
export function acceptsAnyValue(node: SchemaNode): boolean {
  switch (node.kind) {
    case 'unknown':
    case 'any':
      return true;
    case 'union':
      return node.members.some(acceptsAnyValue);
    default:
      return false;
  }
}

/** A distinct wrong-primitive replacement for a scalar leaf (or `undefined` if none applies). */
function wrongScalar(node: SchemaNode): unknown {
  switch (node.kind) {
    case 'string':
      return NOT_A_STRING;
    case 'number':
      return NOT_A_NUMBER;
    case 'boolean':
      return NOT_A_BOOLEAN;
    case 'bytes':
      // A non-instance of the carrier — decode's `input instanceof ctor` fails.
      return NOT_AN_INSTANCE;
    default:
      return undefined;
  }
}

/** Swap a literal to a value guaranteed to differ from its pinned member. */
function swappedLiteral(value: LiteralValue): unknown {
  if (typeof value === 'string') return `${value}\x00mutated`;
  if (typeof value === 'number') return value + 1;
  if (typeof value === 'boolean') return !value;
  // literal(null) → any non-null value differs.
  return 0;
}

/**
 * Walk `(node, value, path)` accumulating every near-miss edit for the subtree.
 * `value` is assumed to decode cleanly through `node` (the seed contract).
 */
function collectEdits(node: SchemaNode, value: unknown, path: DecodePath): PredictedEdit[] {
  switch (node.kind) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'bytes': {
      return [
        {
          edit: { op: 'replace', path, value: wrongScalar(node) },
          code: 'schema/type',
          pathPrefix: path,
          label: `wrong type at /${path.join('/')} (expected ${node.kind})`,
        },
      ];
    }
    case 'literal': {
      return [
        {
          edit: { op: 'replace', path, value: swappedLiteral(node.value) },
          code: 'schema/literal',
          pathPrefix: path,
          label: `literal swapped to a non-member at /${path.join('/')}`,
        },
      ];
    }
    case 'unknown':
    case 'any':
    case 'hole':
    case 'brand':
      // unknown/any: accepts everything. hole: never seeded. brand: rejection is
      // not AST-derivable. All honest carve-outs — no near-miss.
      return [];
    case 'union': {
      // Members are not independently mutated (a member mutation can satisfy a
      // sibling). A fresh symbol matches no JSON-shaped branch; carve out only a
      // union that accepts every value (an unknown/any member).
      if (acceptsAnyValue(node)) return [];
      return [
        {
          edit: { op: 'replace', path, value: Symbol('near-miss/no-union-branch') },
          code: 'schema/union',
          pathPrefix: path,
          label: `value matching no union branch at /${path.join('/')}`,
        },
      ];
    }
    case 'array': {
      if (!isUnknownArray(value)) return [];
      const edits: PredictedEdit[] = [];
      for (let i = 0; i < value.length; i++) {
        edits.push(...collectEdits(node.element, value[i], [...path, i]));
      }
      return edits;
    }
    case 'tuple': {
      if (!isUnknownArray(value)) return [];
      const edits: PredictedEdit[] = [];
      const arity = node.elements.length;
      // arity +1 — the EXACT EdgeSeed widening a tuple's array twin would swallow.
      // The extra element duplicates the last (a valid element) so a tuple rejects
      // strictly on LENGTH, never on the padding value's type.
      const extra = value.length > 0 ? value[value.length - 1] : null;
      edits.push({
        edit: { op: 'replace', path, value: [...value, extra] },
        code: 'schema/type',
        pathPrefix: path,
        label: `tuple arity +1 (${arity}→${arity + 1}) at /${path.join('/')}`,
      });
      // arity -1 (only when a shorter array exists).
      if (value.length >= 1) {
        edits.push({
          edit: { op: 'replace', path, value: value.slice(0, -1) },
          code: 'schema/type',
          pathPrefix: path,
          label: `tuple arity -1 (${arity}→${arity - 1}) at /${path.join('/')}`,
        });
      }
      // Per-position wrong-type follows into each element.
      for (let i = 0; i < arity; i++) {
        const element = node.elements[i];
        if (element !== undefined) edits.push(...collectEdits(element, value[i], [...path, i]));
      }
      return edits;
    }
    case 'record': {
      if (!isPlainObject(value)) return [];
      const edits: PredictedEdit[] = [];
      for (const key of Object.keys(value)) {
        edits.push(...collectEdits(node.value, value[key], [...path, key]));
      }
      for (const poison of POISON_KEYS) {
        edits.push({
          edit: { op: 'addPoisonKey', objectPath: path, key: poison },
          code: 'schema/poison-key',
          pathPrefix: [...path, poison],
          label: `record poison key "${poison}" at /${path.join('/')}`,
        });
      }
      return edits;
    }
    case 'struct': {
      if (!isPlainObject(value)) return [];
      const edits: PredictedEdit[] = [];
      for (const field of node.fields) {
        const present = Object.prototype.hasOwnProperty.call(value, field.key);
        if (!field.optional) {
          edits.push({
            edit: { op: 'deleteKey', objectPath: path, key: field.key },
            code: 'schema/missing',
            pathPrefix: [...path, field.key],
            label: `drop required key "${field.key}" at /${path.join('/')}`,
          });
        }
        if (present) edits.push(...collectEdits(field.node, value[field.key], [...path, field.key]));
      }
      // A struct's poison key is silently ignored (decode reads declared fields
      // only) — a non-materialisation law, not a strictness rejection: carved out.
      return edits;
    }
    default:
      return assertNever(node, 'schema node');
  }
}

// ── Immutable path-addressed edit application ───────────────────────────────

/** Copy own enumerable string keys onto a fresh object via data descriptors (poison-safe). */
function cloneObject(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    Object.defineProperty(out, key, { value: obj[key], enumerable: true, writable: true, configurable: true });
  }
  return out;
}

/** Replace `container[key]` (array index or object key) in a fresh copy. */
function setInContainer(container: unknown, key: string | number, value: unknown): unknown {
  if (isUnknownArray(container)) {
    const copy = container.slice();
    copy[key as number] = value;
    return copy;
  }
  if (isPlainObject(container)) {
    const copy = cloneObject(container);
    Object.defineProperty(copy, String(key), { value, enumerable: true, writable: true, configurable: true });
    return copy;
  }
  return container;
}

/** Rebuild `root` so the container addressed by `containerPath` is `fn(container)`; clones each level. */
function transformContainer(root: unknown, containerPath: DecodePath, fn: (container: unknown) => unknown): unknown {
  if (containerPath.length === 0) return fn(root);
  const [head, ...rest] = containerPath;
  const key = head as string | number;
  if (isUnknownArray(root)) {
    const copy = root.slice();
    copy[key as number] = transformContainer(root[key as number], rest, fn);
    return copy;
  }
  if (isPlainObject(root)) {
    const copy = cloneObject(root);
    const child = root[String(key)];
    Object.defineProperty(copy, String(key), {
      value: transformContainer(child, rest, fn),
      enumerable: true,
      writable: true,
      configurable: true,
    });
    return copy;
  }
  return root;
}

function applyEdit(root: unknown, edit: Edit): unknown {
  switch (edit.op) {
    case 'replace': {
      if (edit.path.length === 0) return edit.value;
      const parent = edit.path.slice(0, -1);
      const last = edit.path[edit.path.length - 1];
      const key = last as string | number;
      return transformContainer(root, parent, (container) => setInContainer(container, key, edit.value));
    }
    case 'deleteKey':
      return transformContainer(root, edit.objectPath, (container) => {
        if (!isPlainObject(container)) return container;
        const copy = cloneObject(container);
        delete copy[edit.key];
        return copy;
      });
    case 'addPoisonKey':
      return transformContainer(root, edit.objectPath, (container) => {
        if (!isPlainObject(container)) return container;
        const copy = cloneObject(container);
        // Own ENUMERABLE data property named e.g. "__proto__" — `defineProperty`
        // installs a genuine own key (never the prototype setter), so decode's
        // `Object.keys(input)` scan sees it and refuses it as a poison key.
        Object.defineProperty(copy, edit.key, { value: null, enumerable: true, writable: true, configurable: true });
        return copy;
      });
    default:
      return assertNever(edit, 'near-miss edit');
  }
}

/**
 * Derive every near-miss for `schema` from a single valid `seedValue` (a value that
 * strict-decodes cleanly). Each returned near-miss carries a fully-materialised
 * mutated ROOT value plus the `(code, pathPrefix)` decode is required to report.
 */
export function deriveNearMisses(schema: Schema<unknown, unknown>, seedValue: unknown): readonly NearMiss[] {
  return collectEdits(schema.ast, seedValue, []).map((predicted) => ({
    label: predicted.label,
    code: predicted.code,
    pathPrefix: predicted.pathPrefix,
    mutated: applyEdit(seedValue, predicted.edit),
  }));
}
