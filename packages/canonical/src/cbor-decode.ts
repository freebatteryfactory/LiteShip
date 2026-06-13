/**
 * Canonical CBOR decoder — strict inverse of {@link CanonicalCbor.encode}.
 *
 * Reads ONLY the RFC 8949 §4.2.1 deterministic subset that the sibling
 * encoder (`./cbor.ts`) emits, and rejects everything else with a typed
 * {@link CborDecodeError}. This is the reader the encoder's bytes have
 * lacked: a persisted DocumentGraph (content-addressed via the encoder)
 * can now be re-read without a third-party CBOR library that would accept
 * non-canonical encodings.
 *
 * Accepted (mirrors the encoder exactly):
 * - major 0 (uint) / major 1 (nint) in SHORTEST form only.
 * - major 2 (byte string), definite length → `Uint8Array`.
 * - major 3 (text string), definite length, UTF-8 → `string`.
 * - major 4 (array), DEFINITE length → `unknown[]`.
 * - major 5 (map), DEFINITE length, keys verified in canonical
 *   (encoded-byte) order → plain object.
 * - major 7: simple 20/21/22 → `false`/`true`/`null`; simple 27 → float64.
 *
 * Rejected (typed `CborDecodeError`):
 * - non-shortest integer/length encodings (`'non_canonical'`).
 * - float16 (ai=25) and float32 (ai=26) in major 7 (`'non_canonical'`).
 * - indefinite-length items (ai=31) (`'non_canonical'`).
 * - out-of-order or duplicate map keys (`'non_canonical'`).
 * - truncated input (`'unexpected_eof'`).
 * - reserved additional-info (28–30), unknown simple values, trailing
 *   bytes, invalid UTF-8 (`'malformed'`).
 *
 * @module
 */

/** Reason a {@link CborDecodeError} was raised. */
export type CborDecodeErrorReason = 'non_canonical' | 'malformed' | 'unexpected_eof';

/** Typed error for any input outside the canonical subset. */
export class CborDecodeError extends Error {
  readonly reason: CborDecodeErrorReason;
  /** Byte offset where decoding failed (best effort). */
  readonly offset: number;
  constructor(reason: CborDecodeErrorReason, message: string, offset: number) {
    super(`CborDecodeError[${reason}] @${offset}: ${message}`);
    this.name = 'CborDecodeError';
    this.reason = reason;
    this.offset = offset;
  }
}

const textDecoder = new TextDecoder('utf-8', { fatal: true });

function compareBytes(a: Uint8Array, b: Uint8Array): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i]!;
    const bv = b[i]!;
    if (av !== bv) return av - bv;
  }
  return a.length - b.length;
}

/** Mutable cursor over the input buffer. */
class Reader {
  readonly bytes: Uint8Array;
  pos = 0;
  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
  }

  private need(n: number): void {
    if (this.pos + n > this.bytes.length) {
      throw new CborDecodeError(
        'unexpected_eof',
        `need ${n} byte(s) but only ${this.bytes.length - this.pos} remain`,
        this.pos,
      );
    }
  }

  u8(): number {
    this.need(1);
    return this.bytes[this.pos++]!;
  }

  slice(n: number): Uint8Array {
    this.need(n);
    const out = this.bytes.subarray(this.pos, this.pos + n);
    this.pos += n;
    return out;
  }
}

/**
 * Read a major-type head's argument from the given additional-info value,
 * enforcing SHORTEST-form encoding. Returns the argument as a JS number
 * (safe up to 2^53 - 1). Rejects indefinite length (31) and reserved
 * additional-info (28–30) at the call sites that surface them.
 */
function readArgument(r: Reader, ai: number, headOffset: number): number {
  if (ai < 24) {
    return ai;
  }
  if (ai === 24) {
    const v = r.u8();
    // Shortest form: values < 24 must use the single-byte head.
    if (v < 24) {
      throw new CborDecodeError('non_canonical', `1-byte argument ${v} should be inlined`, headOffset);
    }
    return v;
  }
  if (ai === 25) {
    const b0 = r.u8();
    const b1 = r.u8();
    const v = (b0 << 8) | b1;
    if (v < 0x100) {
      throw new CborDecodeError('non_canonical', `2-byte argument ${v} should use a shorter head`, headOffset);
    }
    return v;
  }
  if (ai === 26) {
    const b0 = r.u8();
    const b1 = r.u8();
    const b2 = r.u8();
    const b3 = r.u8();
    const v = (b0 * 0x1000000 + (b1 << 16) + (b2 << 8) + b3) >>> 0;
    if (v < 0x10000) {
      throw new CborDecodeError('non_canonical', `4-byte argument ${v} should use a shorter head`, headOffset);
    }
    return v;
  }
  if (ai === 27) {
    const hi =
      (r.u8() * 0x1000000 + (r.u8() << 16) + (r.u8() << 8) + r.u8()) >>> 0;
    const lo =
      (r.u8() * 0x1000000 + (r.u8() << 16) + (r.u8() << 8) + r.u8()) >>> 0;
    const v = hi * 0x100000000 + lo;
    if (hi === 0 && lo < 0x100000000) {
      throw new CborDecodeError('non_canonical', `8-byte argument ${v} should use a shorter head`, headOffset);
    }
    if (!Number.isSafeInteger(v)) {
      throw new CborDecodeError(
        'malformed',
        `integer ${v} exceeds the encoder's safe-integer range`,
        headOffset,
      );
    }
    return v;
  }
  // ai 28, 29, 30 are reserved; ai 31 is indefinite length.
  if (ai === 31) {
    throw new CborDecodeError('non_canonical', 'indefinite-length items are not canonical', headOffset);
  }
  throw new CborDecodeError('malformed', `reserved additional-info value ${ai}`, headOffset);
}

function decodeFloat64(r: Reader): number {
  const b = r.slice(8);
  return new DataView(b.buffer, b.byteOffset, 8).getFloat64(0, false /* big-endian */);
}

function decodeItem(r: Reader): unknown {
  const headOffset = r.pos;
  const head = r.u8();
  const major = head >> 5;
  const ai = head & 0x1f;

  switch (major) {
    case 0: {
      // Unsigned integer.
      return readArgument(r, ai, headOffset);
    }
    case 1: {
      // Negative integer: value is -1 - argument.
      const arg = readArgument(r, ai, headOffset);
      const v = -1 - arg;
      if (!Number.isSafeInteger(v)) {
        throw new CborDecodeError('malformed', `negative integer ${v} out of safe range`, headOffset);
      }
      return v;
    }
    case 2: {
      // Byte string (definite length).
      const len = readArgument(r, ai, headOffset);
      // Copy out so the result is independent of the input buffer's lifetime.
      return new Uint8Array(r.slice(len));
    }
    case 3: {
      // Text string (definite length), UTF-8.
      const len = readArgument(r, ai, headOffset);
      const raw = r.slice(len);
      try {
        return textDecoder.decode(raw);
      } catch {
        throw new CborDecodeError('malformed', 'invalid UTF-8 in text string', headOffset);
      }
    }
    case 4: {
      // Array (definite length).
      const len = readArgument(r, ai, headOffset);
      const out: unknown[] = new Array(len);
      for (let i = 0; i < len; i++) {
        out[i] = decodeItem(r);
      }
      return out;
    }
    case 5: {
      // Map (definite length) with canonical key-order verification.
      const len = readArgument(r, ai, headOffset);
      const out: Record<string, unknown> = {};
      let prevKeyBytes: Uint8Array | null = null;
      for (let i = 0; i < len; i++) {
        const keyOffset = r.pos;
        const keyHead = r.bytes[r.pos];
        // The encoder only ever emits string keys (major 3). Enforce that.
        if (keyHead === undefined || keyHead >> 5 !== 3) {
          throw new CborDecodeError('malformed', 'map keys must be text strings', keyOffset);
        }
        const keyStart = r.pos;
        const key = decodeItem(r) as string;
        const keyBytes = r.bytes.subarray(keyStart, r.pos);
        if (prevKeyBytes !== null) {
          const cmp = compareBytes(prevKeyBytes, keyBytes);
          if (cmp > 0) {
            throw new CborDecodeError('non_canonical', 'map keys are not in canonical byte order', keyOffset);
          }
          if (cmp === 0) {
            throw new CborDecodeError('non_canonical', 'duplicate map key', keyOffset);
          }
        }
        prevKeyBytes = keyBytes;
        out[key] = decodeItem(r);
      }
      return out;
    }
    case 7: {
      // Simple values and floats.
      switch (ai) {
        case 20:
          return false;
        case 21:
          return true;
        case 22:
          return null;
        case 25:
          throw new CborDecodeError('non_canonical', 'float16 is not in the canonical subset', headOffset);
        case 26:
          throw new CborDecodeError('non_canonical', 'float32 is not in the canonical subset', headOffset);
        case 27:
          return decodeFloat64(r);
        case 31:
          throw new CborDecodeError('non_canonical', 'indefinite-length break is not canonical', headOffset);
        case 23:
          // `undefined` (simple 23) is never emitted — encoder coerces it to null.
          throw new CborDecodeError('non_canonical', 'simple value `undefined` is not in the canonical subset', headOffset);
        default:
          throw new CborDecodeError('malformed', `unsupported simple/float value (ai=${ai})`, headOffset);
      }
    }
    default:
      // Major 6 (tags) is not part of the encoder's output.
      throw new CborDecodeError('malformed', `unsupported major type ${major}`, headOffset);
  }
}

/**
 * Decode a canonical CBOR byte sequence produced by {@link CanonicalCbor.encode}.
 *
 * Strict: any deviation from the RFC 8949 §4.2.1 deterministic subset the
 * encoder emits (non-shortest forms, float16/32, indefinite lengths,
 * out-of-order map keys, trailing bytes) raises a typed {@link CborDecodeError}.
 *
 * @throws {CborDecodeError}
 */
export function decode(bytes: Uint8Array): unknown {
  if (!(bytes instanceof Uint8Array)) {
    throw new CborDecodeError('malformed', 'input must be a Uint8Array', 0);
  }
  const r = new Reader(bytes);
  const value = decodeItem(r);
  if (r.pos !== bytes.length) {
    throw new CborDecodeError('malformed', `trailing ${bytes.length - r.pos} byte(s) after top-level item`, r.pos);
  }
  return value;
}
