/**
 * schema-port — `asDeclaration` is a PHANTOM-brand assertion: it returns the schema
 * value byte-for-byte unchanged (no runtime slot backs the declaration tag) and only
 * narrows the type. This pins that contract — the one runtime line the SchemaPort
 * module carries (the rest is erased structural types).
 */
import { describe, it, expect } from 'vitest';
import { asDeclaration } from '@liteship/core';
import type { SchemaPort, DeclarationSchema } from '@liteship/core';

describe('asDeclaration — the schema-port declaration brand', () => {
  it('returns the exact same value (a pure passthrough — no runtime slot for the brand)', () => {
    const schema = { Type: 0 as number, Encoded: 0 as number, marker: 'raw-bytes' };
    const declared = asDeclaration<number>(schema);
    // Same reference: the brand is phantom, so nothing is allocated or copied.
    expect(declared).toBe(schema);
    // The carried value is untouched — still the exact object the caller passed.
    expect((declared as typeof schema).marker).toBe('raw-bytes');
    expect(declared.Type).toBe(0);
    expect(declared.Encoded).toBe(0);
  });

  it('narrows a SchemaPort to a DeclarationSchema without a cast through unknown', () => {
    const port: SchemaPort<string> = { Type: '', Encoded: '' };
    const declared: DeclarationSchema<string> = asDeclaration(port);
    // A DeclarationSchema IS-A SchemaPort (it only adds the phantom brand), so the
    // value is assignable both ways at runtime — same object, no structural change.
    const backToPort: SchemaPort<string> = declared;
    expect(backToPort).toBe(port);
  });
});
