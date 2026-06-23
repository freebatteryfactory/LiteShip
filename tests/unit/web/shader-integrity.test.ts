/**
 * Shader CONTENT-integrity verifier (`@czap/web` security) — the content-side
 * sibling of the runtime-URL SSRF guard. The URL guard vets the ORIGIN; this
 * verifies the fetched BYTES against an author-pinned SRI `sha256-<base64>` hash
 * BEFORE they reach `gl.shaderSource` / `device.createShaderModule`.
 *
 * THE LAWS under test:
 *   • a fetched shader whose bytes match the pin → `verified` (carries the content);
 *   • a single tampered byte → `mismatch` (a SECURITY event, both digests reported);
 *   • no pin → `absent`; secure-by-default REFUSES an external fetch with no pin;
 *   • the hash is the SAME sha256 kernel the content-address layer uses (no new dep);
 *   • deterministic: the same content + pin always yields the same result;
 *   • the SRI parse rejects a malformed / wrong-algorithm / wrong-length pin.
 *
 * The expected SRI is COMPUTED in-test from the canonical `AddressedDigest`
 * (`@czap/core`) — never a hardcoded digest beside the verifier (a hand-typed
 * mirror would drift). So a matching-hash test proves the verifier and the SRI
 * producer agree on one kernel.
 *
 * @module
 */
// PROVES: INV-SHADER-CONTENT-INTEGRITY
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { AddressedDigest } from '@czap/core';
import {
  parseShaderIntegrity,
  verifyShaderIntegrity,
  isExternalShaderSource,
  decideShaderIntegrity,
  DEFAULT_SHADER_INTEGRITY_MODE,
} from '../../../packages/web/src/security/shader-integrity.js';
import { isFetchableRuntimeUrl, resolveRuntimeUrl } from '../../../packages/web/src/security/runtime-url.js';

const SAMPLE_GLSL = '#version 300 es\nprecision mediump float;\nout vec4 c;\nvoid main(){c=vec4(1.0);}';

/**
 * Compute the author SRI (`sha256-<base64>`) for `content` from the SAME kernel
 * the verifier hashes with — the canonical `AddressedDigest` sha256. Self-deriving:
 * a hardcoded digest beside the verifier would be a drift-prone hand-typed mirror.
 */
function sriOf(content: string): string {
  const bytes = new TextEncoder().encode(content);
  const hex = AddressedDigest.of(bytes, 'sha256').integrity_digest.slice('sha256:'.length);
  const raw = new Uint8Array(hex.length / 2);
  for (let i = 0; i < raw.length; i++) raw[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  let binary = '';
  for (const b of raw) binary += String.fromCharCode(b);
  return `sha256-${btoa(binary)}`;
}

describe('parseShaderIntegrity — SRI sha256-<base64> parse', () => {
  it('parses a well-formed sha256 SRI into a 64-hex expectation', () => {
    const parsed = parseShaderIntegrity(sriOf(SAMPLE_GLSL));
    expect(parsed).not.toBeNull();
    expect(parsed!.algo).toBe('sha256');
    expect(parsed!.expectedHex).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns null for a missing / empty pin', () => {
    expect(parseShaderIntegrity(null)).toBeNull();
    expect(parseShaderIntegrity(undefined)).toBeNull();
    expect(parseShaderIntegrity('')).toBeNull();
    expect(parseShaderIntegrity('   ')).toBeNull();
  });

  it('rejects an unsupported algorithm (only sha256 — the kernel)', () => {
    // A real sha384/sha512 SRI shape — rejected: this verifier hashes with sha256.
    expect(parseShaderIntegrity('sha384-abcdef==')).toBeNull();
    expect(parseShaderIntegrity('sha512-abcdef==')).toBeNull();
  });

  it('rejects a non-base64 payload and a wrong-length digest', () => {
    expect(parseShaderIntegrity('sha256-not base64!!')).toBeNull();
    // Valid base64 but only 3 bytes — a sha256 digest is exactly 32 bytes.
    expect(parseShaderIntegrity(`sha256-${btoa('abc')}`)).toBeNull();
  });
});

describe('verifyShaderIntegrity — verified / mismatch / absent', () => {
  it('VERIFIES content whose bytes match the author-pinned hash', () => {
    const expected = parseShaderIntegrity(sriOf(SAMPLE_GLSL));
    const result = verifyShaderIntegrity(SAMPLE_GLSL, expected);
    expect(result._tag).toBe('verified');
    if (result._tag === 'verified') {
      // The verified content is returned verbatim (the value the runtime compiles).
      expect(result.content).toBe(SAMPLE_GLSL);
      expect(result.algo).toBe('sha256');
      expect(result.digestHex).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('reports a MISMATCH when a single byte is tampered', () => {
    // Pin the ORIGINAL, then feed a tampered shader (one char changed) — the
    // classic compromised-origin / MITM substitution. Must NOT verify.
    const pinned = parseShaderIntegrity(sriOf(SAMPLE_GLSL));
    const tampered = SAMPLE_GLSL.replace('vec4(1.0)', 'vec4(0.0)');
    expect(tampered).not.toBe(SAMPLE_GLSL);
    const result = verifyShaderIntegrity(tampered, pinned);
    expect(result._tag).toBe('mismatch');
    if (result._tag === 'mismatch') {
      // The security event reports BOTH digests so the caller can log precisely.
      expect(result.expectedHex).toBe(pinned!.expectedHex);
      expect(result.actualHex).not.toBe(result.expectedHex);
      expect(result.actualHex).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('reports ABSENT when no pin is supplied', () => {
    expect(verifyShaderIntegrity(SAMPLE_GLSL, null)._tag).toBe('absent');
  });

  it('is DETERMINISTic — same content + pin yields an identical result', () => {
    const expected = parseShaderIntegrity(sriOf(SAMPLE_GLSL));
    const a = verifyShaderIntegrity(SAMPLE_GLSL, expected);
    const b = verifyShaderIntegrity(SAMPLE_GLSL, expected);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('a pin minted for OTHER content does not verify this content (no false-verify)', () => {
    const otherPin = parseShaderIntegrity(sriOf('a totally different shader body'));
    expect(verifyShaderIntegrity(SAMPLE_GLSL, otherPin)._tag).toBe('mismatch');
  });
});

describe('isExternalShaderSource — fetch vs inline classification', () => {
  it('treats absolute / protocol-relative / scheme URLs as external (fetched)', () => {
    expect(isExternalShaderSource('/shaders/wave.glsl')).toBe(true);
    expect(isExternalShaderSource('https://cdn.example/wave.glsl')).toBe(true);
    expect(isExternalShaderSource('http://localhost/wave.glsl')).toBe(true);
  });

  it('treats an inline shader body as NOT external (no fetch boundary)', () => {
    expect(isExternalShaderSource(SAMPLE_GLSL)).toBe(false);
    expect(isExternalShaderSource('@fragment fn fs_main() {}')).toBe(false);
  });

  // SECURITY REGRESSION (P2a): a PATH-RELATIVE shader URL is a FETCHABLE same-origin
  // URL under `resolveRuntimeUrl` — so it MUST be classified EXTERNAL (→ fetched +
  // integrity-verified), never treated as inline shader SOURCE TEXT. The previous
  // classifier (`/`-absolute / `http(s):` only) returned `false` for these, so the
  // URL TOKEN slipped into gpu.ts/wgpu.ts's inline branch UNVERIFIED — a hole in the
  // secure-by-default SRI cure. These assertions FAIL against the unfixed classifier.
  it('treats a PATH-RELATIVE shader URL as EXTERNAL (fetched + verified, not inline)', () => {
    expect(isExternalShaderSource('shaders/foo.glsl')).toBe(true);
    expect(isExternalShaderSource('./sub/bar.wgsl')).toBe(true);
    expect(isExternalShaderSource('../assets/wave.frag')).toBe(true);
    // A bare single-token filename with a shader extension is still a fetchable URL.
    expect(isExternalShaderSource('wave.glsl')).toBe(true);
    expect(isExternalShaderSource('post.vert')).toBe(true);
  });

  it('classifies EVERY fetchable-URL shape resolveRuntimeUrl accepts as external', () => {
    // The classifier MUST agree with the URL policy. `resolveRuntimeUrl` resolves all
    // of these as fetchable same-/cross-origin URLs; none may reach the inline branch.
    const fetchableShapes = [
      '/shaders/wave.glsl', // root-absolute
      '//cdn.example/wave.wgsl', // protocol-relative
      'https://cdn.example/wave.glsl', // scheme-absolute https
      'http://localhost/wave.glsl', // scheme-absolute http
      'shaders/foo.glsl', // path-relative
      './sub/bar.wgsl', // explicit-relative
      '../assets/wave.frag', // parent-relative
    ];
    for (const url of fetchableShapes) {
      const cls = resolveRuntimeUrl(url, { kind: 'gpu-shader', policy: { mode: 'allowlist', allowOrigins: ['https://cdn.example', 'http://localhost'] } });
      // Every shape is something the URL policy treats as a URL (allowed or rejected
      // for an origin reason) — i.e. NOT an opaque inline body. The integrity
      // classifier must agree it is external so it never compiles unverified.
      expect(cls.type === 'missing').toBe(false);
      expect(isExternalShaderSource(url)).toBe(true);
    }
  });

  // SECURITY REGRESSION (P2b — the re-attacked bypass): `resolveRuntimeUrl` ACCEPTS
  // and returns same-origin QUERY-RELATIVE (`?shader=wave`) and BARE SAME-DIR
  // (`wave`) tokens — they resolve to fetchable same-origin URLs. The OLD classifier
  // keyed off extension / embedded-slash / scheme only, so these slash-less,
  // extension-less, scheme-less tokens fell into the INLINE branch UNVERIFIED —
  // fetched/integrity-verified NEVER, compiled as literal "source". This is the SRI
  // bypass codex found. The classifier now DELEGATES to the URL policy's fetchable-URL
  // predicate, so any shape the policy treats as a fetchable URL is EXTERNAL.
  // SECURITY REGRESSION (P2c — codex round-3, the space-path bypass): `resolveRuntimeUrl`
  // ACCEPTS a single-line PATH-WITH-A-SPACE (`shader file.wgsl`, `./shader file.wgsl`) as a
  // fetchable same-origin URL ('allowed'). The OLD classifier used a raw inner-whitespace
  // pre-check, so any value with a space was rejected as a URL and fell into the INLINE
  // branch UNVERIFIED (external FALSE) — bypassing fetch+SRI. A URL/path CAN contain a
  // space; whitespace was the WRONG distinguisher. The content/policy-based classifier now
  // routes these to EXTERNAL (external TRUE → fetch+verify or refuse). RED before / green now.
  it('treats a single-line PATH-WITH-A-SPACE as EXTERNAL (codex round-3 — fetch+verify, not inline)', () => {
    expect(isExternalShaderSource('shader file.wgsl')).toBe(true);
    expect(isExternalShaderSource('./shader file.wgsl')).toBe(true);
    // The space-containing path resolves as a fetchable same-origin URL under the policy...
    expect(resolveRuntimeUrl('shader file.wgsl', { kind: 'gpu-shader', policy: { mode: 'same-origin' } }).type).toBe('allowed');
    // ...so the classifier MUST agree it is external (never compiled unverified).
    expect(isFetchableRuntimeUrl('shader file.wgsl')).toBe(true);
    expect(isFetchableRuntimeUrl('./shader file.wgsl')).toBe(true);
  });

  it('treats a QUERY-RELATIVE shader URL (`?shader=wave`) as EXTERNAL (the re-attacked bypass)', () => {
    expect(isExternalShaderSource('?shader=wave')).toBe(true);
    expect(isExternalShaderSource('?name=blur&v=2')).toBe(true);
  });

  it('treats a BARE same-dir token (`wave`, no slash/ext/scheme) as EXTERNAL', () => {
    expect(isExternalShaderSource('wave')).toBe(true);
    expect(isExternalShaderSource('post')).toBe(true);
  });

  it('treats data:/blob: URL tokens as EXTERNAL (URL-shaped, never inline literal source)', () => {
    // A data:/blob: token is something the URL policy treats as a URL (data: is
    // cross-origin → policy-vetted/refused; blob: resolves same-origin → fetchable).
    // Either way it is NOT a genuine multi-line GLSL body the author typed inline,
    // so secure-by-default it must take the external path (fetch+verify or refuse),
    // never be compiled as literal shader text.
    expect(isExternalShaderSource('blob:http://localhost/abc-123')).toBe(true);
    expect(isExternalShaderSource('data:text/plain,void%20main(){}')).toBe(true);
  });

  it('does NOT over-correct: a real multi-line GLSL/WGSL body stays inline', () => {
    // Bodies carry inner whitespace / newlines / shader syntax — never fetched.
    expect(isExternalShaderSource(SAMPLE_GLSL)).toBe(false);
    expect(
      isExternalShaderSource(
        '@group(0) @binding(0) var<uniform> u: U;\n@fragment fn fs_main() -> @location(0) vec4<f32> { return vec4(1.0); }',
      ),
    ).toBe(false);
    // A single-line body with inner whitespace (statements) is still inline.
    expect(isExternalShaderSource('void main() { gl_FragColor = vec4(1.0); }')).toBe(false);
  });
});

describe('THE DRILL SERGEANT — classifier is a provable function of the URL policy', () => {
  // The cross-check that makes drift IMPOSSIBLE: for EVERY input, if the URL policy
  // (`isFetchableRuntimeUrl`, the SAME predicate the shader classifier delegates to)
  // treats the token as a fetchable URL, then `isExternalShaderSource` MUST return
  // true. Delegation means this can never be violated by construction; the property
  // guards against a future re-introduction of a parallel heuristic. If someone later
  // teaches the URL policy a new fetchable shape, the classifier follows automatically.
  it('PROPERTY: fetchable-by-the-URL-policy ⟹ external (no fetchable shape reaches inline)', () => {
    fc.assert(
      fc.property(fc.string(), (raw) => {
        // The single source of truth: the URL policy's own fetchable-URL predicate.
        if (isFetchableRuntimeUrl(raw)) {
          expect(isExternalShaderSource(raw)).toBe(true);
        }
      }),
      { numRuns: 2000 },
    );
  });

  it('PROPERTY: the classifier and the URL-policy predicate are IDENTICAL (delegation, not a twin)', () => {
    // Stronger than the implication above: the two are the SAME function. A real
    // inline body (carries inner whitespace) is rejected by BOTH; a URL token is
    // accepted by BOTH. This is what "function OF the URL policy" means.
    fc.assert(
      fc.property(fc.string(), (raw) => {
        expect(isExternalShaderSource(raw)).toBe(isFetchableRuntimeUrl(raw));
      }),
      { numRuns: 2000 },
    );
  });

  it('drives the cross-check over the canonical accepted-shape corpus the URL tests use', () => {
    // The exact corpus of shapes the URL policy accepts as fetchable: path-relative,
    // query-relative, bare same-dir, protocol-relative, scheme-absolute http(s),
    // root-absolute, and the data:/blob: URL-shaped tokens. Each must be EXTERNAL.
    const fetchableCorpus = [
      '/shaders/wave.glsl', // root-absolute
      'shaders/foo.glsl', // path-relative
      './sub/bar.wgsl', // explicit-relative
      '../assets/wave.frag', // parent-relative
      'shader file.wgsl', // single-line path WITH A SPACE (codex round-3 bypass)
      './shader file.wgsl', // explicit-relative path WITH A SPACE
      '?shader=wave', // query-relative (the re-attacked bypass)
      '?name=blur&v=2', // query-relative, multi-param
      'wave', // bare same-dir token (the re-attacked bypass)
      'post.vert', // bare token w/ shader extension
      '//cdn.example/wave.wgsl', // protocol-relative
      'https://cdn.example/wave.glsl', // scheme-absolute https
      'http://localhost/wave.glsl', // scheme-absolute http
      'blob:http://localhost/abc-123', // blob: URL token
      'data:text/plain,void%20main(){}', // data: URL token
    ];
    for (const url of fetchableCorpus) {
      // The URL policy treats it as a fetchable URL...
      expect(isFetchableRuntimeUrl(url)).toBe(true);
      // ...so the classifier MUST agree it is external (never compiled unverified).
      expect(isExternalShaderSource(url)).toBe(true);
    }
  });

  it('a genuine multi-line GLSL AND WGSL body is rejected as a URL by BOTH (stays inline)', () => {
    const glsl = '#version 300 es\nprecision mediump float;\nout vec4 c;\nvoid main(){ c = vec4(1.0); }';
    const wgsl =
      '@group(0) @binding(0) var<uniform> u: U;\n@fragment fn fs_main() -> @location(0) vec4<f32> {\n  return vec4<f32>(1.0);\n}';
    for (const body of [glsl, wgsl]) {
      // The URL policy does NOT treat a multi-line body as a fetchable URL token
      // (inner whitespace/newlines ⟹ a body, not a single URL token)...
      expect(isFetchableRuntimeUrl(body)).toBe(false);
      // ...so the classifier keeps it INLINE — no over-correction.
      expect(isExternalShaderSource(body)).toBe(false);
    }
  });
});

describe('decideShaderIntegrity — secure-by-default refusal', () => {
  it('a verified result ALWAYS proceeds', () => {
    const expected = parseShaderIntegrity(sriOf(SAMPLE_GLSL));
    const result = verifyShaderIntegrity(SAMPLE_GLSL, expected);
    expect(decideShaderIntegrity(result, DEFAULT_SHADER_INTEGRITY_MODE).proceed).toBe(true);
  });

  it('a mismatch ALWAYS refuses, in EITHER mode (a tampered shader is never allowed)', () => {
    const tampered = verifyShaderIntegrity('tampered', parseShaderIntegrity(sriOf(SAMPLE_GLSL)));
    expect(decideShaderIntegrity(tampered, 'required-for-external').proceed).toBe(false);
    expect(decideShaderIntegrity(tampered, 'lenient').proceed).toBe(false);
  });

  it('an absent pin REFUSES under the secure default but is allowed under lenient', () => {
    const absent = verifyShaderIntegrity(SAMPLE_GLSL, null);
    // Secure-by-default: an external fetch with no pin is refused.
    const def = decideShaderIntegrity(absent, DEFAULT_SHADER_INTEGRITY_MODE);
    expect(def.proceed).toBe(false);
    if (!def.proceed) expect(def.reason).toBe('absent-required');
    // The host escape hatch: lenient allows the pre-pin behavior.
    expect(decideShaderIntegrity(absent, 'lenient').proceed).toBe(true);
  });

  it('the default mode is the secure one (required-for-external)', () => {
    expect(DEFAULT_SHADER_INTEGRITY_MODE).toBe('required-for-external');
  });
});
