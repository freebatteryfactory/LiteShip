/**
 * SchemaPort — the permanent, transport-agnostic schema contract.
 *
 * A `SchemaPort<A, I>` is the phantom `Type`/`Encoded` pair every schema value
 * carries: `A` decodes out, `I` is the encoded (wire) form. It is a STRUCTURAL
 * contract — no runtime slot backs `Type`/`Encoded` — so an effect `Schema`/`Codec`
 * value (which stamps the identical pair) satisfies it today, and the kernel
 * schema is built TO it tomorrow. Consumers derive `A`/`I` by reading the members
 * (see `schema/infer.ts` `Infer`), never by importing effect's `Schema` type.
 *
 * @module
 */

/**
 * The phantom `Type`/`Encoded` pair a schema value carries: `A` is the decoded
 * type, `I` the encoded (wire) type. Structurally satisfied by every effect
 * `Schema`/`Codec` value and by every kernel `Schema`. Both parameters are
 * covariant (readonly-only positions).
 */
export interface SchemaPort<out A, out I = A> {
  readonly Type: A;
  readonly Encoded: I;
}

declare const DeclarationTypeId: unique symbol;

/**
 * A {@link SchemaPort} tagged as a DECLARATION: a schema whose value domain is
 * asserted, not structurally walkable (raw bytes, opaque carriers), so the
 * harness reports it "not arbitrary-derivable" rather than fabricating samples.
 * The `unique symbol` brand is nominal — nothing acquires it structurally, so a
 * plain schema is never mistaken for a declaration.
 */
export interface DeclarationSchema<out T> extends SchemaPort<T> {
  readonly [DeclarationTypeId]: T;
}

/**
 * Brand a schema value as a {@link DeclarationSchema}. The `unique symbol` tag
 * is PHANTOM — it has no runtime slot — so this is a pure type-level assertion:
 * the value is returned byte-for-byte unchanged (still the effect `Schema` value
 * the caller passed, still decoded by `TypeValidator` until the kernel lands).
 *
 * Accepts any {@link SchemaPort} (every effect `Schema`/`Codec` value satisfies
 * it structurally) and narrows it to `DeclarationSchema<T>`, so slots that
 * declare a not-arbitrary-derivable domain (raw bytes, opaque carriers) can be
 * built WITHOUT an `as unknown as` double-cast. Because `DeclarationSchema<T>`
 * is a structural subtype of `SchemaPort<T>` (it only ADDS the phantom brand),
 * the assertion is a plain downcast — never a cast through `unknown`.
 */
export function asDeclaration<T>(schema: SchemaPort<T>): DeclarationSchema<T> {
  return schema as DeclarationSchema<T>;
}
