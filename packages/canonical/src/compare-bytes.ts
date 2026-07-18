/**
 * Byte-lexicographic comparator over `Uint8Array` — the single ordering behind
 * canonical CBOR map-key sort (encoder) and key-order verification (decoder),
 * so sort and verify stay symmetric by construction (RFC 8949 §4.2.1).
 *
 * Module-internal: intentionally NOT re-exported from the package index
 * (minimal public surface); imported directly by `cbor.ts` + `cbor-decode.ts`.
 *
 * @module
 */

/**
 * Compare two byte strings lexicographically. Returns `-1`, `0`, or `1`:
 * the first differing byte decides; on a shared prefix the shorter array sorts
 * first (RFC 8949 §4.2.1 canonical map-key order).
 */
export function compareBytes(a: Uint8Array, b: Uint8Array): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i]!;
    const bv = b[i]!;
    if (av !== bv) return av < bv ? -1 : 1;
  }
  if (a.length === b.length) return 0;
  return a.length < b.length ? -1 : 1;
}
