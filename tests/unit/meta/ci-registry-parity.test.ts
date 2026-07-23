/**
 * CI ↔ check-registry parity — the proof that `.github/workflows/ci.yml` is a
 * faithful PROJECTION of the check registry, not a hand-drifting parallel copy.
 *
 * The parallel merge gate is the release gauntlet fanned out; `scripts/ci-plan.ts`
 * ({@link buildCiPlan}) partitions the registry into the named CI lanes, and the
 * `plan` job publishes that partition as its `matrix` output. This test binds the
 * three surfaces together:
 *
 *   (a) every gauntlet-lane command in ci.yml (`pnpm run gauntlet:full -- --profile
 *       ci-parallel-<name> --skip-build`) maps to a registry-projected profile
 *       invocation — the profile exists in `gauntletPhaseProfiles`, and the
 *       registry-backed checks that profile runs are exactly the lane's `checkIds`.
 *   (b) every specialized hand-written job (shard / browser / smoke) runs only
 *       root scripts that are a registered {@link CHECK_REGISTRY} check or a named
 *       {@link SCRIPT_EXEMPTIONS} entry (the total, disjoint partition holds in CI).
 *   (c) the projected lane commands equal the recorded pre-projection fixture AND
 *       appear verbatim as `run:` lines in ci.yml — proving byte-identity (no lane
 *       command was rewritten, parametrized, or interpolated by the projection).
 *
 * js-yaml is NOT resolvable in the vitest runtime (it is only a transitive store
 * entry, never hoisted to root), so — like the sibling devops ci.yml tests
 * (`gauntlet-ci-invocation`, `parallel-ci-artifacts`) — this parses the workflow
 * with a small indentation-aware reader rather than a YAML dependency.
 *
 * @module
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHECK_REGISTRY, SCRIPT_EXEMPTIONS } from '@liteship/command';
import { gauntletPhases, gauntletPhaseProfiles } from '../../../packages/cli/src/gauntlet-phases.js';
import { assertBlockingReleasePartition, buildCiPlan, CI_SPECIALIZED_CHECK_SPECS } from '../../../scripts/ci-plan.js';

const ROOT = resolve(import.meta.dirname, '../../..');
const CI_YML = readFileSync(resolve(ROOT, '.github/workflows/ci.yml'), 'utf8');
const FIXTURE = JSON.parse(readFileSync(resolve(ROOT, 'tests/fixtures/ci-parallel-lane-commands.json'), 'utf8')) as {
  lanes: Record<string, string[]>;
};

// ── ci.yml structural reader (dependency-free) ──────────────────────────────

/** Split the workflow into `jobName -> block text` for every top-level job under `jobs:`. */
function parseJobBlocks(yml: string): Map<string, string> {
  const lines = yml.split('\n').map((line) => line.replace(/\r$/, ''));
  const jobsIndex = lines.indexOf('jobs:');
  expect(jobsIndex, 'ci.yml must have a top-level `jobs:` key').toBeGreaterThanOrEqual(0);
  const headers: Array<{ name: string; line: number }> = [];
  for (let i = jobsIndex + 1; i < lines.length; i++) {
    // A job header is a 2-space-indented `name:` with nothing after the colon.
    const match = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(lines[i]!);
    if (match) headers.push({ name: match[1]!, line: i });
  }
  const blocks = new Map<string, string>();
  for (let h = 0; h < headers.length; h++) {
    const start = headers[h]!.line;
    const end = h + 1 < headers.length ? headers[h + 1]!.line : lines.length;
    blocks.set(headers[h]!.name, lines.slice(start, end).join('\n'));
  }
  return blocks;
}

/** Every single-line `run:` / `- run:` command value in a block (multi-line `|` / `>-` blocks skipped). */
function runCommandsIn(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split('\n')) {
    const match = /^\s*(?:- )?run:\s+(.*)$/.exec(line);
    if (!match) continue;
    const value = match[1]!.trim();
    if (value === '' || value.startsWith('|') || value.startsWith('>')) continue;
    out.push(value);
  }
  return out;
}

/** The root `package.json` script a command invokes (`pnpm run <name>` / `pnpm test`), or null if none. */
function rootScriptOf(command: string): string | null {
  const runMatch = /(?:^|\s)pnpm run ([A-Za-z0-9:_-]+)/.exec(command);
  if (runMatch) return runMatch[1]!;
  if (/(?:^|\s)pnpm test(?:\s|$)/.test(command)) return 'test';
  return null;
}

const JOB_BLOCKS = parseJobBlocks(CI_YML);
const ALL_RUN_COMMANDS = new Set(runCommandsIn(CI_YML));
const PLAN = buildCiPlan();

// ── registry / gauntlet-phase projection tables ─────────────────────────────

/** Registry command -> check id (each phase command resolves back to its check). */
const COMMAND_TO_ID = new Map(CHECK_REGISTRY.map((check) => [check.command, check.id] as const));
/** Gauntlet phase label -> registry check id (null for executor-only phases like `invariants`). */
const LABEL_TO_ID = new Map(gauntletPhases.map((phase) => [phase.label, COMMAND_TO_ID.get(phase.command) ?? null]));
/** Root-script name -> registry check id (from each check's declared command). */
const SCRIPT_TO_ID = new Map<string, string>();
for (const check of CHECK_REGISTRY) {
  const script = rootScriptOf(check.command);
  if (script !== null) SCRIPT_TO_ID.set(script, check.id);
}
const EXEMPT_SCRIPTS = new Set(SCRIPT_EXEMPTIONS.map((exemption) => exemption.script));

/** ci-parallel profile name -> the projected lane in the CI plan. */
const LANE_BY_PROFILE = new Map(
  Object.values(PLAN.lanes)
    .filter((lane) => lane.profile !== undefined)
    .map((lane) => [lane.profile!, lane] as const),
);

/** The `pnpm run gauntlet:full -- --profile ci-parallel-<name> --skip-build` command matcher. */
const LANE_COMMAND_RE = /pnpm run gauntlet:full -- --profile (ci-parallel-[A-Za-z0-9-]+) --skip-build/g;

/** The hand-written specialized jobs the parity contract covers (shard / browser / smoke). */
const SPECIALIZED_JOBS = [
  'truth-linux-parallel-test',
  'browser-e2e',
  'macos-browser',
  'windows-smoke',
  'macos-smoke',
] as const;

// ── Release-partition authority ─────────────────────────────────────────────

describe('blocking release checks have one real CI owner', () => {
  const blockingReleaseIds = CHECK_REGISTRY.filter(
    (check) =>
      check.authority === 'blocking' && check.profiles.includes('release') && check.platforms.includes('linux'),
  ).map((check) => check.id);
  const assignments = [
    ...Object.entries(PLAN.lanes).flatMap(([key, lane]) =>
      lane.checkIds.map((checkId) => ({ checkId, owner: `lane:${key}` })),
    ),
    ...Object.entries(PLAN.specializedChecks).map(([key, check]) => ({
      checkId: check.checkId,
      owner: `specialized:${key}`,
    })),
  ];

  it('the live plan covers the complete release projection with no unfanned check', () => {
    expect(() => assertBlockingReleasePartition(blockingReleaseIds, assignments)).not.toThrow();
    expect(PLAN.unfannedReleaseChecks).toEqual([]);
  });

  it('fails closed when one live blocking release check loses its owner', () => {
    const withoutHermetic = Object.fromEntries(
      Object.entries(CI_SPECIALIZED_CHECK_SPECS).filter(([key]) => key !== 'hermetic'),
    );
    expect(() => buildCiPlan({ specializedCheckSpecs: withoutHermetic })).toThrow(
      /unassigned blocking release checks: check\/hermetic/,
    );
  });

  it('fails closed when one live check is claimed twice', () => {
    const withDuplicate = {
      ...CI_SPECIALIZED_CHECK_SPECS,
      duplicateRedFixture: { checkId: 'check/format', job: 'format' },
    };
    expect(() => buildCiPlan({ specializedCheckSpecs: withDuplicate })).toThrow(
      /check id "check\/format" is claimed more than once/,
    );
  });

  it.each(Object.entries(PLAN.specializedChecks))(
    'specialized check %s derives its command from the registry and executes in its named job',
    (key, specialized) => {
      const registryCheck = CHECK_REGISTRY.find((check) => check.id === specialized.checkId);
      expect(registryCheck).toBeDefined();
      expect(registryCheck!.authority).toBe('blocking');
      expect(registryCheck!.profiles).toContain('release');
      expect(specialized.command).toBe(registryCheck!.command);

      const jobBlock = JOB_BLOCKS.get(specialized.job);
      expect(jobBlock, `ci.yml has no specialized owner job "${specialized.job}"`).toBeDefined();
      const projectedInvocation = '${{ fromJSON(needs.plan.outputs.matrix).specializedChecks.' + key + '.command }}';
      expect(runCommandsIn(jobBlock!)).toContain(projectedInvocation);
      expect(jobBlock).not.toContain(specialized.command);
    },
  );

  it('the merge-gate final waits for the fail-closed packed-consumer owner', () => {
    expect(JOB_BLOCKS.get('truth-linux-parallel-final')).toContain('- truth-linux-parallel-consumer');
  });

  it('provisions every doctor tool in its owning setup job before running doctor', () => {
    const setup = JOB_BLOCKS.get('truth-linux-parallel-setup')!;
    const doctor = setup.indexOf('specializedChecks.doctor.command');
    expect(setup.indexOf('toolchain: 1.85.1')).toBeGreaterThanOrEqual(0);
    expect(setup.indexOf('playwright install --with-deps chromium chromium-headless-shell')).toBeGreaterThanOrEqual(0);
    expect(setup.indexOf('apt-get install -y ffmpeg')).toBeGreaterThanOrEqual(0);
    expect(doctor).toBeGreaterThan(setup.indexOf('toolchain: 1.85.1'));
    expect(doctor).toBeGreaterThan(setup.indexOf('playwright install --with-deps chromium chromium-headless-shell'));
    expect(doctor).toBeGreaterThan(setup.indexOf('apt-get install -y ffmpeg'));
    expect(doctor).toBeGreaterThan(setup.indexOf('pnpm run build && pnpm run capsule:compile'));
  });
});

// ── (a) gauntlet-lane commands map to a registry-projected profile ──────────

describe('(a) every gauntlet-lane command is a registry-projected profile invocation', () => {
  const laneCommands = [...CI_YML.matchAll(LANE_COMMAND_RE)].map((match) => ({
    command: match[0],
    profile: match[1]!,
  }));

  it('ci.yml contains the expected gauntlet lane profiles', () => {
    const profilesInYml = new Set(laneCommands.map((lane) => lane.profile));
    const profilesInPlan = new Set(LANE_BY_PROFILE.keys());
    expect(profilesInYml).toEqual(profilesInPlan);
  });

  it.each([...new Set([...CI_YML.matchAll(LANE_COMMAND_RE)].map((m) => m[1]!))])(
    'lane profile %s exists, projects registry checks, and matches the plan',
    (profile) => {
      // The profile is a real gauntlet phase profile.
      expect(Object.keys(gauntletPhaseProfiles)).toContain(profile);

      // The plan projects a lane for it with a byte-identical command.
      const lane = LANE_BY_PROFILE.get(profile);
      expect(lane, `ci-plan has no lane for profile ${profile}`).toBeDefined();
      const expectedCommand = `pnpm run gauntlet:full -- --profile ${profile} --skip-build`;
      expect(lane!.command).toBe(expectedCommand);

      // The registry-backed checks the profile actually runs equal the lane's checkIds.
      const projectedIds = gauntletPhaseProfiles[profile]!.map((label) => LABEL_TO_ID.get(label) ?? null).filter(
        (id): id is string => id !== null,
      );
      expect(new Set(lane!.checkIds)).toEqual(new Set(projectedIds));

      // Every projected id is a genuine registry check id.
      const registryIds = new Set(CHECK_REGISTRY.map((check) => check.id));
      for (const id of projectedIds) expect(registryIds.has(id)).toBe(true);
    },
  );
});

// ── (b) specialized jobs run only registered checks or named exemptions ─────

describe('(b) every specialized job maps to a registry id or a named exemption', () => {
  it.each(SPECIALIZED_JOBS)('%s runs only partitioned root scripts', (jobName) => {
    const block = JOB_BLOCKS.get(jobName);
    expect(block, `ci.yml has no job "${jobName}"`).toBeDefined();

    const scripts = runCommandsIn(block!)
      .map(rootScriptOf)
      .filter((script): script is string => script !== null);

    // The job must actually invoke at least one partitioned root script.
    expect(scripts.length, `${jobName} invokes no mappable root script`).toBeGreaterThan(0);

    for (const script of scripts) {
      const mapsToCheck = SCRIPT_TO_ID.has(script);
      const mapsToExemption = EXEMPT_SCRIPTS.has(script);
      expect(
        mapsToCheck || mapsToExemption,
        `${jobName}: root script "${script}" maps to neither a registry check nor a named exemption`,
      ).toBe(true);
    }
  });

  it('the sharded-test job maps to the aggregate test check via a named exemption', () => {
    // `test:shard` is the CI shard splitter (exemption); the aggregate assertion is check/test.
    expect(EXEMPT_SCRIPTS.has('test:shard')).toBe(true);
    expect(PLAN.lanes.shardedTest!.checkIds).toEqual(['check/test']);
  });
});

// ── (c) projected lane commands are byte-identical to the recorded baseline ──

describe('(c) projected lane commands equal the recorded baseline (byte-identical)', () => {
  it('the plan lane keys match the fixture lane keys', () => {
    expect(Object.keys(PLAN.lanes).sort()).toEqual(Object.keys(FIXTURE.lanes).sort());
  });

  it.each(Object.keys(FIXTURE.lanes))('lane %s projects the recorded command(s)', (laneKey) => {
    const lane = PLAN.lanes[laneKey];
    expect(lane, `ci-plan has no lane "${laneKey}"`).toBeDefined();
    // The projection reproduces the recorded pre-projection commands exactly.
    expect(lane!.commands).toEqual(FIXTURE.lanes[laneKey]);
    // …and every projected command is run verbatim in ci.yml (nothing interpolated).
    for (const command of lane!.commands) {
      expect(ALL_RUN_COMMANDS.has(command), `ci.yml does not run "${command}" verbatim`).toBe(true);
    }
  });
});
