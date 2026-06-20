/**
 * The assurance map — `levelOf` over representative repo paths, and the small
 * glob dialect (`**`, `*`, `{a,b}`) it rides on. These pins are the contract the
 * engine's level-scoping depends on: if a path's level drifts, the gate scope
 * drifts with it, so we pin the level of one representative path per rule.
 */

import { describe, it, expect } from 'vitest';
import { levelOf, matchesGlob, LITESHIP_ASSURANCE_MAP, type LevelRule } from '@czap/gauntlet';

describe('matchesGlob — the small dialect (** / * / {a,b})', () => {
  it('* matches within a single segment only (not across a slash)', () => {
    expect(matchesGlob('packages/cli/src/index.ts', 'packages/*/src/index.ts')).toBe(true);
    expect(matchesGlob('packages/cli/sub/src/index.ts', 'packages/*/src/index.ts')).toBe(false);
  });

  it('** spans any number of segments, including zero', () => {
    expect(matchesGlob('packages/worker/src/a.ts', 'packages/worker/src/**')).toBe(true);
    expect(matchesGlob('packages/worker/src/deep/nested/a.ts', 'packages/worker/src/**')).toBe(true);
    expect(matchesGlob('packages/worker/src/', 'packages/worker/src/**')).toBe(true);
  });

  it('{a,b,c} alternation matches each literal stem (and rejects others)', () => {
    const g = 'packages/core/src/{boundary,signal,zap}.ts';
    expect(matchesGlob('packages/core/src/signal.ts', g)).toBe(true);
    expect(matchesGlob('packages/core/src/boundary.ts', g)).toBe(true);
    expect(matchesGlob('packages/core/src/zap.ts', g)).toBe(true);
    expect(matchesGlob('packages/core/src/other.ts', g)).toBe(false);
  });

  it('a hyphenated stem inside braces stays literal (gen-frame is not a regex range)', () => {
    const g = 'packages/core/src/{gen-frame,token-buffer}.ts';
    expect(matchesGlob('packages/core/src/gen-frame.ts', g)).toBe(true);
    expect(matchesGlob('packages/core/src/token-buffer.ts', g)).toBe(true);
    // The `-` is literal, so a single-char "range" never matches.
    expect(matchesGlob('packages/core/src/genXframe.ts', g)).toBe(false);
  });

  it('a `.` in the glob is a literal dot, not "any char"', () => {
    expect(matchesGlob('packages/edge/src/manifest.ts', 'packages/edge/src/manifest.ts')).toBe(true);
    expect(matchesGlob('packages/edge/src/manifestXts', 'packages/edge/src/manifest.ts')).toBe(false);
  });

  it('is anchored at both ends (no partial match)', () => {
    expect(matchesGlob('xpackages/cli/src/index.ts', 'packages/*/src/index.ts')).toBe(false);
    expect(matchesGlob('packages/cli/src/index.tsx', 'packages/*/src/index.ts')).toBe(false);
  });
});

describe('levelOf — first matching rule wins, default L1', () => {
  // One representative path per encoded rule, plus the default.
  const cases: ReadonlyArray<readonly [path: string, level: string]> = [
    // L4 — the trust spine
    ['packages/canonical/src/whatever.ts', 'L4'],
    ['packages/canonical/src/deep/nested.ts', 'L4'],
    ['packages/core/src/receipt.ts', 'L4'],
    ['packages/core/src/hlc.ts', 'L4'],
    ['packages/core/src/ai-cast.ts', 'L4'],
    ['packages/core/src/brands.ts', 'L4'],
    // L3 — the deterministic runtime / projection / cache paths
    ['packages/core/src/signal.ts', 'L3'],
    ['packages/core/src/zap.ts', 'L3'],
    ['packages/core/src/gen-frame.ts', 'L3'],
    ['packages/core/src/token-buffer.ts', 'L3'],
    ['packages/core/src/boundary.ts', 'L3'],
    ['packages/quantizer/src/quantizer.ts', 'L3'],
    ['packages/web/src/capture/probe.ts', 'L3'],
    ['packages/web/src/stream/sse-pure.ts', 'L3'],
    ['packages/worker/src/compositor-startup.ts', 'L3'],
    ['packages/astro/src/runtime/boundary.ts', 'L3'],
    // L2 — public API + serialized contracts
    ['packages/scene/src/index.ts', 'L2'],
    ['packages/edge/src/contract.ts', 'L2'],
    ['packages/edge/src/capsule.ts', 'L2'],
    ['packages/scene/src/contract.ts', 'L2'],
    ['packages/edge/src/manifest.ts', 'L2'],
    // L0/L1 — tooling, where ambient nondeterminism is legit
    ['packages/cli/src/commands/ship.ts', 'L1'],
    ['packages/command/src/commands/scene.ts', 'L1'],
    ['packages/gauntlet/src/engine.ts', 'L1'],
    ['packages/mcp-server/src/server-info.ts', 'L1'],
    ['scripts/anything.mjs', 'L1'],
    // default
    ['packages/core/src/diagnostics.ts', 'L1'],
    ['packages/some-new-pkg/src/lib.ts', 'L1'],
  ];

  for (const [path, level] of cases) {
    it(`${path} → ${level}`, () => {
      expect(levelOf(path)).toBe(level);
    });
  }

  it('honors a custom map (first match wins, ordered)', () => {
    const map: readonly LevelRule[] = [
      { glob: 'src/critical.ts', level: 'L4' },
      { glob: 'src/**', level: 'L2' },
    ];
    expect(levelOf('src/critical.ts', map)).toBe('L4'); // specific first
    expect(levelOf('src/other.ts', map)).toBe('L2'); // falls to the broad rule
    expect(levelOf('elsewhere.ts', map)).toBe('L1'); // no rule → default
  });

  it('index.ts (L2) wins over the broad L1 tooling rule because it is listed first', () => {
    // packages/gauntlet/src/index.ts matches BOTH `packages/*/src/index.ts` (L2)
    // and the gauntlet tooling `**` (L1); the L2 rule is earlier → it wins.
    expect(levelOf('packages/gauntlet/src/index.ts')).toBe('L2');
  });

  it('the default map is non-empty and ordered most-specific-first by construction', () => {
    expect(LITESHIP_ASSURANCE_MAP.length).toBeGreaterThan(0);
    // The very first rule is the most specific spine (canonical), not the default.
    expect(LITESHIP_ASSURANCE_MAP[0]?.level).toBe('L4');
  });
});
