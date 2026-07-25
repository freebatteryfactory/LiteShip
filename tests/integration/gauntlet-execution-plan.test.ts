/**
 * Gauntlet execution-plan integration over a real filesystem.
 *
 * Unit tests prove each fold independently. This suite proves the public runner
 * composes repository selection, assurance scoping, gate qualification,
 * authority, waivers, and deterministic outcome ordering through one path.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  defineGate,
  finding,
  memoryContext,
  runGauntletOnRepo,
  type Gate,
  type LevelRule,
  type Waiver,
} from '@liteship/gauntlet';

const NOW = new Date('2026-07-24T00:00:00.000Z');
const MAP: readonly LevelRule[] = [
  { glob: 'packages/trust/src/**', level: 'L4' },
  { glob: 'packages/app/src/**', level: 'L1' },
];

function tokenGate(id: string, level: 'L1' | 'L4', token: string): Gate {
  const run = (context: Parameters<Gate['run']>[0]) =>
    context
      .files()
      .filter((file) => (context.readFile(file) ?? '').includes(token))
      .map((file) =>
        finding({
          ruleId: id,
          severity: 'error',
          level,
          title: `forbidden ${token}`,
          detail: `${file} contains ${token}`,
          location: { file, line: 1 },
        }),
      );

  return defineGate({
    id,
    level,
    describe: `flags ${token}`,
    run,
    fixtures: {
      red: { name: 'token present', context: memoryContext({ 'bad.ts': token }) },
      green: { name: 'token absent', context: memoryContext({ 'good.ts': 'clean' }) },
      mutation: { describe: 'disable detection', mutate: (gate) => ({ ...gate, run: () => [] }) },
    },
  });
}

describe('runGauntletOnRepo execution plan', () => {
  let repoRoot = '';

  beforeAll(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'liteship-gauntlet-integration-'));
    const trust = join(repoRoot, 'packages', 'trust', 'src');
    const app = join(repoRoot, 'packages', 'app', 'src');
    mkdirSync(trust, { recursive: true });
    mkdirSync(app, { recursive: true });
    writeFileSync(join(trust, 'critical.ts'), 'FORBIDDEN_L4\n', 'utf8');
    writeFileSync(join(app, 'ordinary.ts'), 'FORBIDDEN_L1\nFORBIDDEN_L4\n', 'utf8');
    writeFileSync(join(app, 'ignored.txt'), 'FORBIDDEN_L1\n', 'utf8');
  });

  afterAll(() => {
    if (repoRoot !== '') rmSync(repoRoot, { recursive: true, force: true });
  });

  it('composes filesystem selection, assurance scope, authority, and deterministic gate order', () => {
    const l4 = tokenGate('integration/l4', 'L4', 'FORBIDDEN_L4');
    const l1 = tokenGate('integration/l1', 'L1', 'FORBIDDEN_L1');
    const options = { repoRoot, globs: ['packages/*/src/**/*.ts'] } as const;

    const first = runGauntletOnRepo([l4, l1], options, { assuranceMap: MAP, now: NOW });
    const second = runGauntletOnRepo([l4, l1], options, { assuranceMap: MAP, now: NOW });

    expect(first.outcomes.map((outcome) => outcome.gateId)).toEqual(['integration/l4', 'integration/l1']);
    expect(first.outcomes.every((outcome) => outcome.authority === 'blocking')).toBe(true);
    expect(first.outcomes[0]?.findings.map((entry) => entry.location?.file)).toEqual([
      'packages/trust/src/critical.ts',
    ]);
    expect(first.outcomes[1]?.findings.map((entry) => entry.location?.file)).toEqual(['packages/app/src/ordinary.ts']);
    expect(first.findings.some((entry) => entry.location?.file.endsWith('ignored.txt'))).toBe(false);
    expect(first.blocked).toBe(true);
    expect(second).toEqual(first);
  });

  it('applies a gate-scoped waiver without hiding another gate or changing the execution plan', () => {
    const l4 = tokenGate('integration/l4', 'L4', 'FORBIDDEN_L4');
    const l1 = tokenGate('integration/l1', 'L1', 'FORBIDDEN_L1');
    const waivers: readonly Waiver[] = [
      {
        ruleId: l4.id,
        file: 'packages/trust/src/critical.ts',
        line: 1,
        owner: 'integration-test',
        reason: 'prove the public runner carries gate-scoped waiver evidence',
        expires: '2027-07-24',
        blastRadius: 'one synthetic fixture',
        debtScore: 0,
      },
    ];

    const result = runGauntletOnRepo(
      [l4, l1],
      { repoRoot, globs: ['packages/*/src/**/*.ts'] },
      { assuranceMap: MAP, waivers, now: NOW },
    );

    expect(result.outcomes[0]?.findings).toEqual([]);
    expect(result.outcomes[0]?.waived).toHaveLength(1);
    expect(result.outcomes[0]?.waiverFindings).toEqual([]);
    expect(result.outcomes[1]?.findings).toHaveLength(1);
    expect(result.blocked).toBe(true);
  });
});
