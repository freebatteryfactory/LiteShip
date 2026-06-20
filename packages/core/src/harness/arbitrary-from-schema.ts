/**
 * arbitrary-from-schema — derive a `fast-check` arbitrary from an Effect
 * `Schema.Codec<T>`. Used by the harness templates so generated property
 * tests feed real, schema-conformant inputs into capsule run handlers.
 *
 * Coverage: scalars (String, Number, Boolean, BigInt), Literal,
 * Null/Undefined/Void, Unknown/Any, ObjectKeyword, Enum, Union, Array
 * (Schema.Array + fixed Tuple + NonEmptyArray-style elements+rest),
 * TypeLiteral (Struct with optional property signatures), Suspend,
 * Declaration (Date and Uint8Array; throws for genuinely-opaque
 * user declarations), TemplateLiteral (Schema.TemplateLiteral —
 * the literal/scalar `parts` are concatenated into a conforming
 * string), Transformation (Schema.transform / decodeTo chains —
 * recurse into the decoded `to` side the handler actually receives),
 * and AST-level `checks` (Filter / FilterGroup) which model
 * refinements such as `Schema.NonEmptyString` and
 * `Schema.minLength(n)` — these post-filter the underlying arbitrary
 * by running each Filter's predicate.
 *
 * EXPLICIT OVERRIDE: a schema may carry an author-supplied arbitrary via
 * {@link ArbitraryAnnotationId} (attach it with {@link withArbitrary}). The
 * walker honours that thunk ahead of structural derivation — the canonical way
 * to sample a narrow valid domain a structural walk can't reach (e.g.
 * "canonical CBOR bytes" is a generated subset of `Uint8Array`, not every byte
 * string).
 *
 * STILL UNSUPPORTED (throw `UnsupportedError`, honest skip):
 *   - Objects with index signatures (open record shapes)
 *   - Declaration for opaque user types that are neither Date nor
 *     Uint8Array (e.g. `Schema.instanceOf(SomeUserClass)`) AND carry no
 *     {@link ArbitraryAnnotationId} override
 *
 * @module
 */
import { Effect } from 'effect';
import type { Schema, SchemaAST } from 'effect';
import * as fc from 'fast-check';
import { UnsupportedError } from '@czap/error';

// Re-exported so the GENERATED test templates (which import their helpers from
// this module via `${arbitraryImport}`) can `hasTag(err, 'UnsupportedError')`
// on a caught derivation failure without a second import specifier.
export { hasTag } from '@czap/error';

/**
 * Build the tagged `UnsupportedError` thrown when an AST node has no supported
 * arbitrary mapping. `subject` is the AST node tag (the old `nodeTag`); the
 * detail mirrors the previous message so honest-skip reporting is unchanged.
 */
function unsupportedSchema(nodeTag: string, hint?: string): UnsupportedError {
  return UnsupportedError(
    nodeTag,
    `arbitrary-from-schema: AST node "${nodeTag}" is not supported${hint ? ` (${hint})` : ''}`,
  );
}

/**
 * Annotation key for an explicit, schema-authored fast-check arbitrary. A
 * schema whose VALID domain is a generated SUBSET of an opaque carrier type —
 * e.g. "canonical CBOR bytes" is a subset of `Uint8Array`, not every byte
 * string — cannot be sampled by structural walking: random `fc.uint8Array()`
 * bytes are conformant to the carrier (`instanceOf(Uint8Array)`) yet outside
 * the handler's real domain. The author who KNOWS how to generate valid
 * values attaches that generator here via {@link withArbitrary}; the walker
 * honours it ahead of structural derivation. This is the canonical, shared
 * hook for "the input schema under-specifies the handler's domain" — the fix
 * lives ON the schema (a branded smart constructor), not in a per-capsule
 * harness hack.
 *
 * The annotated value is a THUNK (`() => fc.Arbitrary<unknown>`) so the
 * arbitrary is built lazily at walk time, never eagerly at module load.
 */
export const ArbitraryAnnotationId: unique symbol = Symbol.for('@czap/core/harness/arbitrary');

/** The thunk shape an {@link ArbitraryAnnotationId} annotation carries. */
export type ArbitraryAnnotation = () => fc.Arbitrary<unknown>;

/**
 * Brand a schema with an explicit arbitrary generator (see
 * {@link ArbitraryAnnotationId}). The result is the SAME schema for parsing /
 * encoding — only its harness-sampling behaviour changes. Use this to express
 * a narrow valid domain a structural walk can't reach (e.g.
 * `withArbitrary(Schema.instanceOf(Uint8Array), () => fc.anything().map(CanonicalCbor.encode))`).
 */
export function withArbitrary<S extends Schema.Schema<unknown>>(schema: S, arbitrary: ArbitraryAnnotation): S {
  // Effect 4's `.annotate({...})` merges a custom annotation onto the AST node;
  // it survives onto `ast.annotations[ArbitraryAnnotationId]` (probed) and is
  // read back by `_annotatedArbitrary` below. Routed through `unknown` because
  // the `annotate` signature's `~rebuild.out` is not provably `S`.
  const annotate = (
    schema as unknown as {
      annotate: (a: Record<symbol, unknown>) => S;
    }
  ).annotate;
  return annotate.call(schema, { [ArbitraryAnnotationId]: arbitrary });
}

/**
 * Read an explicit {@link ArbitraryAnnotationId} arbitrary thunk off an AST
 * node, when present. Returns the BUILT arbitrary (the thunk invoked once), or
 * `undefined` when the node carries no such annotation — in which case the
 * walker falls through to structural derivation.
 */
function _annotatedArbitrary(ast: SchemaAST.AST): fc.Arbitrary<unknown> | undefined {
  const annotations = (ast as { annotations?: Record<symbol, unknown> }).annotations;
  if (annotations === undefined) return undefined;
  const thunk = annotations[ArbitraryAnnotationId];
  if (typeof thunk !== 'function') return undefined;
  const arb = (thunk as ArbitraryAnnotation)();
  if (arb === undefined || typeof (arb as { generate?: unknown }).generate !== 'function') {
    throw unsupportedSchema(ast._tag, 'ArbitraryAnnotationId thunk did not return a fast-check Arbitrary');
  }
  return arb;
}

/**
 * Apply post-type-match `checks` (Filter / FilterGroup) declared on the
 * AST node to the produced arbitrary. Each Filter's `run` returns
 * `Issue | undefined`; `undefined` means the input passed. We compose all
 * checks and `.filter` the arbitrary so only conforming samples survive.
 *
 * fast-check throws if the filter rejection rate exceeds ~10%. For
 * common refinements (NonEmptyString, minLength) the underlying
 * arbitrary already biases toward populated values so rejection stays
 * well below the threshold.
 */
function _applyChecks(ast: SchemaAST.AST, arb: fc.Arbitrary<unknown>): fc.Arbitrary<unknown> {
  const checks = ast.checks;
  if (checks === undefined || checks.length === 0) return arb;
  return arb.filter((sample) => {
    for (const check of checks) {
      if (check._tag === 'Filter') {
        // ParseOptions is opaque — pass an empty object; the runtime
        // tolerates missing fields for filter execution.
        const issue = (check as SchemaAST.Filter<unknown>).run(sample, ast, {} as SchemaAST.ParseOptions);
        if (issue !== undefined) return false;
      } else if (check._tag === 'FilterGroup') {
        const group = check as SchemaAST.FilterGroup<unknown>;
        for (const inner of group.checks) {
          if (inner._tag === 'Filter') {
            const issue = (inner as SchemaAST.Filter<unknown>).run(sample, ast, {} as SchemaAST.ParseOptions);
            if (issue !== undefined) return false;
          }
          // Nested FilterGroup is theoretically possible but rare;
          // ignore for now and let the outer test catch failures.
        }
      }
    }
    return true;
  });
}

/**
 * Read the `typeConstructor` annotation tag Effect attaches to its
 * built-in `Declaration` schemas (`Schema.Date`, `Schema.Uint8Array`,
 * …). The annotation shape is `{ typeConstructor: { _tag: string } }`.
 * Returns the tag string, or `undefined` for declarations Effect did
 * not annotate — e.g. `Schema.instanceOf(SomeClass)`, which carries no
 * annotations and so stays opaque (we never blanket-accept).
 */
function _declarationTypeTag(ast: SchemaAST.Declaration): string | undefined {
  const annotations = (ast as { annotations?: Record<string, unknown> }).annotations;
  if (annotations === undefined) return undefined;
  const tc = annotations['typeConstructor'];
  if (tc === null || typeof tc !== 'object') return undefined;
  const tag = (tc as { _tag?: unknown })._tag;
  return typeof tag === 'string' ? tag : undefined;
}

/**
 * Probe a `Declaration` node to determine the JavaScript class it accepts
 * and return a `fast-check` arbitrary producing values of that shape.
 *
 * Two recognised built-ins:
 *   - `Uint8Array` — matched by its `typeConstructor` annotation tag
 *     (`Schema.Uint8Array`); produces `fc.uint8Array()` samples.
 *   - `Date` — matched either by the annotation tag (`Schema.Date`) or,
 *     for the un-annotated `Schema.instanceOf(Date)` form, by running the
 *     node's parser against a sentinel `new Date()` and inspecting the
 *     success/failure tag.
 *
 * Genuinely-opaque user declarations (e.g. `Schema.instanceOf(MyClass)`,
 * which carry no `typeConstructor` annotation and reject the Date probe)
 * throw `UnsupportedError` — the harness then emits an honest skip
 * rather than a vacuous test. We never blanket-accept all declarations.
 */
/**
 * Run a `Declaration` node's parser against a sentinel value and report
 * whether it is accepted. The parser returns an Effect; we inspect its
 * synchronous success/failure tag without letting a parse failure throw.
 * Used to recognise the un-annotated `Schema.instanceOf(Ctor)` forms
 * (which carry no `typeConstructor` annotation).
 */
function _declarationAccepts(ast: SchemaAST.Declaration, sentinel: unknown): boolean {
  try {
    const parser = ast.run(ast.typeParameters);
    const out = parser(sentinel, ast, {} as SchemaAST.ParseOptions);
    const exit = Effect.runSyncExit(out as never);
    return exit._tag === 'Success';
  } catch {
    return false;
  }
}

function _arbitraryForDeclaration(ast: SchemaAST.Declaration): fc.Arbitrary<unknown> {
  // Fast path: Effect's built-in codecs annotate the constructor tag
  // (`Schema.Uint8Array`, `Schema.Date`).
  const typeTag = _declarationTypeTag(ast);
  if (typeTag === 'Uint8Array') return fc.uint8Array();
  if (typeTag === 'Date') return fc.date();

  // Un-annotated forms (`Schema.instanceOf(Uint8Array)`,
  // `Schema.instanceOf(Date)`) carry no annotation — probe the parser
  // with a sentinel of each recognised class. A genuinely-opaque user
  // declaration (`Schema.instanceOf(MyClass)`) rejects both sentinels
  // and falls through to the throw, so we never blanket-accept.
  if (_declarationAccepts(ast, new Uint8Array())) return fc.uint8Array();
  if (_declarationAccepts(ast, new Date())) return fc.date();

  throw unsupportedSchema('Declaration', 'opaque user-defined type — only Date and Uint8Array are recognised');
}

/**
 * Build a string arbitrary for a `TemplateLiteral` node. In Effect's AST a
 * template literal is modelled as an ordered `parts: ReadonlyArray<AST>`
 * where literal segments are `Literal` nodes (their `.literal` is the fixed
 * text) and interpolations are scalar nodes (`String`, `Number`, `BigInt`).
 * The decoded runtime value — the one a capsule handler receives — is the
 * single concatenated string. We generate each part and join them so every
 * sample matches the template pattern.
 *
 * Interpolated `String` parts are drawn from an alphanumeric alphabet rather
 * than `fc.string()` so that adjacent literal delimiters in the template
 * remain unambiguous (a raw `fc.string()` could emit a delimiter character
 * and produce a string the template's own regex rejects).
 */
function _arbitraryForTemplateLiteral(ast: SchemaAST.TemplateLiteral): fc.Arbitrary<string> {
  const partArbs: fc.Arbitrary<string>[] = ast.parts.map((part) => {
    switch (part._tag) {
      case 'Literal':
        return fc.constant(String((part as SchemaAST.Literal).literal));
      case 'Number':
        // A decimal-integer string parses back to a number cleanly.
        return fc.integer().map((n) => String(n));
      case 'BigInt':
        return fc.bigInt().map((n) => String(n));
      case 'String':
        // Non-empty alphanumeric keeps adjacent literal delimiters
        // unambiguous and avoids zero-width ambiguity at boundaries.
        return fc.stringMatching(/^[A-Za-z0-9]+$/);
      default:
        throw unsupportedSchema('TemplateLiteral', `unsupported interpolation part "${part._tag}"`);
    }
  });
  if (partArbs.length === 0) return fc.constant('');
  return fc.tuple(...partArbs).map((segments) => segments.join(''));
}

/**
 * A standalone `Transformation` AST node (`Schema.transform`,
 * `Schema.compose`, and most branded codecs in Effect's classic AST
 * shape) wraps a `from` (encoded/wire) AST and a `to` (decoded/runtime)
 * AST. The generated property test feeds DECODED values directly into
 * the capsule's `run` / `derive` handler — see pure-transform.ts
 * (`cap.run(sample)`) — so the arbitrary must come from the `to` side.
 *
 * In the Effect version this repo pins (4.x), transformations are not a
 * standalone AST variant: they ride a base type node's `encoding` field
 * and the node's own `_tag` is already the decoded type (e.g.
 * `Schema.NumberFromString.ast._tag === 'Number'`), which the switch
 * below handles directly. This guard therefore stays inert here but
 * keeps the walker correct against any AST that does surface a
 * standalone `Transformation` node, recursing into its decoded `to`.
 */
function _transformationTo(ast: SchemaAST.AST): SchemaAST.AST | undefined {
  if ((ast as { _tag: string })._tag !== 'Transformation') return undefined;
  const to = (ast as unknown as { to?: SchemaAST.AST }).to;
  if (to === undefined) {
    throw unsupportedSchema('Transformation', 'missing `to` (decoded) AST');
  }
  return to;
}

function walk(ast: SchemaAST.AST): fc.Arbitrary<unknown> {
  // An explicit author-supplied arbitrary wins over structural derivation —
  // it is how a schema declares a narrow valid domain (e.g. canonical CBOR
  // bytes) the walker could not otherwise reach. Applied checks still run so a
  // refinement layered atop the annotation is honoured.
  const annotated = _annotatedArbitrary(ast);
  if (annotated !== undefined) return _applyChecks(ast, annotated);
  const transformedTo = _transformationTo(ast);
  if (transformedTo !== undefined) return walk(transformedTo);
  let arb: fc.Arbitrary<unknown>;
  switch (ast._tag) {
    case 'String':
      arb = fc.string();
      break;
    case 'Number':
      // Integer is safer than float — avoids NaN/Infinity which trip
      // most user-defined invariants. Capsules that need floats can
      // refine via filter checks (not yet handled here).
      arb = fc.integer();
      break;
    case 'Boolean':
      arb = fc.boolean();
      break;
    case 'BigInt':
      arb = fc.bigInt();
      break;
    case 'Literal':
      arb = fc.constant((ast as SchemaAST.Literal).literal);
      break;
    case 'Null':
      arb = fc.constant(null);
      break;
    case 'Undefined':
    case 'Void':
      arb = fc.constant(undefined);
      break;
    case 'Unknown':
    case 'Any':
      arb = fc.anything();
      break;
    case 'ObjectKeyword':
      arb = fc.object();
      break;
    case 'Enum': {
      const enums = (ast as SchemaAST.Enum).enums;
      if (enums.length === 0) {
        throw unsupportedSchema('Enum', 'empty enum');
      }
      arb = fc.constantFrom(...enums.map(([, v]) => v));
      break;
    }
    case 'Union': {
      const u = ast as SchemaAST.Union;
      if (u.types.length === 0) {
        throw unsupportedSchema('Union', 'empty union');
      }
      const arbs = u.types.map(walk);
      // fc.oneof accepts an arbitraries-array as variadic args
      arb = fc.oneof(...arbs);
      break;
    }
    case 'Arrays': {
      const a = ast as SchemaAST.Arrays;
      // Common case: Schema.Array(T) yields elements=[], rest=[T]
      if (a.elements.length === 0 && a.rest.length === 1) {
        const elem = a.rest[0];
        if (elem === undefined) {
          throw unsupportedSchema('Arrays', 'rest[0] missing');
        }
        arb = fc.array(walk(elem), { maxLength: 8 });
        break;
      }
      // Fixed tuple
      if (a.rest.length === 0 && a.elements.length > 0) {
        const elemArbs = a.elements.map(walk);
        arb = fc.tuple(...elemArbs);
        break;
      }
      // Mixed: required leading element(s) + rest tail. NonEmptyArray
      // surfaces here as elements=[T], rest=[T] — generate the leading
      // tuple and append a variable-length tail of the same elem type.
      if (a.elements.length > 0 && a.rest.length === 1) {
        const headArbs = a.elements.map(walk);
        const tailElem = a.rest[0];
        if (tailElem === undefined) {
          throw unsupportedSchema('Arrays', 'rest[0] missing');
        }
        const tailArb = fc.array(walk(tailElem), { maxLength: 7 });
        arb = fc.tuple(fc.tuple(...headArbs), tailArb).map(([head, tail]) => [...head, ...tail]);
        break;
      }
      throw unsupportedSchema(
        'Arrays',
        `unsupported tuple+rest shape (elements=${a.elements.length}, rest=${a.rest.length})`,
      );
    }
    case 'Objects': {
      const o = ast as SchemaAST.Objects;
      if (o.indexSignatures.length > 0) {
        throw unsupportedSchema('Objects', 'index signatures');
      }
      const required: Record<string, fc.Arbitrary<unknown>> = {};
      const optional: Record<string, fc.Arbitrary<unknown>> = {};
      for (const ps of o.propertySignatures) {
        const key = String(ps.name);
        const fieldArb = walk(ps.type);
        const isOptional = ps.type.context?.isOptional === true;
        if (isOptional) optional[key] = fieldArb;
        else required[key] = fieldArb;
      }
      if (Object.keys(optional).length === 0) {
        arb = fc.record(required);
        break;
      }
      // fast-check supports `requiredKeys` to mark a subset as required —
      // but the simpler, version-stable approach is to merge all keys and
      // post-process: for each optional key, randomly drop it.
      const allKeys = { ...required, ...optional };
      arb = fc.record(allKeys).chain((rec) =>
        fc.tuple(...Object.keys(optional).map(() => fc.boolean())).map((dropFlags) => {
          const out: Record<string, unknown> = { ...rec };
          const optKeys = Object.keys(optional);
          for (let i = 0; i < optKeys.length; i++) {
            if (dropFlags[i] === true) {
              const k = optKeys[i];
              if (k !== undefined) delete out[k];
            }
          }
          return out;
        }),
      );
      break;
    }
    case 'Suspend': {
      const s = ast as SchemaAST.Suspend;
      // Resolve once; arbitrary depth control is left to fast-check defaults.
      arb = walk(s.thunk());
      break;
    }
    case 'Declaration':
      arb = _arbitraryForDeclaration(ast as SchemaAST.Declaration);
      break;
    case 'TemplateLiteral':
      arb = _arbitraryForTemplateLiteral(ast as SchemaAST.TemplateLiteral);
      break;
    default:
      throw unsupportedSchema(ast._tag);
  }
  return _applyChecks(ast, arb);
}

/**
 * Walk a `Schema` AST and return a `fc.Arbitrary` that produces values
 * structurally conforming to the schema. Throws
 * `UnsupportedError` on AST nodes with no supported mapping.
 *
 * Accepts any `Schema.Schema<T>` (or `Codec`) — only `.ast` is read.
 */
function _schemaToArbitrary<T>(schema: Schema.Schema<T>): fc.Arbitrary<T> {
  return walk(schema.ast) as fc.Arbitrary<T>;
}

/** Public namespace for the arbitrary-from-schema walker. */
export const ArbitraryFromSchema = {
  fromSchema: _schemaToArbitrary,
} as const;

/** Convenience top-level export — most call sites use this directly. */
export const schemaToArbitrary = _schemaToArbitrary;

export declare namespace ArbitraryFromSchema {
  /** The result type returned by {@link ArbitraryFromSchema.fromSchema}. */
  export type Result<T> = fc.Arbitrary<T>;
}
