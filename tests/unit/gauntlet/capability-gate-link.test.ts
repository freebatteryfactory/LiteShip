/**
 * Capability-gate-link gate (codex round-8, #1b) — the self-proving fold over the host-supplied
 * {@link CapabilityLinkFacts}.
 *
 * Pins:
 *  - the authority ratchet: red caught, green clean, mutation killed → blocking.
 *  - an UNLINKED sanctioned skip (its guard derives from no / the wrong capability probe) is an L4
 *    `error` finding located at the skip site, self-explaining (REPORT-not-DECIDE).
 *  - a LINKED skip (guard derives from its declared capability) is CLEAN — the gate emits nothing.
 *  - a MISLABEL (links to another capability, not the declared one) is caught with a distinct message.
 *  - the gate is LEAN: it folds facts, builds no ts.Program, names no LiteShip capability.
 */

import { describe, it, expect } from 'vitest';
import {
  capabilityGateLinkGate,
  verifyGate,
  earnedAuthority,
  memoryContext,
  type GateContext,
  type CapabilityLinkFacts,
  type CapabilityLinkResult,
} from '@czap/gauntlet';

function ctx(facts: CapabilityLinkFacts | undefined): GateContext {
  return facts === undefined ? memoryContext({}) : { ...memoryContext({}), capabilityLink: facts };
}
function facts(results: readonly CapabilityLinkResult[]): CapabilityLinkFacts {
  return { _tag: 'capability-link-facts', definedCapabilities: ['ffmpeg-absent', 'wasm-absent'], results };
}

const LINKED: CapabilityLinkResult = {
  file: 'tests/x/ffmpeg.test.ts',
  line: 12,
  declaredCapability: 'ffmpeg-absent',
  linkedCapabilities: ['ffmpeg-absent'],
  linked: true,
  guardText: '!FFMPEG_RENDER_CAPABLE',
};
const UNRELATED: CapabilityLinkResult = {
  file: 'tests/x/fake.test.ts',
  line: 7,
  declaredCapability: 'ffmpeg-absent',
  linkedCapabilities: [],
  linked: false,
  guardText: 'Math.random() > 0.5',
};
const MISLABEL: CapabilityLinkResult = {
  file: 'tests/x/mislabel.test.ts',
  line: 4,
  declaredCapability: 'ffmpeg-absent',
  linkedCapabilities: ['wasm-absent'],
  linked: false,
  guardText: '!wasmPresent',
};

describe('capabilityGateLinkGate — authority ratchet', () => {
  it('self-proves and earns blocking authority', () => {
    const proof = verifyGate(capabilityGateLinkGate);
    expect(proof.redCaught).toBe(true);
    expect(proof.greenClean).toBe(true);
    expect(proof.mutationKilled).toBe(true);
    expect(proof.selfProven).toBe(true);
    expect(earnedAuthority(proof)).toBe('blocking');
  });
  it('the level is L4', () => {
    expect(capabilityGateLinkGate.level).toBe('L4');
  });
});

describe('capabilityGateLinkGate — the fold', () => {
  it('an UNRELATED guard (derives from no capability) is an L4 error at the skip site', () => {
    const findings = capabilityGateLinkGate.run(ctx(facts([UNRELATED])));
    expect(findings).toHaveLength(1);
    const f = findings[0]!;
    expect(f.severity).toBe('error');
    expect(f.level).toBe('L4');
    expect(f.location).toEqual({ file: 'tests/x/fake.test.ts', line: 7 });
    expect(f.detail).toContain('NO capability probe');
    expect(f.detail).toContain('Math.random');
    expect(f.remediation?.kind).toBe('instruction');
  });

  it('a MISLABEL (links to the wrong capability) is caught + named', () => {
    const findings = capabilityGateLinkGate.run(ctx(facts([MISLABEL])));
    expect(findings).toHaveLength(1);
    expect(findings[0]!.detail).toContain('MISLABEL');
    expect(findings[0]!.detail).toContain('wasm-absent');
  });

  it('a LINKED skip is CLEAN — emits nothing', () => {
    expect(capabilityGateLinkGate.run(ctx(facts([LINKED])))).toHaveLength(0);
  });

  it('a mix yields exactly the unlinked findings', () => {
    const findings = capabilityGateLinkGate.run(ctx(facts([LINKED, UNRELATED, MISLABEL])));
    expect(findings).toHaveLength(2);
  });
});

describe('capabilityGateLinkGate — guards + leanness', () => {
  it('throws a tagged HostCapabilityError when no facts were injected', () => {
    expect(() => capabilityGateLinkGate.run(memoryContext({}))).toThrow(/capability-link facts/i);
  });
  it('is deterministic — folding twice yields identical findings', () => {
    const a = capabilityGateLinkGate.run(ctx(facts([UNRELATED, MISLABEL])));
    const b = capabilityGateLinkGate.run(ctx(facts([UNRELATED, MISLABEL])));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
