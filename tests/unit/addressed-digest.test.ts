/**
 * AddressedDigest -- dual hash (fnv1a display_id + sha256 integrity_digest)
 * over the same canonical bytes (ADR-0011 §Decision item 2).
 */

import { describe, it, expect } from 'vitest';
import { Effect } from 'effect';
import { AddressedDigest } from '@czap/core';

const run = <A, E>(eff: Effect.Effect<A, E>) => Effect.runPromise(eff);

const FNV_RE = /^fnv1a:[0-9a-f]{8}$/;
const SHA_RE = /^sha256:[0-9a-f]{64}$/;
const BLAKE3_RE = /^blake3:[0-9a-f]{64}$/;

describe('AddressedDigest.of', () => {
  it('produces a display_id matching fnv1a:XXXXXXXX', async () => {
    const d = await run(AddressedDigest.of(new Uint8Array([1, 2, 3, 4, 5])));
    expect(d.display_id).toMatch(FNV_RE);
  });

  it('produces an integrity_digest matching sha256:<64-hex>', async () => {
    const d = await run(AddressedDigest.of(new Uint8Array([1, 2, 3, 4, 5])));
    expect(d.integrity_digest).toMatch(SHA_RE);
  });

  it('algo defaults to sha256', async () => {
    const d = await run(AddressedDigest.of(new Uint8Array([0])));
    expect(d.algo).toBe('sha256');
  });

  it('same bytes → identical display_id AND identical integrity_digest', async () => {
    const a = await run(AddressedDigest.of(new Uint8Array([9, 8, 7, 6, 5])));
    const b = await run(AddressedDigest.of(new Uint8Array([9, 8, 7, 6, 5])));
    expect(a.display_id).toBe(b.display_id);
    expect(a.integrity_digest).toBe(b.integrity_digest);
    expect(a.algo).toBe(b.algo);
  });

  it('differing-by-one-byte inputs → both digests differ', async () => {
    const a = await run(AddressedDigest.of(new Uint8Array([1, 2, 3, 4])));
    const b = await run(AddressedDigest.of(new Uint8Array([1, 2, 3, 5])));
    expect(a.display_id).not.toBe(b.display_id);
    expect(a.integrity_digest).not.toBe(b.integrity_digest);
  });

  it('empty input still yields valid display_id and integrity_digest', async () => {
    const d = await run(AddressedDigest.of(new Uint8Array(0)));
    expect(d.display_id).toMatch(FNV_RE);
    expect(d.integrity_digest).toMatch(SHA_RE);
  });

  it('algo=blake3 produces blake3 integrity_digest and algo blake3', async () => {
    const d = await run(AddressedDigest.of(new Uint8Array([1, 2, 3]), 'blake3'));
    expect(d.integrity_digest).toMatch(BLAKE3_RE);
    expect(d.algo).toBe('blake3');
    expect(d.display_id).toMatch(FNV_RE);
  });
});
