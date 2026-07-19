/**
 * The perf-claim-without-bench gate (Slice C, the claim-vs-reality tier) — the
 * gate that catches a MEASURABLE performance claim shipped in published source with
 * NO benchmark behind it (the gate that would have caught a "zero-allocation hot
 * path" claim with no allocation bench). These tests pin: (1) it self-proves via
 * the authority ratchet, (2) it CATCHES an unbenched perf claim (code-name + doc),
 * (3) it stays clean when the claim IS benched, (4) its precision anchors hold
 * (mention-form keywords — backticked / quoted / string-literal — never fire), and
 * (5) THE REAL REPO IS GREEN on it — post-cure, every perf claim is benched.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { verifyGate, runGates, memoryContext, nodeContext } from '@liteship/gauntlet';
import {
  perfClaimBenchGate,
  PERF_CLAIM_BENCH_RULE_ID,
} from '../../../packages/gauntlet/src/gates/perf-claim-bench.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..');

/** A distributions.json whose declared bench name references the claiming module. */
const COMPOSITOR_BENCH = JSON.stringify({
  schemaVersion: 1,
  distributions: [
    { name: 'alloc -- compositor compute', file: 'tests/bench/allocation.bench.ts', inputSize: 1, shape: 'x', replicates: 1 },
  ],
});

describe('perf-claim-without-bench gate — self-proof (the authority ratchet)', () => {
  it('self-proves: red caught, green clean, mutation killed, blocking-eligible', () => {
    const proof = verifyGate(perfClaimBenchGate);
    expect(proof.redCaught).toBe(true);
    expect(proof.greenClean).toBe(true);
    expect(proof.mutationKilled).toBe(true);
    expect(proof.selfProven).toBe(true);
  });

  it('is an L3 gate with the reserved rule id', () => {
    expect(perfClaimBenchGate.level).toBe('L3');
    expect(perfClaimBenchGate.id).toBe(PERF_CLAIM_BENCH_RULE_ID);
  });

  it('earns BLOCKING authority through the engine (self-proven → its errors block)', () => {
    const result = runGates([perfClaimBenchGate], perfClaimBenchGate.fixtures.green.context);
    const outcome = result.outcomes.find((o) => o.gateId === PERF_CLAIM_BENCH_RULE_ID);
    expect(outcome?.authority).toBe('blocking');
    expect(result.blocked).toBe(false); // green fixture → blocking gate, no errors
  });
});

describe('THE CLAIM-VS-REALITY LAW — a perf claim with no bench is a finding', () => {
  it('CATCHES a CODE claim — a `fastPath` function in published src with no bench', () => {
    const ctx = memoryContext({
      'packages/widget/src/lookup.ts': 'export function fastPath(): number { return 1; }\n',
    });
    const findings = perfClaimBenchGate.run(ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.detail).toContain('fastPath');
    expect(findings[0]?.severity).toBe('error');
  });

  it('CATCHES a DOC claim — the CURE-2 "zero-allocation hot path" doc with no bench', () => {
    const ctx = memoryContext({
      'packages/core/src/media/compositor.ts': '/**\n * Zero-allocation hot path backed by a pool.\n */\nexport const x = 1;\n',
    });
    const findings = perfClaimBenchGate.run(ctx);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings.some((f) => f.title.includes('Performance claim with no benchmark'))).toBe(true);
  });

  it('STAYS CLEAN when the same doc claim IS measured by a declared bench naming the module', () => {
    const ctx = memoryContext({
      'packages/core/src/media/compositor.ts': '/**\n * Zero-allocation hot path backed by a pool.\n */\nexport const x = 1;\n',
      'benchmarks/distributions.json': COMPOSITOR_BENCH,
    });
    expect(perfClaimBenchGate.run(ctx)).toHaveLength(0);
  });

  it('STAYS CLEAN when a bench REGISTRATION (tests/bench/*.bench.ts) names the claim symbol', () => {
    const ctx = memoryContext({
      'packages/widget/src/lookup.ts': 'export function fastPath(): number { return 1; }\n',
      'tests/bench/widget.bench.ts': "const bench = {add(_n){}}; bench.add('fastPath -- single call');\n",
    });
    expect(perfClaimBenchGate.run(ctx)).toHaveLength(0);
  });
});

describe('PRECISION — mention-form keywords never fire (no dirty green floor)', () => {
  it('does NOT flag a keyword inside a STRING literal (a vocabulary list)', () => {
    const ctx = memoryContext({
      'packages/widget/src/keywords.ts': "export const KEYWORDS = ['zero-alloc', 'fast-path', 'hot-path'];\n",
    });
    expect(perfClaimBenchGate.run(ctx)).toHaveLength(0);
  });

  it('does NOT flag a keyword inside a BACKTICK / QUOTE span in a comment (a mention)', () => {
    const ctx = memoryContext({
      'packages/widget/src/doc.ts':
        '// scans for `zero-allocation` claims and the "hot-path" vocabulary it enumerates\nexport const y = 1;\n',
    });
    expect(perfClaimBenchGate.run(ctx)).toHaveLength(0);
  });

  it('does NOT substring-match a perf fragment across word boundaries (STANDARDS_SNAPSHOT_PATH ≠ hotpath)', () => {
    const ctx = memoryContext({
      'packages/widget/src/paths.ts': "export const STANDARDS_SNAPSHOT_PATH = 'x';\n",
    });
    expect(perfClaimBenchGate.run(ctx)).toHaveLength(0);
  });

  it('only scans PUBLISHED src — a perf claim in a test file is out of scope', () => {
    const ctx = memoryContext({
      'tests/widget/fastPath.ts': 'export function fastPath(): number { return 1; }\n',
    });
    expect(perfClaimBenchGate.run(ctx)).toHaveLength(0);
  });
});

describe('THE REAL REPO IS GREEN — every perf claim in packages/*/src is benched', () => {
  it('finds ZERO unbenched perf claims across the real published source tree', () => {
    const ctx = nodeContext(REPO_ROOT, [
      'packages/*/src/**/*.ts',
      'benchmarks/distributions.json',
      'tests/bench/**/*.bench.ts',
    ]);
    // Sanity: the glob matched real source (a zero-file context would be a hollow pass).
    expect(ctx.files().length).toBeGreaterThan(0);

    const findings = perfClaimBenchGate.run(ctx);
    const listed = findings.map((f) => `${f.location?.file}:${f.location?.line}`).sort();
    const message = [
      `perf-claim-without-bench found ${findings.length} unbenched perf claim(s) — the floor is ZERO.`,
      'Each below is a perf claim with no bench measuring it — bench it or move to mention-form:',
      ...listed.map((s) => `  + ${s}`),
    ].join('\n');
    expect(listed, message).toEqual([]);
  });

  it('is a DETERMINISTIC fold — same repo state, same findings twice', () => {
    const run = (): readonly string[] =>
      perfClaimBenchGate
        .run(nodeContext(REPO_ROOT, ['packages/*/src/**/*.ts', 'benchmarks/distributions.json', 'tests/bench/**/*.bench.ts']))
        .map((f) => `${f.location?.file}:${f.location?.line}`);
    expect(run()).toEqual(run());
  });
});
