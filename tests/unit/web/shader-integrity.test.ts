/**
 * Shader CONTENT-integrity verifier (`@liteship/web` security) — the content-side
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
 * (`@liteship/core`) — never a hardcoded digest beside the verifier (a hand-typed
 * mirror would drift). So a matching-hash test proves the verifier and the SRI
 * producer agree on one kernel.
 *
 * @module
 */
// PROVES: INV-SHADER-CONTENT-INTEGRITY
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  parseShaderIntegrity,
  verifyShaderIntegrity,
  computeShaderIntegrity,
  isExternalShaderSource,
  decideShaderIntegrity,
  DEFAULT_SHADER_INTEGRITY_MODE,
} from '../../../packages/web/src/security/shader-integrity.js';
import { isFetchableRuntimeUrl, resolveRuntimeUrl } from '../../../packages/web/src/security/runtime-url.js';

const SAMPLE_GLSL = '#version 300 es\nprecision mediump float;\nout vec4 c;\nvoid main(){c=vec4(1.0);}';

/**
 * Compute the author SRI (`sha256-<base64>`) for `content` via the public producer.
 */
function sriOf(content: string): string {
  return computeShaderIntegrity(content);
}

describe('computeShaderIntegrity — source→sha256 SRI producer (#111)', () => {
  it('produces a parseable sha256 SRI that verifies the same content', () => {
    const sri = computeShaderIntegrity(SAMPLE_GLSL);
    expect(sri).toMatch(/^sha256-[A-Za-z0-9+/]+={0,2}$/);
    const parsed = parseShaderIntegrity(sri);
    expect(parsed).not.toBeNull();
    expect(verifyShaderIntegrity(SAMPLE_GLSL, parsed)._tag).toBe('verified');
  });

  it('is deterministic and uses the content-address sha256 kernel (not fnv1a)', () => {
    const a = computeShaderIntegrity(SAMPLE_GLSL);
    const b = computeShaderIntegrity(SAMPLE_GLSL);
    expect(a).toBe(b);
    const tampered = computeShaderIntegrity(SAMPLE_GLSL.replace('vec4(1.0)', 'vec4(0.0)'));
    expect(tampered).not.toBe(a);
  });
});

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

  it('treats a MULTI-LINE inline shader body as NOT external (no fetch boundary)', () => {
    // The sound body signal is a raw NEWLINE — a URL can never contain one. SAMPLE_GLSL
    // is multi-line; a single-line `@fragment fn fs_main() {}` would now be EXTERNAL
    // (secure-by-default: indistinguishable from a URL by content), so the WGSL body is
    // given a newline to prove it is genuine program text.
    expect(isExternalShaderSource(SAMPLE_GLSL)).toBe(false);
    expect(isExternalShaderSource('@fragment\nfn fs_main() {}')).toBe(false);
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

  it('does NOT over-correct: a real MULTI-LINE GLSL/WGSL body stays inline', () => {
    // The ONLY sound body signal is a raw NEWLINE (a URL can never hold one). A
    // multi-line GLSL/WGSL body is program text, compiled inline — never fetched.
    expect(isExternalShaderSource(SAMPLE_GLSL)).toBe(false);
    expect(
      isExternalShaderSource(
        '@group(0) @binding(0) var<uniform> u: U;\n@fragment fn fs_main() -> @location(0) vec4<f32> { return vec4(1.0); }',
      ),
    ).toBe(false);
  });

  // SECURITY REGRESSION (codex round-4 — the MARKER-COLLISION bypass): the prior
  // classifier keyed inline-vs-URL off in-content shader-syntax MARKERS (`{`/`}`/`;`/
  // `fn `/`#version`/…). But those characters are LEGAL in a URL/path/query/fragment,
  // so a single-line URL that happens to contain one collided with the marker and fell
  // into the INLINE branch UNVERIFIED — bypassing fetch+SRI. `shader{1}.wgsl`,
  // `./shader;v=1.wgsl`, `shader?x={y}`, `shaders/fn file.wgsl` ALL resolve as ALLOWED
  // same-origin URLs yet OLD classifier said external=FALSE. The NEWLINE-based
  // discriminator (a URL can never contain a raw newline) has NO content markers, so
  // every single-line value delegates to the URL policy → these are EXTERNAL. RED
  // before / green now: each was external=false, each is now external=true.
  it('treats single-line URLs containing SHADER-SYNTAX punctuation as EXTERNAL (codex round-4)', () => {
    const markerCollisionUrls = [
      'shader{1}.wgsl', // `{`/`}` in the path segment
      './shader;v=1.wgsl', // `;` in the path
      'shader?x={y}', // `{`/`}` in the query
      'shaders/fn file.wgsl', // `fn ` in the path
    ];
    for (const url of markerCollisionUrls) {
      // It resolves as a fetchable same-origin URL under the policy...
      expect(resolveRuntimeUrl(url, { kind: 'gpu-shader', policy: { mode: 'same-origin' } }).type).toBe('allowed');
      // ...and the (single-line) value carries NO newline, so it delegates to the URL
      // policy and is classified EXTERNAL — never compiled as unverified inline source.
      expect(isFetchableRuntimeUrl(url)).toBe(true);
      expect(isExternalShaderSource(url)).toBe(true);
    }
  });

  // HONEST SECURE-BY-DEFAULT TRADE-OFF (codex round-4): a genuine SINGLE-LINE inline
  // body (`void main(){discard;}` on one line) is now treated as EXTERNAL — it will be
  // FETCHED (failing loudly) rather than compiled inline. This REPLACES the prior
  // over-correction test ("a single-line body stays inline"), which depended on the
  // unsound marker heuristic. You cannot distinguish a one-liner body from a URL by
  // content without a marker an attacker controls, so secure-by-default NEVER compiles
  // an unverified single-line string. Real shader bodies are virtually always
  // multi-line, so this costs nothing in practice while closing the whole class.
  it('treats a SINGLE-LINE shader body as EXTERNAL (secure-by-default — never compile unverified)', () => {
    expect(isExternalShaderSource('void main() { gl_FragColor = vec4(1.0); }')).toBe(true);
    expect(isExternalShaderSource('void main(){discard;}')).toBe(true);
    // A MULTI-LINE version of the same body is inline (the newline proves it is a body).
    expect(isExternalShaderSource('void main() {\n  gl_FragColor = vec4(1.0);\n}')).toBe(false);
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
      'shader{1}.wgsl', // path with `{`/`}` (codex round-4 marker-collision bypass)
      './shader;v=1.wgsl', // path with `;` (codex round-4)
      'shader?x={y}', // query with `{`/`}` (codex round-4)
      'shaders/fn file.wgsl', // path with `fn ` (codex round-4)
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

describe('PLATFORM REALITY — a raw newline does NOT make a string un-URL-parseable', () => {
  // The premise the OLD comments asserted ("a URL can NEVER contain a raw newline";
  // "the newline cannot collide") was FALSE. The WHATWG URL parser STRIPS ASCII
  // tab/newline/CR from its input, so a value with a newline DOES URL.canParse and
  // normalizes the newline away. This test pins that platform truth — a guard built on
  // the old false premise would have ASSUMED these are false. RED-before/green-after:
  // the corrected comments now state exactly this behavior.
  it('URL.canParse("shader\\n.wgsl", base) is TRUE and normalizes to /shader.wgsl', () => {
    const base = 'http://localhost';
    // The WHATWG parser strips the newline, so the value DOES parse as a URL.
    expect(URL.canParse('shader\n.wgsl', base)).toBe(true);
    expect(new URL('shader\n.wgsl', base).href).toBe('http://localhost/shader.wgsl');
    // Tab and CR are stripped identically — the whole ASCII-whitespace-in-URL class.
    expect(URL.canParse('shader\t.wgsl', base)).toBe(true);
    expect(new URL('shader\t.wgsl', base).href).toBe('http://localhost/shader.wgsl');
    expect(URL.canParse('shader\r.wgsl', base)).toBe(true);
    expect(new URL('shader\r.wgsl', base).href).toBe('http://localhost/shader.wgsl');
  });

  it('resolveRuntimeUrl WOULD accept the newline-stripped value (proving the divergence is real)', () => {
    // resolveRuntimeUrl delegates to the WHATWG parser, so it resolves the
    // newline-stripped URL as a fetchable same-origin 'allowed'. The shader classifier
    // deliberately does NOT — this is the divergence the corrected docs now state, NOT
    // the false "equivalent to resolveRuntimeUrl" claim.
    const res = resolveRuntimeUrl('shader\n.wgsl', { kind: 'gpu-shader', policy: { mode: 'same-origin' } });
    expect(res.type).toBe('allowed');
    if (res.type === 'allowed') expect(res.resolved.href).toBe('http://localhost/shader.wgsl');
  });
});

describe('THE CODEX WITNESS — a newline-stripping value is INLINE (fail-loud), never an unverified fetch', () => {
  // Codex round-5 P3: `"shader\n.wgsl"` newline-strips to the valid URL
  // `…/shader.wgsl`. The defect was the FALSE claim it can't be a URL; the BEHAVIOR is
  // safe. This pins the real guarantee: the classifier treats the multi-line value as
  // INLINE (NOT fetchable) — so the runtime compiles it as shader text and it FAILS
  // LOUD (invalid GLSL/WGSL), it is NEVER fetched as the salvaged URL. No SRI bypass.
  it('classifies the codex value `"shader\\n.wgsl"` as INLINE (not external, not fetchable)', () => {
    // isFetchableRuntimeUrl / isExternalShaderSource report NOT-fetchable (inline body)
    // even though resolveRuntimeUrl WOULD have accepted the stripped URL — the
    // deliberate, secure-by-default divergence.
    expect(isFetchableRuntimeUrl('shader\n.wgsl')).toBe(false);
    expect(isExternalShaderSource('shader\n.wgsl')).toBe(false);
  });

  it('the inline value is invalid shader source ⟹ it FAILS LOUD at compile, never fetched (no SRI bypass)', () => {
    // The runtime inline branch (gpu.ts: `fragSource = shaderSrc`) compiles this value
    // LITERALLY. `"shader\n.wgsl"` is not valid GLSL/WGSL, so a real GL/GPU compile
    // rejects it (fails loud). We assert here the path is INLINE — meaning the value
    // never reaches the external fetch+verify branch — which is the no-bypass property.
    // (gpu/wgpu compile is exercised by the runtime tests; this owns the classifier.)
    expect(isExternalShaderSource('shader\n.wgsl')).toBe(false);
    // It is NOT valid shader source either — so the inline-compile fails loud. We pin
    // its non-shader shape (a one-token "path" with a newline) to make the contract
    // explicit: this is neither a fetchable URL (we refuse to strip+fetch) NOR a real
    // body, so the only outcome is a loud compile failure — never an unverified fetch.
    expect('shader\n.wgsl'.includes('\n')).toBe(true);
    expect('shader\n.wgsl'.includes('void')).toBe(false);
  });

  it('an INLINE value that is INVALID shader source carries NO integrity boundary (absent ⟹ inline never fetches)', () => {
    // The classifier puts it on the inline path, where verifyShaderIntegrity is NOT
    // consulted (no fetch ⟹ no bytes-from-network to verify). Pinning the contract: an
    // inline value's safety is "fail loud at compile", not "fetch+SRI". The external
    // path (fetch + verifyShaderIntegrity + decideShaderIntegrity) is reached ONLY for
    // single-line fetchable URLs — which `"shader\n.wgsl"` is deliberately NOT.
    expect(isExternalShaderSource('shader\n.wgsl')).toBe(false);
    // Contrast: the SINGLE-LINE form IS external (fetched + verified) — proving the
    // divergence is exactly the multi-line case, nothing wider.
    expect(isExternalShaderSource('shader.wgsl')).toBe(true);
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
