/**
 * The TAINT IR ORACLE (`buildRepoIRTaint`) — generic source→sink dataflow tracing.
 *
 * The oracle builds a real type-directed `ts.Program` over a profile's corpus and
 * traces a value from a SOURCE call to a SINK call argument, observing the
 * SANITIZER on the path, with a BOUNDED interprocedural depth. The classification
 * (sources/sinks/sanitizers) is INJECTED — the audit engine references no LiteShip
 * name. This test proves the trace over tiny REAL tmp corpora:
 *   • an intra-procedural unsanitized flow (`const x = fetch(); sink(x)`) → flagged,
 *     `sanitizedBy === null`, the source/sink endpoints + path correct;
 *   • a sanitized flow (`const x = sanitize(fetch()); sink(x)`) → emitted CLEAN
 *     (`sanitizedBy` set) — the taint is broken;
 *   • a BOUNDED interprocedural hop (depth 1) follows a tainted return through a
 *     local function;
 *   • the depth BOUND is honest: a flow that needs depth 2 is NOT emitted at
 *     depth 0 (the honest under-approximation — never claimed clean, simply absent);
 *   • an assignment sink (`el.innerHTML = tainted`) is traced;
 *   • a value with no source is NOT flagged (no false-tainted);
 *   • determinism: tracing twice over unchanged source → identical flows.
 *
 * The oracle barrel-exports from @czap/audit; it is imported via its src path (the
 * "src-path import = full pre-wire test" pattern the LanguageService oracle test
 * uses) so the trace is proven independently of the barrel.
 *
 * @module
 */
// PROVES: INV-TAINT-SOURCE-SINK
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import {
  buildRepoIRTaint,
  type TaintRegistry,
  type BuildRepoIRTaintOptions,
} from '../../../packages/audit/src/repo-ir-taint.js';
import { resolveDevopsProfile } from '@czap/audit';

const fixtures: string[] = [];
afterEach(() => {
  for (const dir of fixtures.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function makeFixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'czap-taint-oracle-'));
  fixtures.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const abs = resolve(root, rel);
    mkdirSync(resolve(abs, '..'), { recursive: true });
    writeFileSync(abs, content, 'utf8');
  }
  return root;
}

const PKG = (name: string): string =>
  JSON.stringify({ name, version: '0.0.0', exports: { '.': { development: './src/index.ts' } } });

function acmeProfile(root: string) {
  return resolveDevopsProfile({
    repoRoot: root,
    internalPackagePrefix: '@acme/',
    packageTopology: { '@acme/core': { allowedInternalImports: [], kind: 'core' } },
  });
}

/** A small registry mirroring the LiteShip shape (sources/sinks/sanitizers/assign). */
const REGISTRY: TaintRegistry = {
  sources: new Set(['fetchSource']),
  sinks: new Set(['dangerousSink']),
  assignmentSinkNames: new Set(['innerHTML']),
  sanitizers: new Set(['sanitize']),
  notes: { fetchSource: 'an untrusted fetch', dangerousSink: 'a dangerous compile sink' },
};

/** Build the taint facts over a one-file corpus with the given source body. */
function traceBody(body: string, options: BuildRepoIRTaintOptions = {}) {
  const root = makeFixture({
    'package.json': JSON.stringify({ name: 'acme-root', private: true, type: 'module' }),
    'packages/core/package.json': PKG('@acme/core'),
    'packages/core/src/index.ts':
      'export function fetchSource(): string { return globalThis.location?.href ?? ""; }\n' +
      'export function sanitize(x: string): string { return x.slice(0, 10); }\n' +
      'export function dangerousSink(_x: string): void { /* compile */ }\n' +
      body,
  });
  return buildRepoIRTaint(REGISTRY, { profile: acmeProfile(root), ...options });
}

describe('buildRepoIRTaint — intra-procedural flow (depth 0)', () => {
  it('flags an UNSANITIZED source→sink flow with sanitizedBy null', () => {
    const facts = traceBody(
      'export function run(): void {\n' +
        '  const tainted = fetchSource();\n' +
        '  dangerousSink(tainted);\n' +
        '}\n',
      { interproceduralDepth: 0 },
    );
    expect(facts.flows).toHaveLength(1);
    const flow = facts.flows[0]!;
    expect(flow.source.callee).toBe('fetchSource');
    expect(flow.sink.callee).toBe('dangerousSink');
    expect(flow.sanitizedBy).toBeNull();
    // the depth bound is reported honestly.
    expect(facts.interproceduralDepth).toBe(0);
    // the path threaded through the `tainted` binding.
    expect(flow.path.some((s) => s.via === 'tainted')).toBe(true);
  });

  it('emits a SANITIZED flow (taint broken) when a sanitizer wraps the value', () => {
    const facts = traceBody(
      'export function run(): void {\n' +
        '  const clean = sanitize(fetchSource());\n' +
        '  dangerousSink(clean);\n' +
        '}\n',
      { interproceduralDepth: 0 },
    );
    // The sink argument resolves through `clean` → `sanitize(...)` → the taint is
    // broken at the sanitizer. The flow is emitted CLEAN, not as a finding.
    expect(facts.flows).toHaveLength(1);
    expect(facts.flows[0]!.sanitizedBy).not.toBeNull();
    expect(facts.flows[0]!.sanitizedBy?.callee).toBe('sanitize');
  });

  it('does NOT flag a value with no source (no false-tainted)', () => {
    const facts = traceBody(
      'export function run(): void {\n' +
        '  const safe = "a static string";\n' +
        '  dangerousSink(safe);\n' +
        '}\n',
      { interproceduralDepth: 0 },
    );
    expect(facts.flows).toHaveLength(0);
  });

  it('traces an assignment sink (el.innerHTML = tainted)', () => {
    const facts = traceBody(
      'export function run(el: { innerHTML: string }): void {\n' +
        '  const tainted = fetchSource();\n' +
        '  el.innerHTML = tainted;\n' +
        '}\n',
      { interproceduralDepth: 0 },
    );
    expect(facts.flows).toHaveLength(1);
    expect(facts.flows[0]!.sink.callee).toBe('innerHTML');
    expect(facts.flows[0]!.sanitizedBy).toBeNull();
  });
});

describe('buildRepoIRTaint — bounded interprocedural depth (honest under-approximation)', () => {
  it('FOLLOWS a tainted return through one local-function hop at depth >= 1', () => {
    const body =
      'function getTainted(): string { return fetchSource(); }\n' +
      'export function run(): void {\n' +
      '  const t = getTainted();\n' +
      '  dangerousSink(t);\n' +
      '}\n';
    const flagged = traceBody(body, { interproceduralDepth: 1 });
    expect(flagged.flows).toHaveLength(1);
    expect(flagged.flows[0]!.source.callee).toBe('fetchSource');
    expect(flagged.flows[0]!.sanitizedBy).toBeNull();
  });

  it('does NOT emit a hop-requiring flow at depth 0 — absent, NOT claimed clean', () => {
    const body =
      'function getTainted(): string { return fetchSource(); }\n' +
      'export function run(): void {\n' +
      '  const t = getTainted();\n' +
      '  dangerousSink(t);\n' +
      '}\n';
    const depth0 = traceBody(body, { interproceduralDepth: 0 });
    // At depth 0 the cross-function flow is NOT traced — it is simply NOT a fact.
    // The reported depth (0) is the honest bound: "0 flows" is "not traced this
    // deep", never "provably no taint".
    expect(depth0.flows).toHaveLength(0);
    expect(depth0.interproceduralDepth).toBe(0);
  });
});

describe('buildRepoIRTaint — FORWARD interprocedural (parameter-into-callee, the shader shape)', () => {
  // The real shader surface shape, distilled: a fetched value lands in a `let`
  // reassigned across a try/catch branch, is passed as an ARGUMENT to a helper, the
  // helper passes it to ANOTHER helper, and the innermost helper sinks it via a
  // PARAMETER. The backward-return trace cannot see this (the value is passed IN,
  // never returned); only the FORWARD parameter hop reaches it.
  it('traces fetch → let (branch-reassigned) → helper(x) → helper(x) → sink(param)', () => {
    const body =
      'function innerSink(_gl: unknown, src: string): void {\n' +
      '  dangerousSink(src);\n' + // src is a PARAMETER reaching the sink
      '}\n' +
      'function middle(gl: unknown, frag: string): void {\n' +
      '  innerSink(gl, frag);\n' + // frag is a PARAMETER passed into innerSink
      '}\n' +
      'export async function run(url: string): Promise<void> {\n' +
      '  let fragSource: string;\n' +
      '  try {\n' +
      '    fragSource = fetchSource();\n' + // branch reassignment in try
      '  } catch {\n' +
      '    fragSource = "fallback";\n' + // a clean branch — flow-insensitive union still taints
      '  }\n' +
      '  middle({}, fragSource);\n' + // fragSource passed as ARGUMENT
      '  void url;\n' +
      '}\n';
    const facts = traceBody(body, { interproceduralDepth: 8 });
    // The flow is found end-to-end via TWO forward parameter hops (src ← innerSink's
    // caller, frag ← middle's caller), then the branch-reassigned `fragSource`.
    expect(facts.flows.length).toBeGreaterThanOrEqual(1);
    const flow = facts.flows.find((f) => f.sink.callee === 'dangerousSink');
    expect(flow).toBeDefined();
    expect(flow!.source.callee).toBe('fetchSource');
    expect(flow!.sanitizedBy).toBeNull();
    // the path threaded through the reassigned binding + the forward-bound params.
    expect(flow!.path.some((s) => s.via === 'fragSource')).toBe(true);
    expect(flow!.path.some((s) => s.via === 'src' || s.via === 'frag')).toBe(true);
  });

  it('does NOT reach the parameter-hop flow at depth 0 (honest under-approximation)', () => {
    const body =
      'function innerSink(src: string): void { dangerousSink(src); }\n' +
      'export function run(): void {\n' +
      '  const t = fetchSource();\n' +
      '  innerSink(t);\n' +
      '}\n';
    const depth0 = traceBody(body, { interproceduralDepth: 0 });
    // At depth 0 the forward parameter hop is not taken — the flow is absent, NOT
    // claimed clean (the reported depth says so).
    expect(depth0.flows).toHaveLength(0);
    expect(depth0.interproceduralDepth).toBe(0);
  });

  it('emits the forward flow CLEAN when a content sanitizer sits before the sink', () => {
    // The sanitized variant of the shader shape: the value is validated (a CONTENT
    // sanitizer) before being passed into the sinking callee. The flow is emitted,
    // but sanitizedBy is set — the gate treats it as clean.
    const body =
      'function innerSink(src: string): void { dangerousSink(src); }\n' +
      'export function run(): void {\n' +
      '  const raw = fetchSource();\n' +
      '  const clean = sanitize(raw);\n' + // CONTENT sanitizer on the path
      '  innerSink(clean);\n' +
      '}\n';
    const facts = traceBody(body, { interproceduralDepth: 8 });
    const flow = facts.flows.find((f) => f.sink.callee === 'dangerousSink');
    expect(flow).toBeDefined();
    expect(flow!.sanitizedBy).not.toBeNull();
    expect(flow!.sanitizedBy?.callee).toBe('sanitize');
  });

  it('descends into an OBJECT literal sink argument — sink({ code: tainted }) (the WGSL shape)', () => {
    // createShaderModule({ code: wgslSource }): the sink consumes a structure
    // WRAPPING the tainted value. The trace descends into the literal's property.
    const body =
      'export function run(): void {\n' +
      '  const wgsl = fetchSource();\n' +
      '  dangerousSink({ code: wgsl } as never);\n' +
      '}\n';
    const facts = traceBody(body, { interproceduralDepth: 2 });
    expect(facts.flows).toHaveLength(1);
    expect(facts.flows[0]!.source.callee).toBe('fetchSource');
    expect(facts.flows[0]!.sink.callee).toBe('dangerousSink');
    expect(facts.flows[0]!.sanitizedBy).toBeNull();
  });

  it('does NOT taint a parameter no caller passes a tainted argument to (no false positive)', () => {
    const body =
      'function innerSink(src: string): void { dangerousSink(src); }\n' +
      'export function run(): void {\n' +
      '  innerSink("a static string");\n' + // the only caller passes a clean arg
      '}\n';
    const facts = traceBody(body, { interproceduralDepth: 8 });
    expect(facts.flows).toHaveLength(0);
  });

  it('TERMINATES on a recursive (self-calling) function — the cycle guard halts the hop', () => {
    // A parameter bound from a recursive call would loop without the (parameter,
    // call-site) `hopped` guard. The trace must terminate and find no source.
    const body =
      'function recur(src: string, n: number): void {\n' +
      '  if (n > 0) recur(src, n - 1);\n' + // self-call: src ← recur's own caller
      '  dangerousSink(src);\n' +
      '}\n' +
      'export function run(): void {\n' +
      '  recur("clean", 3);\n' +
      '}\n';
    // No fetchSource anywhere → no flow, and (the real assertion) the call RETURNS
    // (it does not hang) because the cycle guard breaks the self-recursive hop.
    const facts = traceBody(body, { interproceduralDepth: 8 });
    expect(facts.flows).toHaveLength(0);
  });
});

describe('buildRepoIRTaint — guards + determinism', () => {
  it('throws a tagged error for a negative / fractional depth', () => {
    expect(() => traceBody('export const x = 1;\n', { interproceduralDepth: -1 })).toThrow(/non-negative integer/);
  });

  it('is deterministic — tracing twice over unchanged source yields identical flows', () => {
    const root = makeFixture({
      'package.json': JSON.stringify({ name: 'acme-root', private: true, type: 'module' }),
      'packages/core/package.json': PKG('@acme/core'),
      'packages/core/src/index.ts':
        'export function fetchSource(): string { return ""; }\n' +
        'export function dangerousSink(_x: string): void {}\n' +
        'export function run(): void {\n' +
        '  const a = fetchSource();\n' +
        '  dangerousSink(a);\n' +
        '}\n',
    });
    const profile = acmeProfile(root);
    const a = buildRepoIRTaint(REGISTRY, { profile });
    const b = buildRepoIRTaint(REGISTRY, { profile });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
