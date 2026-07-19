import { describe, it, expect } from 'vitest';
import { S, TypeValidator } from '@liteship/core';

describe('TypeValidator', () => {
  it('returns an ok result carrying the decoded value on a match', () => {
    // Sync kernel strict decode: value-or-tagged-error, no Effect wrapper.
    const result = TypeValidator.validate(S.number, 42);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected an ok result');
    expect(result.value).toBe(42);
  });

  it('returns a tagged ParseError result on a schema mismatch (never throws)', () => {
    const result = TypeValidator.validate(S.number, 'not a number');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected an err result');
    expect(result.error._tag).toBe('ParseError');
  });
});
