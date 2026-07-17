/**
 * Schema-kernel Infer laws — type-level IsEqual pins.
 *
 * `Infer<S>` reads a schema's decoded type; `InferEncoded<S>` its wire type. The
 * pins below fix the four properties the plan calls out — optional-key
 * remapping, brand nominality, the bytes carrier instance, and `hole<A> ⇒ A` —
 * plus the structural `SchemaPort` conformance every kernel schema must satisfy.
 * The `__typeContract` body is FULLY typechecked and NEVER run.
 */

import { describe, it, expect } from 'vitest';
import { S } from '../../../../packages/core/src/schema/constructors.js';
import { isSchema } from '../../../../packages/core/src/schema/ast.js';
import type { Infer, InferEncoded } from '../../../../packages/core/src/schema/infer.js';
import type { IsOptional } from '../../../../packages/core/src/schema/ast.js';
import { ContentAddress } from '../../../../packages/core/src/brands.js';

type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
      ? true
      : false
    : false;
type Assert<T extends true> = T;
type Not<T extends false> = T;

// Sample schemas — values so `typeof` recovers each schema's stamped generics.
const litGo = S.literal('go');
const uAB = S.union(S.literal('a'), S.literal('b'));
const point = S.struct({ x: S.number, label: S.optional(S.string) });
const addr = S.brand(S.string, ContentAddress);
const u8 = S.bytes(Uint8Array);
const ab = S.bytes(ArrayBuffer);
const hole = S.hole<{ readonly shape: string }>('todo');
const strArr = S.array(S.string);
const numRec = S.record(S.number);
const optStr = S.optional(S.string);
const pair = S.tuple(S.number, S.string);

function __typeContract(): void {
  // Scalars.
  const _s: Assert<IsEqual<Infer<typeof S.string>, string>> = true;
  const _n: Assert<IsEqual<Infer<typeof S.number>, number>> = true;
  const _b: Assert<IsEqual<Infer<typeof S.boolean>, boolean>> = true;
  const _unk: Assert<IsEqual<Infer<typeof S.unknown>, unknown>> = true;

  // Literal + union.
  const _lit: Assert<IsEqual<Infer<typeof litGo>, 'go'>> = true;
  const _uni: Assert<IsEqual<Infer<typeof uAB>, 'a' | 'b'>> = true;

  // Optional-key remapping: `label` becomes an OPTIONAL key, `x` stays required.
  const _struct: Assert<IsEqual<Infer<typeof point>, { readonly x: number; readonly label?: string }>> = true;
  const _optTrue: Assert<IsEqual<IsOptional<typeof optStr>, true>> = true;
  const _optFalse: Assert<IsEqual<IsOptional<typeof S.string>, false>> = true;

  // Brand nominality: Type is the branded output, Encoded is the unbranded base;
  // the branded type is NOT structurally the base string.
  const _brand: Assert<IsEqual<Infer<typeof addr>, ContentAddress>> = true;
  const _brandEnc: Assert<IsEqual<InferEncoded<typeof addr>, string>> = true;
  const _brandNominal: Not<IsEqual<Infer<typeof addr>, string>> = false;

  // Bytes carrier instance — the constructor's InstanceType (Uint8Array is lib-
  // generic over its buffer, so InstanceType is the faithful, version-stable pin).
  const _u8: Assert<IsEqual<Infer<typeof u8>, InstanceType<typeof Uint8Array>>> = true;
  const _ab: Assert<IsEqual<Infer<typeof ab>, InstanceType<typeof ArrayBuffer>>> = true;

  // hole<A> types as A.
  const _hole: Assert<IsEqual<Infer<typeof hole>, { readonly shape: string }>> = true;

  // Array + record.
  const _arr: Assert<IsEqual<Infer<typeof strArr>, readonly string[]>> = true;
  const _rec: Assert<IsEqual<Infer<typeof numRec>, { readonly [k: string]: number }>> = true;

  // Tuple: fixed arity + per-position types (a readonly tuple, NOT a widened
  // union array) — arity and position types are both preserved by `Infer`.
  const _tuple: Assert<IsEqual<Infer<typeof pair>, readonly [number, string]>> = true;
  const _tupleEnc: Assert<IsEqual<InferEncoded<typeof pair>, readonly [number, string]>> = true;
  const _tupleNotArray: Not<IsEqual<Infer<typeof pair>, readonly (number | string)[]>> = false;

  // Structural SchemaPort conformance — a kernel schema IS a `{ Type; Encoded }`.
  const _port: { readonly Type: number; readonly Encoded: number } = S.number;
}
void __typeContract;

describe('Infer — runtime smoke', () => {
  it('every S constructor mints a branded schema value', () => {
    expect(isSchema(S.string)).toBe(true);
    expect(isSchema(point)).toBe(true);
    expect(isSchema(addr)).toBe(true);
    expect(isSchema({ ast: { kind: 'string' } })).toBe(false);
  });
});
