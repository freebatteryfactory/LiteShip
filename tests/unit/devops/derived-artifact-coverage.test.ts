/**
 * Every committed derivable artifact is declared, regenerable by ONE command,
 * and enforced by the lane that is supposed to catch its drift.
 *
 * The scar: a commit exported one interface, regenerated `docs/api` (the one
 * incantation its author remembered) and left `PUBLIC-EXPORTS.md` and the
 * type-export snapshot stale. Local preflight reported 15/15 and `check:gates`
 * reported 0 findings; nine CI jobs then failed on that single drift. The
 * pre-push lane was NOT a superset of what CI enforces, and nothing said so.
 *
 * @module
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DERIVED_ARTIFACTS,
  CI_ONLY_REASON,
  artifactPathCovers,
  generatedCommittedFiles,
  preflightEnforcedArtifacts,
  preflightEnforcerPaths,
  selectDerivedArtifacts,
  undeclaredGeneratedFiles,
  type TrackedFile,
} from '../../../scripts/lib/derived-artifacts.js';
import { buildLocalVerificationPlan } from '../../../scripts/lib/local-verification-plan.js';
import { spawnArgvCapture } from '../../../scripts/lib/spawn.js';

const REPO_ROOT = resolve(import.meta.dirname, '../../..');

/**
 * Every tracked file, with its bytes — the population the allowlist answers to.
 *
 * TRACKED, not globbed: a generated tree that is gitignored (docs/api) is not a
 * committed artifact and must not be censused, and only git knows the
 * difference.
 */
async function trackedFiles(): Promise<readonly TrackedFile[]> {
  const listed = (await spawnArgvCapture('git', ['ls-files', '-z'], { cwd: REPO_ROOT })).stdout
    .split('\0')
    .filter((path) => path.length > 0);
  const files: TrackedFile[] = [];
  for (const path of listed) {
    const absolute = resolve(REPO_ROOT, path);
    let stats;
    try {
      stats = statSync(absolute);
    } catch {
      continue; // A tracked path absent from the working tree cannot be classified.
    }
    // Only the head is needed to classify, but Markdown regions can sit
    // anywhere; 256 KiB covers every tracked text file in this repository.
    if (!stats.isFile() || stats.size > 256 * 1024) continue;
    try {
      files.push({ path, text: readFileSync(absolute, 'utf8') });
    } catch {
      continue; // Binary or unreadable: not a text projection.
    }
  }
  return files;
}

describe('THE ANCHOR: the registry is complete, not merely well-formed', () => {
  let tracked: readonly TrackedFile[] = [];
  beforeAll(async () => {
    tracked = await trackedFiles();
  });

  it('the census reaches the tree and recognizes the artifacts it exists to find', () => {
    expect(tracked.length, 'git ls-files returned nothing readable').toBeGreaterThan(500);
    const generated = generatedCommittedFiles(tracked);
    // A silent census is the failure mode this whole law guards against, so
    // pin that it finds the three signals it claims to.
    expect(generated).toContain('tsconfig.test-paths.generated.json'); // by name
    expect(generated).toContain('packages/liteship/src/package-roster.generated.ts'); // by banner
    expect(generated).toContain('packages/cli/README.md'); // by region
    expect(generated.length).toBeGreaterThan(50);
  });

  it('a producer that merely DISCUSSES generation is not censused as a product', () => {
    // The whole census turns on shouting-vs-prose. These modules write or
    // describe generated output; none of them IS generated output, and a
    // case-insensitive marker would sweep every one of them in and force a
    // permanent exemption list — the denylist shape this repo keeps rejecting.
    const generated = new Set(generatedCommittedFiles(tracked));
    for (const producer of [
      'scripts/lib/doc-registry.ts',
      'scripts/lib/agent-context.ts',
      'scripts/lib/command-docs.ts',
      'packages/web/src/wire/render-contract-doc.ts',
      'scripts/lib/derived-artifacts.ts',
    ]) {
      expect(generated.has(producer), `${producer} is a producer, not a product`).toBe(false);
    }
  });

  it('THE CONTAINMENT LAW: every generated-and-committed file is declared', () => {
    const undeclared = undeclaredGeneratedFiles(tracked);
    expect(
      undeclared,
      `generated-and-committed file(s) missing from DERIVED_ARTIFACTS:\n${undeclared.join('\n')}\n` +
        'Declare each with the command that regenerates it and the check that reds when it drifts.',
    ).toEqual([]);
  });

  it('artifact paths match exact files, directory roots, and globs alike', () => {
    expect(artifactPathCovers('PUBLIC-EXPORTS.md', 'PUBLIC-EXPORTS.md')).toBe(true);
    expect(artifactPathCovers('tests/generated', 'tests/generated/core-boundary-evaluate.test.ts')).toBe(true);
    expect(artifactPathCovers('tests/generated', 'tests/generated-other/x.ts')).toBe(false);
    expect(artifactPathCovers('packages/*/src/a.ts', 'packages/cli/src/a.ts')).toBe(true);
    expect(artifactPathCovers('packages/*/src/a.ts', 'packages/cli/deep/src/a.ts')).toBe(false);
    expect(artifactPathCovers('tests/**/*.gen.ts', 'tests/a/b/c.gen.ts')).toBe(true);
  });
});

describe('committed derivable artifacts are declared and covered', () => {
  it('the registry is non-vacuous and every id is unique', () => {
    expect(DERIVED_ARTIFACTS.length).toBeGreaterThanOrEqual(6);
    const ids = DERIVED_ARTIFACTS.map((artifact) => artifact.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('registers the test-constitution ratchet with its live drift authority', () => {
    expect(DERIVED_ARTIFACTS.find((artifact) => artifact.id === 'test-constitution-ratchet')).toMatchObject({
      kind: 'ratchet',
      paths: ['scripts/test-constitution-ratchet.json'],
      enforcedBy: 'test:constitution',
      inPreflight: true,
    });
  });

  it.each(DERIVED_ARTIFACTS.map((artifact) => [artifact.id, artifact] as const))(
    '%s declares real paths, a regen command, and a drift authority',
    (_id, artifact) => {
      expect(artifact.paths.length).toBeGreaterThan(0);
      for (const path of artifact.paths) {
        expect(existsSync(resolve(REPO_ROOT, path)), `${path} does not exist`).toBe(true);
      }
      expect(artifact.regen.length, 'every artifact must be regenerable by one command').toBeGreaterThan(0);
      expect(artifact.enforcedBy.length).toBeGreaterThan(0);
      // The drift authority must be a real test file, or a root script that exists.
      if (artifact.enforcedBy.endsWith('.ts')) {
        expect(existsSync(resolve(REPO_ROOT, artifact.enforcedBy)), `${artifact.enforcedBy} missing`).toBe(true);
      } else {
        const pkg = JSON.parse(readFileSync(resolve(REPO_ROOT, 'package.json'), 'utf8')) as {
          readonly scripts: Record<string, string>;
        };
        expect(Object.keys(pkg.scripts)).toContain(artifact.enforcedBy);
      }
    },
  );

  it('an artifact excluded from the pre-push lane carries a stated reason', () => {
    for (const artifact of DERIVED_ARTIFACTS) {
      if (artifact.inPreflight) continue;
      expect(CI_ONLY_REASON[artifact.id], `${artifact.id} is CI-only with no stated reason`).toBeDefined();
    }
    // The complement: no reason may be recorded for an artifact that IS in the
    // fast lane, so the exclusion list cannot rot into a stale denylist.
    for (const id of Object.keys(CI_ONLY_REASON)) {
      const artifact = DERIVED_ARTIFACTS.find((entry) => entry.id === id);
      expect(artifact, `${id} has a CI-only reason but is not a declared artifact`).toBeDefined();
      expect(artifact!.inPreflight).toBe(false);
    }
  });

  it('THE CONTAINMENT LAW: the pre-push lane runs every fast-lane drift authority', () => {
    const plan = buildLocalVerificationPlan({ staged: false });
    const planned = plan.steps.flatMap((step) => step.argv);
    const missing = preflightEnforcerPaths().filter((path) => !planned.includes(path));
    expect(
      missing,
      `preflight does not enforce: ${missing.join(', ')} — a contributor can push drift with a green local gate`,
    ).toEqual([]);
  });

  it('the regen runner selects from this registry — default, --all, by id, and unknown', () => {
    // Exercised as BEHAVIOUR, never by grepping the runner's bytes: the test
    // constitution bans source-byte oracles, and it caught the first draft of
    // this very law doing exactly that.
    const byDefault = selectDerivedArtifacts([]);
    expect(byDefault).toEqual(preflightEnforcedArtifacts());
    expect(preflightEnforcedArtifacts().length).toBeGreaterThan(0);

    expect(selectDerivedArtifacts(['--all'])).toEqual(DERIVED_ARTIFACTS);

    const one = selectDerivedArtifacts(['standards-snapshot']);
    expect(Array.isArray(one) && one.map((artifact) => artifact.id)).toEqual(['standards-snapshot']);

    // An unknown id fails closed rather than silently regenerating nothing.
    const bad = selectDerivedArtifacts(['no-such-artifact']);
    expect(Array.isArray(bad)).toBe(false);
    expect((bad as { readonly unknown: readonly string[] }).unknown).toEqual(['no-such-artifact']);
  });
});
