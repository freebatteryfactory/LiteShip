/**
 * json-schema-from-schema — derive a JSON-Schema object from an Effect
 * `Schema.Schema<T>` AST. The PRODUCTION twin of the harness's
 * `arbitrary-from-schema`: both walk the same `SchemaAST.AST`, but where the
 * harness derives a `fast-check` arbitrary, this derives the JSON-Schema
 * fragment a command descriptor's `inputSchema` / `outputSchema` carries.
 *
 * SINGLE SOURCE OF TRUTH: a command descriptor models its I/O as ONE Effect
 * Schema and derives BOTH the TS type (`Schema.Type`) and the JSON-Schema from
 * it — killing the hand-maintained-JSON-Schema-beside-the-TS-type drift. This
 * module builds + proves ONLY the deriver.
 *
 * PLACEMENT (deliberate): this lives in the production tree (NOT under
 * `harness/`) and is re-exported from the MAIN `@czap/core` barrel, because
 * `@czap/command` imports it and MUST NOT pull `fast-check` into its runtime.
 * The harness barrel imports `fast-check`; this module depends ONLY on `effect`
 * (which `@czap/core` already uses) and `@czap/error`. No `fast-check`.
 *
 * DIALECT: the output targets exactly the subset
 * `tests/support/structural-schema.ts`'s `validateStructural` understands and
 * that `@czap/_spine`'s `CommandJsonSchema` declares — the `type`, `properties`,
 * `required`, `enum`, `items`, and `const` keys. We derive TO that dialect so the output
 * is immediately usable by the existing command machinery (CLI receipts + MCP
 * `tools/list`).
 *
 * Coverage (what command payloads use):
 *   - Struct/TypeLiteral  → `{ type:'object', properties, required:[non-optional] }`
 *   - String/Number/Boolean → `{ type:'string'|'number'|'boolean' }`
 *   - Literal (singleton)   → `{ const: value }`
 *   - Union of literals     → `{ enum: [...] }`  (the dialect's literal-set form)
 *   - Array(T)              → `{ type:'array', items: <derived element> }`
 *   - Nullable (T | Null)   → the member type widened to allow `'null'`
 *   - Unknown/Any           → `{}` (the empty schema — accepts anything, soundly)
 *   - Suspend               → resolved once + recursed
 *   - nested structs/arrays → recursed
 *
 * UNSUPPORTED (throw a tagged `UnsupportedError` from `@czap/error`, NEVER a
 * silent fallback, NEVER `any`): any AST node for which a SOUND JSON-Schema in
 * this dialect cannot be produced — e.g. a non-literal heterogeneous `Union`
 * (the dialect has no `anyOf`/`oneOf`, so widening would silently drop a
 * constraint), index signatures, opaque `Declaration`s, `TemplateLiteral`,
 * `BigInt` (no JSON-Schema number type is sound for it). The error names the
 * node so the upcoming command migration sees the exact coverage envelope.
 *
 * @module
 */
import type { SchemaAST } from 'effect';
import type { Schema } from 'effect';
import { UnsupportedError } from '@czap/error';

/**
 * A derived JSON-Schema fragment in the `validateStructural` / `CommandJsonSchema`
 * dialect. Every field is optional at the fragment level; the TOP-LEVEL result
 * of a `Schema.Struct` is the tighter `JsonSchemaObject` (always `type:'object'`
 * with `properties`).
 *
 * `const`/`enum` carry JSON-primitive literal values (string | number | boolean
 * | null) — the only literal kinds Effect's `Literal` AST and the structural
 * validator both model.
 */
export interface JsonSchemaFragment {
  readonly type?: string | readonly string[];
  readonly properties?: Readonly<Record<string, JsonSchemaFragment>>;
  readonly required?: readonly string[];
  readonly enum?: readonly (string | number | boolean | null)[];
  readonly const?: string | number | boolean | null;
  readonly items?: JsonSchemaFragment;
}

/**
 * The TOP-LEVEL object shape a command descriptor's `inputSchema` /
 * `outputSchema` carries. Structurally a `JsonSchemaFragment` pinned to
 * `type:'object'` — assignable to `@czap/_spine`'s `CommandJsonSchema` (the
 * `properties` values are `unknown` there; here they are typed fragments).
 */
export interface JsonSchemaObject extends JsonSchemaFragment {
  readonly type: 'object';
  readonly properties: Readonly<Record<string, JsonSchemaFragment>>;
  readonly required?: readonly string[];
}

/** A JSON primitive — the only literal kinds `Literal`/`enum`/`const` model. */
type JsonPrimitive = string | number | boolean | null;

/** Build the tagged `UnsupportedError` thrown when a node has no sound mapping. */
function unsupported(nodeTag: string, hint?: string): UnsupportedError {
  return UnsupportedError(
    nodeTag,
    `json-schema-from-schema: AST node "${nodeTag}" cannot be derived to the structural JSON-Schema dialect${
      hint ? ` (${hint})` : ''
    }`,
  );
}

/**
 * A `Schema.optional(...)` field surfaces in the AST as a union of the inner
 * type and `Undefined`, carrying `context.isOptional === true`. The DERIVED schema for
 * such a field is the INNER type's schema (the field's presence/absence is
 * carried by `required`, not by a `| undefined` member) — so we strip the
 * `Undefined` member and derive the remaining type. Returns the inner AST when
 * the node is an optional-wrapping union, else `undefined`.
 */
function _optionalInner(ast: SchemaAST.AST): SchemaAST.AST | undefined {
  if (ast._tag !== 'Union') return undefined;
  const u = ast as SchemaAST.Union;
  const nonUndefined = u.types.filter((t) => t._tag !== 'Undefined' && t._tag !== 'Void');
  if (nonUndefined.length === u.types.length) return undefined; // no Undefined member
  if (nonUndefined.length === 1) return nonUndefined[0];
  // A residual MULTI-member union after stripping `Undefined` (e.g. a flattened
  // `optional(A) | optional(B)` if Effect ever surfaces one). We do NOT
  // synthesize a replacement AST node — instead we return `undefined` so the
  // caller falls back to deriving the ORIGINAL union node via the Union arm.
  // That arm treats the surviving `Undefined` member as a non-literal,
  // non-`Null` member and throws `UnsupportedError` — the sound outcome (no
  // silent widening, no dropped constraint). The common Effect shape is the
  // single-member case above (`optional(T)` → `Union[T, Undefined]`, and
  // `optional(A | B)` → `Union[ Union[A,B], Undefined ]`), so this branch is the
  // honest guard for shapes the deriver cannot soundly represent.
  return undefined;
}

/**
 * Is this AST a literal node? (Effect models `Schema.Literal(v)` as a `Literal`
 * node whose `.literal` is the value.) `null` is modelled as a distinct `Null`
 * node, not a `Literal`, and is handled separately by the nullable path.
 */
function _literalValue(ast: SchemaAST.AST): { readonly value: JsonPrimitive } | undefined {
  if (ast._tag === 'Literal') {
    const lit = (ast as SchemaAST.Literal).literal;
    // Effect `Literal` admits string | number | boolean | bigint | null. A
    // bigint literal has no sound JSON-Schema representation (JSON has no
    // bigint); reject it rather than coerce.
    if (typeof lit === 'bigint') {
      throw unsupported('Literal', 'bigint literal has no JSON-Schema representation');
    }
    return { value: lit as JsonPrimitive };
  }
  if (ast._tag === 'Null') return { value: null };
  return undefined;
}

/**
 * Derive a `Union` node. Two sound shapes in this dialect:
 *   1. ALL members are literals (string/number/boolean/null) → `{ enum: [...] }`.
 *      This is the dialect's literal-set form (`Schema.Literal('a','b')` and a
 *      `Union` of single `Literal`s both land here).
 *   2. EXACTLY ONE non-`Null` member plus a `Null` member → the member's
 *      schema widened to ALSO allow `'null'` (a nullable scalar/object).
 *
 * Any other union (heterogeneous non-literal members) is REJECTED: the dialect
 * has no `anyOf`/`oneOf`, so deriving anything looser would silently drop a
 * constraint — the deriver never launders a lost constraint into a vacuous
 * widening.
 */
function _deriveUnion(ast: SchemaAST.Union): JsonSchemaFragment {
  const members = ast.types;
  if (members.length === 0) throw unsupported('Union', 'empty union');

  // Shape 1: every member is a literal → enum.
  const literalValues: JsonPrimitive[] = [];
  let allLiterals = true;
  for (const m of members) {
    const lit = _literalValue(m);
    if (lit === undefined) {
      allLiterals = false;
      break;
    }
    literalValues.push(lit.value);
  }
  if (allLiterals) {
    return { enum: literalValues };
  }

  // Shape 2: nullable — exactly one non-Null member + at least one Null member.
  const nullMembers = members.filter((m) => m._tag === 'Null');
  const nonNull = members.filter((m) => m._tag !== 'Null');
  if (nullMembers.length >= 1 && nonNull.length === 1) {
    const inner = nonNull[0];
    if (inner === undefined) throw unsupported('Union', 'nullable inner member missing');
    return _withNull(_derive(inner));
  }

  throw unsupported(
    'Union',
    `heterogeneous non-literal union (${members
      .map((m) => m._tag)
      .join(' | ')}) has no sound form in the structural dialect (no anyOf/oneOf)`,
  );
}

/**
 * Widen a derived fragment to ALSO accept `null`. The structural validator's
 * `type` field accepts a string OR an array of strings, so a nullable scalar
 * becomes `{ type: [<base>, 'null'] }`. A fragment with no `type` (e.g. an
 * `enum`/`const` form) gains `null` into its literal set so the nullable
 * constraint is still enforced — never dropped.
 */
function _withNull(fragment: JsonSchemaFragment): JsonSchemaFragment {
  if (fragment.type !== undefined) {
    const base = Array.isArray(fragment.type) ? fragment.type : [fragment.type as string];
    if (base.includes('null')) return fragment;
    return { ...fragment, type: [...base, 'null'] };
  }
  if (fragment.enum !== undefined) {
    return fragment.enum.includes(null) ? fragment : { ...fragment, enum: [...fragment.enum, null] };
  }
  if (fragment.const !== undefined) {
    return { enum: [fragment.const, null] };
  }
  // No type/enum/const to widen — e.g. a bare object fragment without an
  // explicit type. Refuse rather than emit an un-nullable schema that would
  // silently reject the null the source schema admits.
  throw unsupported('Union', 'cannot widen a typeless fragment to nullable without dropping the null constraint');
}

/** Derive an `Arrays` node. Only `Schema.Array(T)` (uniform element) is sound
 * for the dialect's single-`items` form; fixed tuples and tuple+rest shapes have
 * no faithful representation in a `{ type:'array', items }` model, so they throw. */
function _deriveArrays(ast: SchemaAST.Arrays): JsonSchemaFragment {
  // Schema.Array(T): elements=[], rest=[T].
  if (ast.elements.length === 0 && ast.rest.length === 1) {
    const elem = ast.rest[0];
    if (elem === undefined) throw unsupported('Arrays', 'rest[0] missing');
    return { type: 'array', items: _derive(elem) };
  }
  throw unsupported(
    'Arrays',
    `only Schema.Array(T) (uniform element) maps to the dialect's items form (got elements=${ast.elements.length}, rest=${ast.rest.length})`,
  );
}

/**
 * Derive a `TypeLiteral` (`Schema.Struct`) into the top-level object shape.
 * Each property signature becomes a `properties` entry; a property is in
 * `required` iff its type carries no `context.isOptional` flag (the marker
 * `Schema.optional(...)` sets). Index signatures are rejected — the dialect has
 * no `additionalProperties` / pattern-property model, so an open record cannot
 * be derived without dropping the open-ness constraint.
 */
function _deriveObject(ast: SchemaAST.Objects): JsonSchemaObject {
  if (ast.indexSignatures.length > 0) {
    throw unsupported(
      'Objects',
      'index signatures have no structural-dialect representation (no additionalProperties)',
    );
  }
  const properties: Record<string, JsonSchemaFragment> = {};
  const required: string[] = [];
  for (const ps of ast.propertySignatures) {
    const key = String(ps.name);
    const isOptional = ps.type.context?.isOptional === true;
    const fieldAst = isOptional ? (_optionalInner(ps.type) ?? ps.type) : ps.type;
    properties[key] = _derive(fieldAst);
    if (!isOptional) required.push(key);
  }
  // Stable, source-order properties; `required` only when non-empty (matches the
  // hand-written command outputSchemas, which omit `required` when all-optional).
  return required.length > 0 ? { type: 'object', properties, required } : { type: 'object', properties };
}

/** Recursive AST → JSON-Schema-fragment walk. Throws `UnsupportedError` on any
 * node with no sound mapping in the structural dialect. */
function _derive(ast: SchemaAST.AST): JsonSchemaFragment {
  switch (ast._tag) {
    case 'String':
      return { type: 'string' };
    case 'Number':
      return { type: 'number' };
    case 'Boolean':
      return { type: 'boolean' };
    case 'Literal': {
      const lit = _literalValue(ast);
      // _literalValue never returns undefined for a 'Literal' tag (it either
      // returns a value or throws on bigint), but the guard keeps the type sound.
      if (lit === undefined) throw unsupported('Literal', 'unreadable literal');
      return { const: lit.value };
    }
    case 'Null':
      // A bare `Schema.Null` — the only conforming value is `null`.
      return { type: 'null' };
    case 'Unknown':
    case 'Any':
      // The empty schema `{}` — accepts ANY value, soundly. This is the
      // faithful JSON-Schema image of `Schema.Unknown` / `Schema.Any` (no type
      // constraint), and is exactly what command payloads of opaque elements
      // use — e.g. `findings: Schema.Array(Schema.Unknown)` derives to
      // `{ type:'array', items:{} }`, equivalent to the hand-written
      // `{ type:'array' }` (the structural validator does not inspect array
      // elements). No constraint is dropped: `Unknown` HAS no constraint.
      return {};
    case 'Union':
      return _deriveUnion(ast as SchemaAST.Union);
    case 'Arrays':
      return _deriveArrays(ast as SchemaAST.Arrays);
    case 'Objects':
      return _deriveObject(ast as SchemaAST.Objects);
    case 'Suspend':
      return _derive((ast as SchemaAST.Suspend).thunk());
    default:
      throw unsupported(ast._tag);
  }
}

/**
 * Walk a `Schema` AST and derive the JSON-Schema OBJECT a command descriptor's
 * `inputSchema` / `outputSchema` carries. The top-level schema MUST be a
 * `Schema.Struct` (`TypeLiteral`) — a command's I/O contract is always an
 * object — so the result is the tighter `JsonSchemaObject`
 * (`{ type:'object', properties, required? }`). Throws `UnsupportedError` when
 * the root is not an object, or when any nested node has no sound mapping in the
 * structural dialect.
 *
 * Accepts any `Schema.Schema<T>` — only `.ast` is read.
 */
export function schemaToJsonSchema<T>(schema: Schema.Schema<T>): JsonSchemaObject {
  const ast = schema.ast;
  if (ast._tag !== 'Objects') {
    throw unsupported(ast._tag, 'a command I/O schema must be a Schema.Struct (object) at the top level');
  }
  return _deriveObject(ast as SchemaAST.Objects);
}
