/**
 * CUT generated-time (B2-follow) — the generated-time vocabulary names its clock.
 *
 * Two clocks wore confusingly-similar names:
 *   - `generated_at` (snake) on the ship capsule is an HLC — causal, public, and
 *     IDENTITY-BEARING (part of the content address). It stays exactly as-is.
 *   - `generatedAt` (camel) on report/artifact shapes is a volatile ISO wall-clock —
 *     provenance only. B2's law: the TYPE names the clock; the field key stays stable
 *     (renaming it would be a committed-artifact schema migration). So the volatile
 *     fields are retyped `WallClockTimestamp`, NOT renamed.
 *
 * These guards pin: the causal clock stays HLC + identity-bearing; the volatile fields
 * carry the WallClockTimestamp type (no bare `string`); the committed JSON keys are
 * unchanged; and `gauntletRunId` is recorded as the same-run coherence signal (the
 * ordering-logic fix is a separate cut).
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO = resolve(import.meta.dirname, '..', '..', '..');
const read = (rel: string): string => readFileSync(resolve(REPO, rel), 'utf8');

/** Every script/report file whose volatile `generatedAt` fields must be WallClockTimestamp-typed. */
const VOLATILE_TYPE_FILES = [
  'scripts/artifact-context.ts',
  'scripts/artifact-types.ts',
  'scripts/artifact-builders.ts',
  'scripts/capsule-compile.ts',
  'scripts/bench-trend.ts',
  'scripts/bench-reality.ts',
  'scripts/bench/replicate-cache.ts',
  'scripts/audit/artifact-contract.ts',
  'scripts/audit/types.ts',
  'scripts/audit/report.ts',
  'scripts/report-runtime-seams.ts',
  'scripts/report-satellite-scan.ts',
];

describe('generated-time — the causal clock (generated_at) stays HLC + identity-bearing', () => {
  it('ShipCapsule.generated_at is typed HLC (an object), not a wall-clock string', () => {
    const src = read('packages/core/src/ship-capsule.ts');
    expect(src).toMatch(/readonly generated_at:\s*HLC\b/);
  });

  it('generated_at participates in the identity-bearing capsule encoding (content address)', () => {
    const src = read('packages/core/src/ship-capsule.ts');
    // It is hashed into the content address inside encodeIdentityBearing — must not be dropped.
    expect(src).toMatch(/encodeIdentityBearing[\s\S]*?generated_at:\s*capsule\.generated_at/);
  });
});

describe('generated-time — no camelCase generatedAt holds an HLC (ship.ts local renamed)', () => {
  it('ship.ts uses generatedHlc for the HLC local, and keeps the public generated_at field', () => {
    const src = read('packages/cli/src/commands/ship.ts');
    expect(src).toMatch(/generatedHlc/); // the HLC local is named for its clock
    expect(src).toMatch(/generated_at:/); // the public snake_case field is preserved
    expect(src).not.toMatch(/\bgeneratedAt\b/); // no camelCase generatedAt holding an HLC
  });
});

describe('generated-time — volatile report/artifact fields are WallClockTimestamp, not bare string', () => {
  for (const rel of VOLATILE_TYPE_FILES) {
    it(`${rel} types its generatedAt fields as WallClockTimestamp`, () => {
      const src = read(rel);
      // No bare `generatedAt: string` (or `?: string` / `: string | null`) remains.
      expect(src, `${rel} must not declare a bare generatedAt: string`).not.toMatch(/generatedAt\??:\s*string\b/);
      // The alias is in use (type-only import from @czap/core, one vocabulary).
      expect(src, `${rel} must use WallClockTimestamp`).toMatch(/WallClockTimestamp/);
    });
  }
});

describe('generated-time — the committed artifact JSON keys are UNCHANGED (no schema migration)', () => {
  // 1a explicitly preserves the runtime/JSON key; only the TS type gains the alias.
  for (const rel of ['reports/gauntlet-context.json', 'reports/codebase-audit.json']) {
    it(`${rel} still carries the "generatedAt" key`, () => {
      if (!existsSync(resolve(REPO, rel))) return; // committed artifact may be regenerated, not always present
      expect(read(rel)).toMatch(/"generatedAt"/);
    });
  }
});

describe('generated-time — gauntletRunId is the coherence signal; wall-clock ordering is gone (CUT generated-time-ordering)', () => {
  it('artifact-verifiers proves same-run coherence via gauntletRunId, not a wall-clock ordering gate', () => {
    const src = read('scripts/artifact-verifiers.ts');
    expect(src).toMatch(/runtime-seams-run-coherence/); // the gauntletRunId equality check stays
    expect(src).toMatch(/gauntletRunId/);
    // The removed wall-clock gate must not return: no 'runtime-seams-ordering' check.
    expect(src).not.toMatch(/'runtime-seams-ordering'/);
  });

  it('report-satellite-scan proves coherence via gauntletRunId, with no wall-clock ordering gate', () => {
    const src = read('scripts/report-satellite-scan.ts');
    expect(src).toMatch(/satellite-scan-run-coherence/); // gauntletRunId equality stays
    expect(src).not.toMatch(/'satellite-scan-ordering'/); // the wall-clock gate is gone
  });
});
