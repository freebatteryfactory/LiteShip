/**
 * to-json-schema — derive a JSON-Schema object from a KERNEL {@link Schema} value.
 *
 * The kernel successor of `json-schema-from-schema.ts`: where that walks an
 * Effect `SchemaAST.AST`, this walks the frozen plain-data {@link SchemaNode}
 * union of the schema kernel (`./ast.ts`). It derives the SAME
 * `CommandJsonSchema` / `validateStructural` dialect — `type`, `properties`,
 * `required`, `enum`, `const`, `items` — so command descriptors, CLI receipts,
 * and MCP `tools/list` keep byte-compatible output across the swap (the parity
 * fixture in `tests/fixtures/json-schema-parity/` is the cage).
 *
 * DIALECT (the sound subset — identical coverage envelope to the Effect deriver):
 *   - struct              → `{ type:'object', properties, required:[non-optional] }`
 *   - string/number/boolean → `{ type:'string'|'number'|'boolean' }`
 *   - literal (singleton) → `{ const: value }`
 *   - union of literals   → `{ enum: [...] }`
 *   - array(T)            → `{ type:'array', items: <derived element> }`
 *   - nullable (T | null) → the member type widened to also allow `'null'`
 *   - unknown/any         → `{}` (the empty schema — accepts anything, soundly)
 *   - brand(base)         → the derived BASE shape (the refinement has no
 *                           JSON-Schema image beyond its base)
 *   - nested struct/array → recursed
 *
 * UNSUPPORTED — a tagged `UnsupportedError` (`@czap/error`), NEVER a silent
 * fallback: `bytes` and `hole` declaration nodes (the opaque family — no sound
 * JSON-Schema image), open `record` index signatures (the dialect has no
 * `additionalProperties`), and heterogeneous non-literal unions (no
 * `anyOf`/`oneOf`). The error names the node `kind` so the command migration
 * sees the exact coverage envelope.
 *
 * @module
 */
import { UnsupportedError } from '@czap/error';
import type { LiteralValue, Schema, SchemaNode, StructNode, UnionNode } from './ast.js';

// The derived JSON-Schema dialect (the CommandJsonSchema / validateStructural
// subset). Declared as OBJECT-LITERAL `type` aliases (not `interface`) so they
// carry the implicit index signature that makes them assignable to the
// `Record<string, unknown>` the StandardJSONSchema converter returns — no cast.

/** A derived JSON-Schema fragment. Every field optional at the fragment level. */
export type JsonSchemaFragment = {
  readonly type?: string | readonly string[];
  readonly properties?: Readonly<Record<string, JsonSchemaFragment>>;
  readonly required?: readonly string[];
  readonly enum?: readonly LiteralValue[];
  readonly const?: LiteralValue;
  readonly items?: JsonSchemaFragment;
};

/** The top-level object a command I/O contract carries — a fragment pinned to `type:'object'`. */
export type JsonSchemaObject = {
  readonly type: 'object';
  readonly properties: Readonly<Record<string, JsonSchemaFragment>>;
  readonly required?: readonly string[];
};

/** Build the tagged `UnsupportedError` thrown when a node has no sound mapping. */
function unsupported(kind: string, hint?: string): UnsupportedError {
  return UnsupportedError(
    kind,
    `to-json-schema: AST node "${kind}" cannot be derived to the structural JSON-Schema dialect${
      hint ? ` (${hint})` : ''
    }`,
  );
}

/** The literal value of a `literal` node, else `undefined`. */
function _literalValue(node: SchemaNode): { readonly value: LiteralValue } | undefined {
  return node.kind === 'literal' ? { value: node.value } : undefined;
}

/** True iff the node is a `literal` pinned to `null` — the nullable-union sentinel. */
function _isNullLiteral(node: SchemaNode): boolean {
  return node.kind === 'literal' && node.value === null;
}

/**
 * Widen a derived fragment to ALSO accept `null` — the nullable-scalar image.
 * A `type` fragment gains `'null'` into its type list; an `enum`/`const` gains
 * `null` into its literal set. A typeless fragment refuses (widening it would
 * drop the `null` the source admits).
 */
function _withNull(fragment: JsonSchemaFragment): JsonSchemaFragment {
  if (fragment.type !== undefined) {
    const base = Array.isArray(fragment.type) ? fragment.type : [fragment.type as string];
    return base.includes('null') ? fragment : { ...fragment, type: [...base, 'null'] };
  }
  if (fragment.enum !== undefined) {
    return fragment.enum.includes(null) ? fragment : { ...fragment, enum: [...fragment.enum, null] };
  }
  if (fragment.const !== undefined) {
    return { enum: [fragment.const, null] };
  }
  throw unsupported('union', 'cannot widen a typeless fragment to nullable without dropping the null constraint');
}

/**
 * Derive a `union` node. Two sound shapes: ALL members literals → `{ enum }`;
 * exactly ONE non-null member plus at least one `literal(null)` → the member
 * widened to allow `null`. Any other union is REJECTED (no `anyOf`/`oneOf` in
 * the dialect — widening would silently drop a constraint).
 */
function _deriveUnion(node: UnionNode): JsonSchemaFragment {
  const members = node.members;
  if (members.length === 0) throw unsupported('union', 'empty union');

  const literalValues: LiteralValue[] = [];
  let allLiterals = true;
  for (const member of members) {
    const lit = _literalValue(member);
    if (lit === undefined) {
      allLiterals = false;
      break;
    }
    literalValues.push(lit.value);
  }
  if (allLiterals) return { enum: literalValues };

  const nullMembers = members.filter(_isNullLiteral);
  const nonNull = members.filter((m) => !_isNullLiteral(m));
  const inner = nonNull[0];
  if (nullMembers.length >= 1 && nonNull.length === 1 && inner !== undefined) {
    return _withNull(_derive(inner));
  }

  throw unsupported(
    'union',
    `heterogeneous non-literal union (${members.map((m) => m.kind).join(' | ')}) has no sound form in the structural dialect`,
  );
}

/**
 * Derive a `struct` node into the top-level object shape. Each field becomes a
 * `properties` entry; a field is in `required` iff it is NOT optional. `required`
 * is omitted entirely when every field is optional (matches the hand-written
 * command outputSchemas). Fields keep source order.
 */
function _deriveStruct(node: StructNode): JsonSchemaObject {
  const properties: Record<string, JsonSchemaFragment> = {};
  const required: string[] = [];
  for (const field of node.fields) {
    properties[field.key] = _derive(field.node);
    if (!field.optional) required.push(field.key);
  }
  return required.length > 0 ? { type: 'object', properties, required } : { type: 'object', properties };
}

/** Recursive node → JSON-Schema-fragment walk. Throws `UnsupportedError` on any unmappable node. */
function _derive(node: SchemaNode): JsonSchemaFragment {
  switch (node.kind) {
    case 'string':
      return { type: 'string' };
    case 'number':
      return { type: 'number' };
    case 'boolean':
      return { type: 'boolean' };
    case 'literal':
      return { const: node.value };
    case 'unknown':
    case 'any':
      // The empty schema `{}` — accepts ANY value, soundly. `Unknown`/`Any` HAVE
      // no constraint, so none is dropped (e.g. `array(unknown)` → items:{}).
      return {};
    case 'union':
      return _deriveUnion(node);
    case 'struct':
      return _deriveStruct(node);
    case 'array':
      return { type: 'array', items: _derive(node.element) };
    case 'brand':
      // A brand is a runtime refinement with no JSON-Schema image beyond its
      // base — derive the base shape.
      return _derive(node.base);
    case 'record':
      throw unsupported('record', 'an open record has no structural-dialect representation (no additionalProperties)');
    case 'bytes':
      throw unsupported('bytes', 'an opaque binary carrier has no JSON-Schema image');
    case 'hole':
      throw unsupported('hole', 'a typed hole is decode-blocking and never emitted');
  }
}

/** Follow a chain of `brand` nodes to the underlying base node. */
function _unwrapBrand(node: SchemaNode): SchemaNode {
  let current = node;
  while (current.kind === 'brand') current = current.base;
  return current;
}

/**
 * Walk a kernel {@link Schema} value and derive the JSON-Schema OBJECT a command
 * descriptor's `inputSchema` / `outputSchema` carries. The root must be a
 * `struct` (a command I/O contract is always an object); a top-level `brand` is
 * followed to its base first. Throws `UnsupportedError` when the root is not an
 * object, or when any nested node has no sound mapping in the structural dialect.
 */
export function toJsonSchema(schema: Schema<unknown, unknown>): JsonSchemaObject {
  const root = _unwrapBrand(schema.ast);
  if (root.kind !== 'struct') {
    throw unsupported(root.kind, 'a command I/O schema must be a struct (object) at the top level');
  }
  return _deriveStruct(root);
}
