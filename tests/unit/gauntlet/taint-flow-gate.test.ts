/**
 * Taint-flow gate (the TAINT-ANALYSIS family) — the self-proving fold over the
 * host-supplied {@link TaintFacts}.
 *
 * Pins:
 *  - the authority ratchet: red caught, green clean, mutation killed → blocking.
 *  - an UNSANITIZED source→sink flow is an L4 `error` finding located at the SINK.
 *  - a SANITIZED flow (taint broken on the path) is CLEAN — the gate emits nothing
 *    for it (the guarded-seam green; the false-positive floor is "no finding").
 *  - the finding names BOTH endpoints, the sanitizer-gap, and the path trail
 *    (REPORT-not-DECIDE — self-explaining).
 *  - the gate is LEAN: it folds facts, builds no ts.Program, references no
 *    LiteShip-specific source/sink name (a pure function of `context.taint`).
 */

// PROVES: INV-TAINT-SOURCE-SINK
import { describe, it, expect } from 'vitest';
import {
  taintFlowGate,
  verifyGate,
  earnedAuthority,
  memoryContext,
  type GateContext,
  type TaintFacts,
  type TaintFlow,
} from '@liteship/gauntlet';

function ctx(facts: TaintFacts | undefined): GateContext {
  return facts === undefined ? memoryContext({}) : { ...memoryContext({}), taint: facts };
}

/** An unsanitized fetch → createShaderModule flow (the shape of a real finding). */
const UNSANITIZED: TaintFlow = {
  _tag: 'taint-flow',
  source: { callee: 'fetch', file: 'packages/astro/src/runtime/gpu.ts', line: 340, note: 'a network fetch' },
  sink: {
    callee: 'createShaderModule',
    file: 'packages/astro/src/runtime/gpu.ts',
    line: 88,
    note: 'WGSL shader compilation',
  },
  sanitizedBy: null,
  path: [{ via: 'wgslSource', file: 'packages/astro/src/runtime/gpu.ts', line: 341 }],
};

/** The same flow, but broken by resolveRuntimeUrl on the path (clean). */
const SANITIZED: TaintFlow = {
  ...UNSANITIZED,
  sanitizedBy: { callee: 'resolveRuntimeUrl', file: 'packages/astro/src/runtime/gpu.ts', line: 182 },
};

describe('taintFlowGate — authority ratchet', () => {
  it('self-proves and earns blocking authority', () => {
    const proof = verifyGate(taintFlowGate);
    expect(proof.redCaught).toBe(true);
    expect(proof.greenClean).toBe(true);
    expect(proof.mutationKilled).toBe(true);
    expect(proof.selfProven).toBe(true);
    expect(earnedAuthority(proof)).toBe('blocking');
  });

  it('the level is L4 (the trust-spine sinks)', () => {
    expect(taintFlowGate.level).toBe('L4');
  });
});

describe('taintFlowGate — unsanitized flow is a finding', () => {
  it('reds an L4 error finding located at the SINK, naming both endpoints', () => {
    const facts: TaintFacts = { flows: [UNSANITIZED], interproceduralDepth: 2 };
    const findings = taintFlowGate.run(ctx(facts));
    expect(findings).toHaveLength(1);
    const f = findings[0]!;
    expect(f.severity).toBe('error');
    expect(f.level).toBe('L4');
    // located at the SINK (the dangerous operation + the propagation key).
    expect(f.location?.file).toBe('packages/astro/src/runtime/gpu.ts');
    expect(f.location?.line).toBe(88);
    // self-explaining: names BOTH endpoints + the missing-sanitizer fact.
    expect(f.detail).toContain('fetch');
    expect(f.detail).toContain('createShaderModule');
    expect(f.detail).toContain('NO sanitizer');
    // the path trail is rendered (source → via → sink).
    expect(f.detail).toContain('wgslSource');
    expect(f.remediation?.kind).toBe('instruction');
  });
});

describe('taintFlowGate — sanitized flow is clean', () => {
  it('emits NOTHING for a flow broken by a sanitizer (the guarded-seam green)', () => {
    const facts: TaintFacts = { flows: [SANITIZED], interproceduralDepth: 2 };
    const findings = taintFlowGate.run(ctx(facts));
    expect(findings).toHaveLength(0);
  });

  it('a mix yields exactly one finding (only the unsanitized flow)', () => {
    const facts: TaintFacts = { flows: [UNSANITIZED, SANITIZED], interproceduralDepth: 2 };
    const findings = taintFlowGate.run(ctx(facts));
    expect(findings).toHaveLength(1);
    expect(findings[0]!.ruleId).toContain('fetch-to-createShaderModule');
  });
});

describe('taintFlowGate — guards + leanness', () => {
  it('throws a tagged HostCapabilityError when no taint facts were injected', () => {
    // The gate REQUIRES the facts (taint is opt-in); an absent capability must fail
    // LOUD, never silently no-op a gate whose whole job is the taint dataflow.
    expect(() => taintFlowGate.run(memoryContext({}))).toThrow(/taint facts/i);
  });

  it('is deterministic — folding twice yields identical findings', () => {
    const facts: TaintFacts = { flows: [UNSANITIZED, SANITIZED], interproceduralDepth: 2 };
    const a = taintFlowGate.run(ctx(facts));
    const b = taintFlowGate.run(ctx(facts));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
