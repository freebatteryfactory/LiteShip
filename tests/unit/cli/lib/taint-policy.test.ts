/**
 * The HOST-INJECTED LiteShip TAINT REGISTRY (`packages/cli/src/lib/taint-policy.ts`)
 * — the LiteShip-LOCAL source / sink / sanitizer classification the CLI injects into
 * `@liteship/audit`'s GENERIC taint oracle (the ADR-0012 / D7b boundary).
 *
 * This module carries NO logic — it is DATA the host hands the oracle. So these pins
 * are CONTRACT pins on that data (the LAW it encodes), not behavior churn:
 *  - SHAPE: the registry is a valid `TaintRegistry` — `sources`/`sinks`/`memberSinks`/
 *    `sanitizers`/`assignmentSinkNames` are `Set`s, `notes` is a record.
 *  - THE NAMED SEAMS: the real visual-compiler untrusted boundaries are classified —
 *    the network/file SOURCES, the GPU-shader / exec / AI-apply / DOM SINKS, and the
 *    AI-cast / genui / SSRF / SRI / HTML-policy SANITIZERS.
 *  - THE DELIBERATE EXCLUSIONS: bare `exec`/`spawn` are NOT sinks (they collide by
 *    name with `RegExp.exec` etc.) — only the collision-free `*Sync` forms are; and
 *    `process.env` is out of the call-classified scope (a documented limit).
 *  - DISJOINTNESS: no name is BOTH a source and a sink, or BOTH a sink and a
 *    sanitizer (a name cannot mean two contradictory things — that would make the
 *    classification ambiguous).
 *  - NOTE COVERAGE: every classified callee has a human `note` (the WHY carried into
 *    a finding) — a property over the union of all classified names.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { LITESHIP_TAINT_REGISTRY } from '../../../../packages/cli/src/lib/taint-policy.js';

const { sources, sinks, sanitizers, assignmentSinkNames, memberSinks, notes } = LITESHIP_TAINT_REGISTRY;

describe('LITESHIP_TAINT_REGISTRY — the shape contract', () => {
  it('is a well-formed TaintRegistry: Sets for the classifications + a notes record', () => {
    expect(sources).toBeInstanceOf(Set);
    expect(sinks).toBeInstanceOf(Set);
    expect(sanitizers).toBeInstanceOf(Set);
    expect(assignmentSinkNames).toBeInstanceOf(Set);
    expect(memberSinks).toBeInstanceOf(Set);
    expect(typeof notes).toBe('object');
    expect(notes).not.toBeNull();
  });

  it('every classification set is non-empty (a registry with no seams classifies nothing)', () => {
    expect(sources!.size).toBeGreaterThan(0);
    expect(sinks!.size).toBeGreaterThan(0);
    expect(sanitizers!.size).toBeGreaterThan(0);
    expect(assignmentSinkNames!.size).toBeGreaterThan(0);
    expect(memberSinks!.size).toBeGreaterThan(0);
  });
});

function classifiedNames(): Set<string> {
  return new Set([...sources!, ...sinks!, ...assignmentSinkNames!, ...memberSinks!, ...sanitizers!]);
}

describe('LITESHIP_TAINT_REGISTRY — the named visual-compiler seams', () => {
  it('SOURCES: the network fetch + the Node file reads are untrusted entry points', () => {
    expect(sources!.has('fetch')).toBe(true);
    expect(sources!.has('readFile')).toBe(true);
    expect(sources!.has('readFileSync')).toBe(true);
  });

  it('SINKS: document.write / writeln use receiver-qualified member sinks (#121)', () => {
    expect(LITESHIP_TAINT_REGISTRY.memberSinks?.has('document.write')).toBe(true);
    expect(LITESHIP_TAINT_REGISTRY.memberSinks?.has('document.writeln')).toBe(true);
    expect(sinks!.has('write')).toBe(false);
    expect(sinks!.has('writeln')).toBe(false);
  });

  it('SINKS: the GPU-shader compile + code-exec + AI-apply seams are dangerous', () => {
    for (const sink of [
      'shaderSource',
      'compileShader',
      'createShaderModule',
      'eval',
      'Function',
      'applyValidatedPatch',
      'apply',
    ]) {
      expect(sinks!.has(sink)).toBe(true);
    }
  });

  it('ASSIGNMENT SINKS: innerHTML / outerHTML are the DOM-injection assignment seams', () => {
    expect(assignmentSinkNames!.has('innerHTML')).toBe(true);
    expect(assignmentSinkNames!.has('outerHTML')).toBe(true);
  });

  it('SANITIZERS: the AI-cast / genui / SSRF / SRI / HTML-policy validators break taint', () => {
    for (const san of [
      'validateGraphPatchProposal',
      'validateGeneratedUITree',
      'validateGeneratedUIProposal',
      'resolveRuntimeUrl',
      'allowRuntimeEndpointUrl',
      'verifyShaderIntegrity',
      'sanitizeElementTree',
      'createHtmlFragment',
      'resolveHtmlString',
    ]) {
      expect(sanitizers!.has(san)).toBe(true);
    }
  });
});

describe('LITESHIP_TAINT_REGISTRY — the deliberate exclusions (a host-policy tightening)', () => {
  it('the COLLISION-FREE *Sync exec forms are sinks; the bare colliding forms are NOT', () => {
    // execSync / spawnSync have no common member-method collision → classified.
    expect(sinks!.has('execSync')).toBe(true);
    expect(sinks!.has('spawnSync')).toBe(true);
    // bare `exec` / `spawn` collide with `RegExp.exec` etc. → DELIBERATELY excluded.
    expect(sinks!.has('exec')).toBe(false);
    expect(sinks!.has('spawn')).toBe(false);
  });

  it('process.env is OUT of the call-classified scope (a documented limit, not a source)', () => {
    expect(sources!.has('process.env')).toBe(false);
    expect(sources!.has('env')).toBe(false);
  });
});

describe('LITESHIP_TAINT_REGISTRY — the classification LAWS (disjointness + note coverage)', () => {
  it('no name is BOTH a source and a call sink (a name cannot mean two contradictory things)', () => {
    for (const name of sources!) {
      expect(sinks!.has(name)).toBe(false);
      expect(memberSinks!.has(name)).toBe(false);
    }
  });

  it('no name is BOTH a call sink and a sanitizer (a guard cannot also be the danger)', () => {
    for (const name of sinks!) {
      expect(sanitizers!.has(name)).toBe(false);
    }
  });

  it('no name is BOTH a member sink and a sanitizer', () => {
    for (const name of memberSinks!) {
      expect(sanitizers!.has(name)).toBe(false);
    }
  });

  it('no name is BOTH a source and a sanitizer', () => {
    for (const name of sources!) {
      expect(sanitizers!.has(name)).toBe(false);
    }
  });

  it('member sinks are disjoint from bare call sinks and assignment sinks', () => {
    for (const name of memberSinks!) {
      expect(sinks!.has(name)).toBe(false);
      expect(assignmentSinkNames!.has(name)).toBe(false);
    }
  });

  it('every CALL-classified callee (source ∪ sink ∪ member-sink ∪ assignment-sink) carries a human note', () => {
    // The note is the WHY the finding renders without re-deriving it. The sanitizers
    // don't need a note (they break taint, they don't appear as a flow endpoint), but
    // every source/sink does. Property over the union of classified call names.
    const callClassified = [...sources!, ...sinks!, ...memberSinks!, ...assignmentSinkNames!];
    fc.assert(
      fc.property(fc.constantFrom(...callClassified), (name) => {
        expect(typeof notes![name]).toBe('string');
        expect(notes![name]!.length).toBeGreaterThan(0);
      }),
      { numRuns: callClassified.length },
    );
  });

  it('an UNCLASSIFIED name has no note (the notes map is exactly the classified seams, no orphans)', () => {
    // A note for a name that is not classified anywhere would be dead documentation —
    // pin the map's keys are a SUBSET of the classified universe.
    const classified = classifiedNames();
    for (const key of Object.keys(notes!)) {
      expect(classified.has(key)).toBe(true);
    }
  });

  it('a name absent from every set is classified by none (the negative control)', () => {
    fc.assert(
      fc.property(
        fc.string().filter(
          (s) =>
            !sources!.has(s) &&
            !sinks!.has(s) &&
            !memberSinks!.has(s) &&
            !sanitizers!.has(s) &&
            !assignmentSinkNames!.has(s),
        ),
        (unknownName) => {
          expect(sources!.has(unknownName)).toBe(false);
          expect(sinks!.has(unknownName)).toBe(false);
          expect(memberSinks!.has(unknownName)).toBe(false);
          expect(sanitizers!.has(unknownName)).toBe(false);
          expect(assignmentSinkNames!.has(unknownName)).toBe(false);
        },
      ),
    );
  });
});
