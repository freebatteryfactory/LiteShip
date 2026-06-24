/**
 * Slice B (B3.2) — the AST oracle's `var-declaration` / `require-call` facts +
 * the live triangulated dogfood over a controlled tmp corpus (fast, deterministic).
 *
 * PARITY/PRECISION: the audit AST oracle emits a `var-declaration` fact for a REAL
 * legacy binding and a `require-call` fact for a REAL CommonJS-loader call — and
 * NEVER for the keyword inside a comment/string (the AST sees the real node, the
 * comment-blind regex does not). This is the same precision guarantee the
 * `bare-throw` AST oracle ships, generalized to the two new properties.
 *
 * DOGFOOD: over a corpus whose ONLY keyword occurrence is inside a doc COMMENT, the
 * host-composed IR carries a regex fact (text-only) where the AST is silent — and
 * the matching divergence gate reports it as an advisory cross-class divergence,
 * the live proof the text-only oracle is imprecise and should be retired.
 *
 * @module
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { buildRepoIR, resolveDevopsProfile, type DevopsProfile } from '@czap/audit';
import { liteshipRegexOracle } from '../../../packages/cli/src/lib/repo-ir-gauntlet.js';
import {
  noVarDivergenceGate,
  noRequireDivergenceGate,
  memoryContext,
  type Fact,
  type GateContext,
  type RepoIR,
} from '@czap/gauntlet';

const fixtures: string[] = [];
afterEach(() => {
  for (const dir of fixtures.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function makeFixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'czap-var-require-'));
  fixtures.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const abs = resolve(root, rel);
    mkdirSync(resolve(abs, '..'), { recursive: true });
    writeFileSync(abs, content, 'utf8');
  }
  return root;
}

const PKG = (name: string): string =>
  JSON.stringify({ name, version: '0.0.0', dependencies: {}, exports: { '.': { development: './src/index.ts' } } });

function acmeProfile(root: string): DevopsProfile {
  return resolveDevopsProfile({
    repoRoot: root,
    internalPackagePrefix: '@acme/',
    packageTopology: { '@acme/core': { allowedInternalImports: [], kind: 'core' } },
  });
}

function buildHostIR(profile: DevopsProfile): RepoIR {
  return buildRepoIR(profile, { extraFactOracles: [liteshipRegexOracle] });
}

function irContext(ir: RepoIR): GateContext {
  return { ...memoryContext({}), ir };
}

function astFactLines(facts: readonly Fact[], property: string): number[] {
  return facts
    .filter((f) => f.property === property && f.oracleId === 'ts-ast')
    .map((f) => f.line ?? 0)
    .sort((a, b) => a - b);
}

describe('the AST oracle emits var-declaration / require-call facts precisely', () => {
  // A corpus with: a REAL legacy binding (line 2), a REAL require call (line 3),
  // AND the same two keywords inside a doc COMMENT (line 5) + a STRING (line 6) —
  // the precision trap. The AST oracle sees only the two real nodes.
  // NOTE: the var/require keyword literals live ONLY in the fixture STRINGS below,
  // never in this test file's own comments (the NO_VAR/NO_REQUIRE scanners would
  // flag this file too).
  const corpus: Record<string, string> = {
    'package.json': JSON.stringify({ name: 'acme-root', private: true, type: 'module' }),
    'packages/core/package.json': PKG('@acme/core'),
    'packages/core/src/index.ts':
      'export function f() {\n' +
      '  var legacyBinding = 1;\n' + // line 2 — a real legacy binding
      '  const mod = require("node:os");\n' + // line 3 — a real loader call
      '  return [legacyBinding, mod];\n' +
      '}\n' +
      '// a comment naming the var keyword and the require( loader textually\n' + // line 6 — comment-occurrence
      'export const s = "this string says var x and require( y";\n', // line 7 — string-occurrence
  };

  it('emits a var-declaration fact ONLY for the real legacy binding (never the comment/string)', () => {
    const ir = buildRepoIR(acmeProfile(makeFixture(corpus)));
    expect(astFactLines(ir.facts, 'var-declaration')).toEqual([2]);
  });

  it('emits a require-call fact ONLY for the real loader call (never the comment/string)', () => {
    const ir = buildRepoIR(acmeProfile(makeFixture(corpus)));
    expect(astFactLines(ir.facts, 'require-call')).toEqual([3]);
  });

  it('both oracles AGREE on the real sites — no divergence on the genuine code lines', () => {
    const ir = buildHostIR(acmeProfile(makeFixture(corpus)));
    // The real legacy binding (line 2) and loader call (line 3) ARE matched by both
    // the AST oracle and the comment-blind regex (the keyword is on a code line too),
    // so neither is a divergence. The comment/string lines (6, 7), however, ARE
    // regex-only → divergences. Assert each gate fires ONLY on the text-only lines.
    const varFindings = noVarDivergenceGate.run(irContext(ir));
    const reqFindings = noRequireDivergenceGate.run(irContext(ir));
    // The regex fires on line 2 (real, agreed), line 6 (comment), line 7 (string).
    // line 2 agrees → not a divergence. lines 6 + 7 are regex-only → divergences.
    const varLines = varFindings.map((f) => f.location?.line).sort((a, b) => (a ?? 0) - (b ?? 0));
    expect(varLines).toEqual([6, 7]);
    for (const f of varFindings) {
      expect(f.severity).toBe('advisory');
      expect(f.detail).toContain('RETIRE');
    }
    // require( appears on line 3 (real, agreed), line 6 (comment), line 7 (string).
    const reqLines = reqFindings.map((f) => f.location?.line).sort((a, b) => (a ?? 0) - (b ?? 0));
    expect(reqLines).toEqual([6, 7]);
    for (const f of reqFindings) expect(f.severity).toBe('advisory');
  });
});
