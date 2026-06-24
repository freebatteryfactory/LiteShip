/**
 * Unit pins for the content-addressing kernel's PRIMITIVE-PASSTHROUGH branch
 * (`@czap/core`'s `contentAddressOf` → `canonicalizeForAddress`).
 *
 * The kernel canonicalizes a value before hashing; the primitive guard
 *   `value === null || typeof value === 'string' || typeof value === 'number' ||
 *    typeof value === 'boolean'`
 * passes primitives through UNCHANGED (so a number/boolean/null addresses to a stable,
 * type-distinct address). These tests pin the REAL passthrough behaviour at each
 * branch — the kill for the disjunction (`||`→`&&`) and equality (`===`→`!==`) mutants
 * on that guard: collapsing any `||` or flipping any `===` mis-routes one or more
 * primitives through the `String(value)` / object fallback, producing a DIFFERENT
 * address, so these assertions go red on the mutation. Distinct-type addresses are
 * asserted too (a number, a boolean, and null must never collide).
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { contentAddressOf } from '@czap/core';

const FNV_RE = /^fnv1a:[0-9a-f]{8}$/;

describe('contentAddressOf primitive passthrough', () => {
  it('addresses a NUMBER primitive stably (the kill for the first `||` / a `===` flip)', () => {
    // A number takes the `typeof value === 'number'` branch. Collapsing the first `||`
    // to `&&`, or flipping the number `===`, drops 42 out of passthrough → a different
    // address. The committed golden pin catches it.
    expect(contentAddressOf(42)).toBe('fnv1a:87b1e8b7');
    expect(contentAddressOf(42)).toMatch(FNV_RE);
    // Deterministic: same value → same address.
    expect(contentAddressOf(42)).toBe(contentAddressOf(42));
  });

  it('addresses BOOLEAN primitives stably (the kill for the boolean `||` / `===` branch)', () => {
    // true/false take the `typeof value === 'boolean'` branch. Collapsing the trailing
    // `||` to `&&`, or flipping the boolean `===`, mis-routes them → a different address.
    expect(contentAddressOf(true)).toBe('fnv1a:700b7290');
    expect(contentAddressOf(false)).toBe('fnv1a:710b7423');
  });

  it('addresses NULL stably (the kill for the `value === null` equality / its `||`)', () => {
    // null takes the leading `value === null` branch. Flipping that `===`, or collapsing
    // the `||` after it, mis-routes null → a different address.
    expect(contentAddressOf(null)).toBe('fnv1a:730b7749');
  });

  it('a number, a boolean, and null address to DISTINCT, type-separated addresses', () => {
    const addrs = [contentAddressOf(42), contentAddressOf(true), contentAddressOf(false), contentAddressOf(null)];
    // No two primitive passthrough branches collide (a mis-routing mutant would).
    expect(new Set(addrs).size).toBe(addrs.length);
  });
});
