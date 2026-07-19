/**
 * arbitrary-from-schema — derive a `fast-check` arbitrary from a KERNEL
 * {@link Schema} value. Used by the harness templates so generated property
 * tests feed real, schema-conformant inputs into capsule run handlers.
 *
 * The kernel successor of the Effect-`SchemaAST` walker: where that read an
 * `effect` AST, this walks the frozen plain-data {@link SchemaNode} union of the
 * schema kernel (`../schema/ast.ts`), discriminated by `kind`. The module PATH
 * and the {@link schemaToArbitrary} export NAME are preserved so the generated
 * test import strings (`${arbitraryImport}`) and the `capsule:compile` derivability
 * probes keep resolving without change.
 *
 * COVERAGE (the structurally-sampleable subset of the closed node vocabulary):
 *   - `string` / `number` / `boolean`      → `fc.string` / `fc.integer` / `fc.boolean`
 *   - `literal`                            → `fc.constant(value)`
 *   - `union`                              → `fc.oneof(...members)`
 *   - `struct` (required + optional keys)  → `fc.record`, optional keys randomly dropped
 *   - `array(T)`                           → `fc.array`
 *   - `tuple(...E)`                        → `fc.tuple` of the per-position arbitraries
 *   - `record(V)`                          → `fc.dictionary` with poison-safe keys
 *   - `unknown` / `any`                    → `fc.anything`
 *
 * EXPLICIT OVERRIDE: a schema may carry an author-supplied arbitrary THUNK via
 * `S.withArbitrary` (annotation key {@link ArbitraryAnnotationId}). The walker
 * honours that thunk ahead of structural derivation — the canonical way to sample
 * a narrow valid domain a structural walk can't reach. This is the SANCTIONED path
 * for the two node families structural walking must refuse:
 *   - `bytes` — an opaque binary carrier (`S.bytes(Uint8Array)`): random bytes
 *     conform to the carrier yet miss the handler's real domain (canonical CBOR
 *     bytes ⊂ `Uint8Array`), so the author attaches a generator that samples the
 *     valid subset.
 *   - `brand` — a nominal refinement (`S.brand(base, smartConstructor)`): a brand
 *     narrows to a valid SUBSET, so sampling the wider base and hoping it passes
 *     the smart constructor would be silent widening; the author attaches a
 *     generator that produces valid branded values.
 *
 * REFUSED — a tagged {@link UnsupportedError} (`@liteship/error`), never a silent
 * fallback (honest skip):
 *   - `bytes` / `brand` WITHOUT a `withArbitrary` thunk (the opaque / narrow
 *     families above — justified refusal, never silent widening)
 *   - `hole` — a typed hole is decode-blocking and carries no value to sample
 *
 * @module
 */
import * as fc from 'fast-check';
import { assertNever, UnsupportedError } from '@liteship/error';
import { annotatedArbitrary } from '../schema/ast.js';
import type { Schema, SchemaNode, StructField } from '../schema/ast.js';

// Re-exported so the GENERATED test templates (which import their helpers from
// this module via `${arbitraryImport}`) can `hasTag(err, 'UnsupportedError')`
// on a caught derivation failure without a second import specifier.
export { hasTag } from '@liteship/error';

// Re-exported so this module's documented explicit-override surface stays
// self-contained: `withArbitrary` attaches the generator thunk the walker reads,
// and {@link ArbitraryAnnotationId} is the annotation key it lives under. Both are
// the kernel's canonical symbols — re-exported, never re-defined, so there is a
// single annotation key across the schema kernel and the harness walker.
export { withArbitrary } from '../schema/constructors.js';
export { ArbitraryAnnotationId } from '../schema/ast.js';

/** The three property keys that must never be materialised from generated data. */
const POISON_KEYS: ReadonlySet<string> = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Build the tagged `UnsupportedError` thrown when a node has no supported
 * arbitrary mapping. `subject` is the node `kind`; the detail names why the node
 * cannot be sampled so honest-skip reporting points at the exact refusal.
 */
function unsupportedSchema(subject: string, hint?: string): UnsupportedError {
  return UnsupportedError(
    subject,
    `arbitrary-from-schema: schema node "${subject}" is not structurally sampleable${hint ? ` (${hint})` : ''}`,
  );
}

/**
 * Read an author-supplied `S.withArbitrary` thunk off a node, when present, and
 * invoke it. Returns the BUILT arbitrary (the thunk called once), or `undefined`
 * when the node carries no such annotation — in which case the walker falls
 * through to structural derivation. A thunk that returns a non-Arbitrary throws
 * `UnsupportedError` rather than silently producing garbage.
 */
function annotatedArb(node: SchemaNode): fc.Arbitrary<unknown> | undefined {
  const thunk = annotatedArbitrary(node);
  if (thunk === undefined) return undefined;
  // Provide fast-check to the thunk: the kernel/capsules declare the arbitrary
  // contract without importing the engine — the harness (which legitimately owns
  // fast-check) supplies the realization here.
  const arb = thunk(fc);
  if (arb === undefined || arb === null || typeof (arb as { generate?: unknown }).generate !== 'function') {
    throw unsupportedSchema(node.kind, 'the withArbitrary thunk did not return a fast-check Arbitrary');
  }
  return arb as fc.Arbitrary<unknown>;
}

/** A struct field's arbitrary plus the presence law that decides whether the key may be dropped. */
interface FieldArb {
  readonly key: string;
  readonly arb: fc.Arbitrary<unknown>;
  readonly optional: boolean;
}

/**
 * Build a record arbitrary for a `struct` node. Required fields are always
 * present; each optional field is independently, randomly dropped so both the
 * present and absent branches of the decoder are exercised over a run.
 */
function structArb(fields: readonly StructField[]): fc.Arbitrary<Record<string, unknown>> {
  const fieldArbs: FieldArb[] = fields.map((field) => ({
    key: field.key,
    arb: walk(field.node),
    optional: field.optional,
  }));
  const allKeys: Record<string, fc.Arbitrary<unknown>> = {};
  for (const field of fieldArbs) allKeys[field.key] = field.arb;
  const optionalKeys = fieldArbs.filter((field) => field.optional).map((field) => field.key);
  if (optionalKeys.length === 0) return fc.record(allKeys);
  // Generate every key, then drop a random subset of the optional ones. `chain`
  // couples the drop flags to the produced record so shrinking stays coherent.
  return fc.record(allKeys).chain((record) =>
    fc.tuple(...optionalKeys.map(() => fc.boolean())).map((dropFlags) => {
      const out: Record<string, unknown> = { ...record };
      for (let i = 0; i < optionalKeys.length; i++) {
        if (dropFlags[i] === true) {
          const key = optionalKeys[i];
          if (key !== undefined) delete out[key];
        }
      }
      return out;
    }),
  );
}

/**
 * Walk one kernel {@link SchemaNode} and return a `fc.Arbitrary` whose samples
 * strict-decode cleanly through the node. An author-supplied arbitrary wins over
 * structural derivation — it is how a schema declares a narrow valid domain (an
 * opaque `bytes` carrier, a nominal `brand`) the walker could not otherwise reach.
 */
function walk(node: SchemaNode): fc.Arbitrary<unknown> {
  const annotated = annotatedArb(node);
  if (annotated !== undefined) return annotated;
  switch (node.kind) {
    case 'string':
      return fc.string();
    case 'number':
      // Integer is safer than float — avoids NaN/Infinity which trip most
      // user-defined invariants. A capsule that needs floats brands the field.
      return fc.integer();
    case 'boolean':
      return fc.boolean();
    case 'literal':
      return fc.constant(node.value);
    case 'unknown':
    case 'any':
      return fc.anything();
    case 'union': {
      if (node.members.length === 0) throw unsupportedSchema('union', 'empty union');
      return fc.oneof(...node.members.map(walk));
    }
    case 'struct':
      return structArb(node.fields);
    case 'array':
      return fc.array(walk(node.element), { maxLength: 8 });
    case 'tuple':
      // A fixed-arity tuple → `fc.tuple` of the per-position element arbitraries,
      // so every sample has exactly the tuple's arity and strict-decodes cleanly.
      return fc.tuple(...node.elements.map(walk));
    case 'record': {
      // Keys are drawn from a poison-safe alphabet: `__proto__`/`constructor`/
      // `prototype` would be REJECTED by the strict decoder (schema/poison-key),
      // so excluding them keeps every sample decode-clean.
      const safeKey = fc.string({ minLength: 1, maxLength: 12 }).filter((key) => !POISON_KEYS.has(key));
      return fc.dictionary(safeKey, walk(node.value), { maxKeys: 6 });
    }
    case 'bytes':
      throw unsupportedSchema(
        'bytes',
        'an opaque binary carrier — attach an `S.withArbitrary` thunk to sample its valid subset',
      );
    case 'brand':
      throw unsupportedSchema(
        'brand',
        'a nominal refinement narrows to a valid subset — attach an `S.withArbitrary` thunk to sample it',
      );
    case 'hole':
      throw unsupportedSchema('hole', 'a typed hole is decode-blocking and carries no value to sample');
    default:
      return assertNever(node, 'schema node');
  }
}

/**
 * Walk a kernel {@link Schema} value and return a `fc.Arbitrary` that produces
 * values which strict-decode cleanly through the schema. Throws
 * {@link UnsupportedError} on nodes with no structural mapping and no
 * `withArbitrary` override. Only `.ast` is read.
 */
function _schemaToArbitrary<A, I>(schema: Schema<A, I>): fc.Arbitrary<A> {
  return walk(schema.ast) as fc.Arbitrary<A>;
}

/** Public namespace for the arbitrary-from-schema walker. */
export const ArbitraryFromSchema = {
  fromSchema: _schemaToArbitrary,
} as const;

/** Convenience top-level export — most call sites use this directly. */
export const schemaToArbitrary = _schemaToArbitrary;

export declare namespace ArbitraryFromSchema {
  /** The result type returned by {@link ArbitraryFromSchema.fromSchema}. */
  export type Result<A> = fc.Arbitrary<A>;
}
