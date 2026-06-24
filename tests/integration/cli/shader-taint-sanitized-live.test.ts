/**
 * Shader CONTENT-integrity — the LIVE taint-oracle proof over THIS very repo: the
 * three shader-source flows (`fetch → gl.shaderSource`, `fetch → compileShader`,
 * `fetch → device.createShaderModule`) are now genuinely SANITIZED by
 * `verifyShaderIntegrity`, HONESTLY — because the verifier is really on the data
 * path between the fetch and the compile sink, not because the model was softened.
 *
 * Mirrors `var-require-divergence-real-repo.test.ts`: build the host-injected
 * LiteShip taint facts ONCE over the real corpus with the SAME generic oracle the
 * gauntlet runs (`buildRepoIRTaint`) and the SAME host registry the CLI injects
 * (`LITESHIP_TAINT_REGISTRY`), then assert the ACTUAL flow classifications.
 *
 * THE LAW: zero UNSANITIZED source→sink flows on this repo, and every shader
 * compile sink (`shaderSource` / `compileShader` / `createShaderModule`) fed by a
 * `fetch` is broken by `verifyShaderIntegrity` on the path. If a future change
 * routes fetched shader bytes to a compile sink WITHOUT the integrity verifier,
 * this test goes red — the verifier is pinned ONTO the path, not just present in
 * the registry.
 *
 * @module
 */
// PROVES: INV-SHADER-CONTENT-INTEGRITY
import { describe, it, expect, beforeAll } from 'vitest';
import { scaledTimeout } from '../../../vitest.shared.js';
import { buildRepoIRTaint, type TaintFacts } from '../../../packages/audit/src/repo-ir-taint.js';
import { LITESHIP_TAINT_REGISTRY } from '../../../packages/cli/src/lib/taint-policy.js';

const SHADER_COMPILE_SINKS = new Set(['shaderSource', 'compileShader', 'createShaderModule']);

describe('LIVE taint oracle — shader content flows are sanitized by verifyShaderIntegrity', () => {
  let facts: TaintFacts;

  // The type-directed trace over the whole corpus is heavy (~minutes cold) — build
  // it ONCE, with a generous timeout, then assert against the materialized facts.
  beforeAll(() => {
    facts = buildRepoIRTaint(LITESHIP_TAINT_REGISTRY);
  }, scaledTimeout(240_000));

  it('reports ZERO unsanitized source→sink flows on this repo', () => {
    const unsanitized = facts.flows.filter((f) => f.sanitizedBy === null);
    // Self-explaining failure: name every unsanitized flow so a regression is legible.
    const detail = unsanitized.map((f) => `${f.source.callee}@${f.source.file}:${f.source.line} -> ${f.sink.callee}@${f.sink.file}:${f.sink.line}`);
    expect(detail).toEqual([]);
  });

  it('every fetch→shader-compile-sink flow is broken by verifyShaderIntegrity on the path', () => {
    const shaderFlows = facts.flows.filter(
      (f) => f.source.callee === 'fetch' && SHADER_COMPILE_SINKS.has(f.sink.callee),
    );
    // The three known shader-content surfaces (GLSL shaderSource + compileShader,
    // WGSL createShaderModule) must all be present and all sanitized — the verifier
    // is genuinely between the fetch and the sink.
    expect(shaderFlows.length).toBeGreaterThanOrEqual(3);
    for (const flow of shaderFlows) {
      expect(flow.sanitizedBy).not.toBeNull();
      expect(flow.sanitizedBy?.callee).toBe('verifyShaderIntegrity');
    }
    // Both compile families are covered (not just one path sanitized).
    const sinkCallees = new Set(shaderFlows.map((f) => f.sink.callee));
    expect(sinkCallees.has('createShaderModule')).toBe(true);
    expect([...sinkCallees].some((c) => c === 'shaderSource' || c === 'compileShader')).toBe(true);
  });
});
