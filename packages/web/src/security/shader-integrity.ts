/**
 * Shader CONTENT-integrity verification — the content-side sibling of
 * {@link resolveRuntimeUrl}. The URL guard ({@link resolveRuntimeUrl}) decides
 * WHICH origin a shader may be fetched FROM; this module verifies WHAT BYTES came
 * back, SRI-style, against an author-pinned hash. Together they close the
 * defense-in-depth gap the taint oracle surfaced: a same-origin URL can pass the
 * URL guard yet still deliver a TAMPERED shader (a compromised / MITM'd origin, a
 * poisoned CDN cache). Verifying the bytes before they reach `gl.shaderSource` /
 * `device.createShaderModule` means a malicious shader cannot reach the GPU even
 * when the origin itself is trusted.
 *
 * The hash is computed with the SAME `sha256` kernel the content-address layer
 * uses (`@czap/core`'s {@link AddressedDigest}, which routes through
 * `@czap/canonical`'s `@noble/hashes` sha256) — NO new crypto dependency. The
 * content is encoded as UTF-8 bytes deterministically (`TextEncoder`), so the same
 * shader text always hashes to the same digest: the property the comparison relies
 * on.
 *
 * The expected hash is given in Subresource-Integrity format — `sha256-<base64>`
 * — exactly the shape an author writes for `<script integrity="…">`. The result is
 * a DISCRIMINATED `_tag` value the caller acts on (never a bare throw): the runtime
 * REFUSES to compile on anything but `'verified'`.
 *
 * @module
 */
import { AddressedDigest } from '@czap/core';

/**
 * A parsed, author-pinned shader integrity expectation — the result of
 * {@link parseShaderIntegrity} over a `sha256-<base64>` SRI attribute. Carries the
 * algorithm and the expected digest in lowercase hex (the comparison form), plus
 * the raw SRI string for diagnostics.
 */
export interface ShaderIntegrity {
  /** The hash algorithm. Only `sha256` is supported (the kernel's algorithm). */
  readonly algo: 'sha256';
  /** The expected digest as 64 lowercase hex chars (decoded from the SRI base64). */
  readonly expectedHex: string;
  /** The raw `sha256-<base64>` SRI string, preserved for diagnostics. */
  readonly raw: string;
}

/**
 * The outcome of {@link verifyShaderIntegrity}. A discriminated `_tag` the caller
 * branches on — the runtime proceeds ONLY on `'verified'`.
 *
 *   • `'verified'` — the fetched bytes hash to the author-pinned digest. Carries
 *     the VERIFIED content so the caller compiles the value that PASSED THROUGH
 *     this check (the taint-breaking sanitizer output), not the raw fetched bytes.
 *   • `'mismatch'` — the bytes do NOT match the pin. This is a SECURITY EVENT: the
 *     shader was tampered with / the origin was compromised. Carries both digests
 *     so the caller can report precisely what diverged.
 *   • `'absent'` — no integrity hash was supplied. Whether this REFUSES depends on
 *     the policy ({@link shaderIntegrityRequired}); secure-by-default refuses an
 *     external fetch with no pin.
 */
export type IntegrityResult =
  | { readonly _tag: 'verified'; readonly content: string; readonly algo: 'sha256'; readonly digestHex: string }
  | {
      readonly _tag: 'mismatch';
      readonly algo: 'sha256';
      readonly expectedHex: string;
      readonly actualHex: string;
    }
  | { readonly _tag: 'absent' };

/** The SRI grammar this module accepts: `sha256-<base64>`. Only sha256 (the kernel). */
const SRI_SHA256_RE = /^sha256-([A-Za-z0-9+/]+={0,2})$/;

/**
 * The reason an `atob` decode of an SRI base64 payload did not yield bytes. A
 * DISCRIMINATED outcome (never a silent swallow): the caller acts on the `_tag`.
 *
 *   • `'ok'` — the payload decoded; carries the binary string `atob` produced.
 *   • `'invalid-base64'` — `atob` rejected the payload (the WHATWG-spec
 *     `InvalidCharacterError` for a non-base64 string). The pin is UNPARSEABLE;
 *     carries the decode error's `name` for diagnostics so the failure is named,
 *     not vanished.
 */
type Base64Decode =
  | { readonly _tag: 'ok'; readonly binary: string }
  | { readonly _tag: 'invalid-base64'; readonly errorName: string };

/**
 * Run `atob` over an SRI base64 payload, DISCRIMINATING a malformed payload from a
 * successful decode. `atob` throws `InvalidCharacterError` (a `DOMException`) on a
 * non-base64 string; we BIND that error and classify it as `'invalid-base64'` —
 * the malformed-SRI case — rather than letting it propagate or swallowing it. The
 * caught error's `name` is consumed into the result so the failure is named
 * (reasoned about), satisfying the no-silent-catch contract: the catch handles a
 * specific, anticipated failure (a bad pin) and reports WHY, it does not vanish.
 */
function decodeAtob(b64: string): Base64Decode {
  try {
    return { _tag: 'ok', binary: atob(b64) };
  } catch (err) {
    const errorName = err instanceof Error ? err.name : String(err);
    return { _tag: 'invalid-base64', errorName };
  }
}

/**
 * Decode a standard base64 string to bytes, returning `null` for any input the
 * runtime's `atob` rejects (malformed base64) instead of throwing. `atob` is a
 * web/Node-18+ global; the runtime this guards is the browser, where it is always
 * present. Deterministic: the same base64 always yields the same bytes.
 *
 * A malformed payload is DISCRIMINATED via {@link decodeAtob} ('invalid-base64')
 * and mapped to `null` (an unparseable pin) — the failure is classified, not
 * silently swallowed; the caller refuses an external fetch carrying it.
 */
function base64ToBytes(b64: string): Uint8Array | null {
  if (typeof atob !== 'function') return null;
  const decode = decodeAtob(b64);
  if (decode._tag === 'invalid-base64') {
    // A non-base64 SRI payload — the pin is unparseable (errorName: the bound,
    // classified decode failure). Surface as "no usable pin" (null); the
    // secure-by-default policy refuses an external fetch that carries it.
    return null;
  }
  const binary = decode.binary;
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i) & 0xff;
  }
  return bytes;
}

/** Lowercase-hex encode a byte array (the digest comparison form). */
function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i]!.toString(16).padStart(2, '0');
  }
  return out;
}

/**
 * Parse a `sha256-<base64>` SRI integrity string into a {@link ShaderIntegrity}.
 * Returns `null` for a missing / empty / malformed value (e.g. an unsupported
 * algorithm, non-base64 payload, or a digest of the wrong length) — the caller
 * treats a `null` parse as "no usable pin", which the secure-by-default policy
 * refuses for an external fetch. A sha256 digest is exactly 32 bytes (64 hex).
 */
export function parseShaderIntegrity(raw: string | null | undefined): ShaderIntegrity | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const match = SRI_SHA256_RE.exec(trimmed);
  if (!match) return null;
  const bytes = base64ToBytes(match[1]!);
  // A sha256 digest is exactly 32 bytes; a different length is a malformed pin.
  if (bytes === null || bytes.length !== 32) return null;
  return { algo: 'sha256', expectedHex: bytesToHex(bytes), raw: trimmed };
}

/**
 * Length-safe digest comparison. Both inputs are fixed-length lowercase hex from
 * the same algorithm (64 chars for sha256), so a length mismatch is itself a
 * mismatch; the per-character XOR fold avoids the early-return timing leak a `===`
 * on secret-derived strings would have. Pure + deterministic.
 */
function digestsEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Verify that `content` (the fetched shader BYTES, as text) matches the
 * author-pinned `expected` digest. The CONTENT sanitizer on the shader data path:
 * the runtime compiles the `verified` content this returns, so a value that
 * reaches `gl.shaderSource` / `createShaderModule` has provably passed this check.
 *
 *   • `expected === null` → `{ _tag: 'absent' }` (no pin supplied).
 *   • the sha256 of the UTF-8 content matches → `{ _tag: 'verified', content, … }`.
 *   • it does NOT match → `{ _tag: 'mismatch', … }` (a SECURITY event).
 *
 * Deterministic: the same `content` + `expected` always yield the same result
 * (UTF-8 `TextEncoder` bytes → the kernel sha256 → a fixed hex digest). Never
 * throws — the caller branches on the `_tag`.
 *
 * @param content - The fetched shader source text (the untrusted bytes).
 * @param expected - The parsed author-pinned hash, or `null` when none was supplied.
 */
export function verifyShaderIntegrity(content: string, expected: ShaderIntegrity | null): IntegrityResult {
  if (expected === null) {
    return { _tag: 'absent' };
  }
  const bytes = new TextEncoder().encode(content);
  // Reuse the content-address sha256 kernel (no new crypto dep). `integrity_digest`
  // is `sha256:<64-hex>`; strip the algorithm prefix to the comparison hex.
  const digest = AddressedDigest.of(bytes, 'sha256');
  const actualHex = digest.integrity_digest.slice('sha256:'.length);
  if (digestsEqual(actualHex, expected.expectedHex)) {
    return { _tag: 'verified', content, algo: 'sha256', digestHex: actualHex };
  }
  return { _tag: 'mismatch', algo: 'sha256', expectedHex: expected.expectedHex, actualHex };
}

/**
 * Whether a shader fetched from `shaderSrc` REQUIRES an integrity pin under the
 * secure-by-default policy. The decision is deliberately simple and explicit:
 *
 *   • An EXTERNAL shader (one actually fetched over the network — a `/`-absolute,
 *     protocol-relative, or scheme-absolute URL) REQUIRES a pin. An external fetch
 *     with NO pin is REFUSED: the bytes cross a network boundary you cannot trust
 *     to be untampered, so an unverified external shader must never reach the GPU.
 *   • An INLINE shader (the source string IS the shader — no fetch) needs no pin:
 *     there is no network boundary to verify, the bytes are the author's own.
 *
 * `mode` lets a host RELAX this (`'lenient'`: a missing pin on an external fetch is
 * allowed — the pre-pin behavior) or keep the secure default (`'required-for-external'`).
 * It does NOT offer a mode that requires a pin on inline source (there is nothing
 * to verify) — the policy surface is intentionally narrow.
 */
export type ShaderIntegrityMode = 'required-for-external' | 'lenient';

/** The secure-by-default integrity mode — an external fetch must carry a pin. */
export const DEFAULT_SHADER_INTEGRITY_MODE: ShaderIntegrityMode = 'required-for-external';

/**
 * Does `shaderSrc` denote an EXTERNAL (network-fetched) shader, as opposed to an
 * inline source string? Mirrors the runtime's own fetch decision (`/`-absolute,
 * protocol-relative `//`, or scheme-absolute `http(s):`). An inline GLSL/WGSL
 * source — a multi-line shader body — is NOT external.
 */
export function isExternalShaderSource(shaderSrc: string): boolean {
  return shaderSrc.startsWith('/') || shaderSrc.startsWith('http://') || shaderSrc.startsWith('https://');
}

/**
 * The secure-by-default refusal decision: given the resolved integrity result and
 * the policy mode, should the runtime REFUSE to compile? Returns a discriminated
 * decision so the caller can emit a precise diagnostic.
 *
 *   • a `'mismatch'` ALWAYS refuses (a tampered shader, regardless of mode);
 *   • an `'absent'` refuses under `'required-for-external'` (secure default) and
 *     is allowed under `'lenient'`;
 *   • a `'verified'` always proceeds.
 */
export type IntegrityDecision =
  | { readonly proceed: true }
  | { readonly proceed: false; readonly reason: 'mismatch' | 'absent-required' };

/** Decide whether to proceed or refuse, given the verify result and the mode. */
export function decideShaderIntegrity(result: IntegrityResult, mode: ShaderIntegrityMode): IntegrityDecision {
  switch (result._tag) {
    case 'verified':
      return { proceed: true };
    case 'mismatch':
      return { proceed: false, reason: 'mismatch' };
    case 'absent':
      return mode === 'lenient' ? { proceed: true } : { proceed: false, reason: 'absent-required' };
  }
}
