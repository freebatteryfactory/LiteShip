/**
 * Release-roster projection — release.yml sources its publish roster from the
 * generated JSON, never from hand-written package literals.
 *
 * The publish roster (count + package list, in publish order) is owned by
 * `scripts/gen-roster.ts` and stamped into `scripts/ci/publish-roster.json` by its
 * `--write` mode. `.github/workflows/release.yml`'s publish job reads that JSON with
 * jq instead of carrying a `for pkg in @liteship/... ; do` list that drifts on every
 * package add/remove (the exact scar that stranded `@liteship/stage` out of the loop).
 *
 * This meta guard pins the SHAPE of that single-sourcing at the YAML level: the
 * publish job's run blocks carry no `@liteship/*` literals, they reference the generated
 * JSON, and they run the gen-roster `--check` gate before publishing. It also proves
 * the generated JSON is internally consistent and that its package set equals the
 * repo-truths publishable set on disk — so a regeneration that drops or invents a
 * package fails here at the source of truth.
 *
 * @module
 */
// PROVES: INV-ROSTER-SINGLE-SOURCE
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { packageManifests } from '../../support/repo-truths.js';

const REPO = resolve(import.meta.dirname, '..', '..', '..');
const RELEASE_YML = resolve(REPO, '.github/workflows/release.yml');
const PUBLISH_ROSTER_JSON = resolve(REPO, 'scripts/ci/publish-roster.json');

function releaseWorkflowText(): string {
  return readFileSync(RELEASE_YML, 'utf8');
}

/** The text of the `publish:` job — the file's last job, so from its header to EOF. */
function publishJobText(): string {
  const yaml = releaseWorkflowText();
  const index = yaml.indexOf('\n  publish:');
  if (index === -1) throw new Error('release.yml: `publish:` job not found');
  return yaml.slice(index);
}

/**
 * The concatenated `run:` script bodies of the publish job (block scalars and
 * single-line runs), stripped of comment lines. Scoping to run bodies means an
 * `@liteship/*` mention in a step's `name:` or a `#` comment cannot false-trip the
 * literal check — only executable shell counts.
 */
function publishJobRunBlocks(): string {
  const lines = publishJobText().split('\n');
  const out: string[] = [];
  let inBlock = false;
  let blockIndent = 0;
  for (const line of lines) {
    if (inBlock) {
      if (line.trim() === '') {
        out.push(line);
        continue;
      }
      const indent = line.length - line.trimStart().length;
      if (indent > blockIndent) {
        if (!line.trimStart().startsWith('#')) out.push(line);
        continue;
      }
      inBlock = false;
    }
    const match = /^(\s*)(-\s+)?run:\s*(.*)$/.exec(line);
    if (match) {
      const rest = match[3]!;
      if (rest === '' || /^[|>][+-]?$/.test(rest)) {
        inBlock = true;
        blockIndent = match[1]!.length; // content must be indented deeper than the `run:` key
      } else if (!rest.startsWith('#')) {
        out.push(rest); // inline `run: <cmd>`
      }
    }
  }
  return out.join('\n');
}

/** The generated publish roster. */
interface PublishRoster {
  readonly $generated: string;
  readonly expectedPublishable: number;
  readonly packages: readonly string[];
}

function publishRoster(): PublishRoster {
  return JSON.parse(readFileSync(PUBLISH_ROSTER_JSON, 'utf8')) as PublishRoster;
}

/** The repo-truths publishable set (release.yml's own predicate: not private), sorted. */
function publishableNames(): string[] {
  return packageManifests()
    .filter((manifest) => manifest.private !== true && manifest.name != null)
    .map((manifest) => manifest.name as string)
    .sort();
}

describe('release.yml publish job is a projection of scripts/ci/publish-roster.json', () => {
  it('cannot publish until the exact tag clears the reusable complete CI authority', () => {
    const yaml = releaseWorkflowText();
    expect(yaml).toContain('full-authority:');
    expect(yaml).toContain('uses: ./.github/workflows/ci.yml');
    expect(yaml).toMatch(/release-certified:[\s\S]*needs: full-authority/u);
    expect(yaml).toMatch(/publish:[\s\S]*needs: release-certified/u);
  });

  it('carries no @liteship/* package literals in its run blocks', () => {
    const literals = [...publishJobRunBlocks().matchAll(/@liteship\/[a-z_-]+/g)].map((match) => match[0]);
    expect(
      literals,
      `release.yml publish job hard-codes @liteship/* package names — the roster must come from scripts/ci/publish-roster.json: ${literals.join(', ')}`,
    ).toEqual([]);
  });

  it('reads the roster from scripts/ci/publish-roster.json', () => {
    expect(publishJobText()).toContain('scripts/ci/publish-roster.json');
  });

  it('runs the gen-roster --check gate before publishing', () => {
    expect(publishJobText()).toContain('scripts/gen-roster.ts --check');
  });
});

describe('scripts/ci/publish-roster.json is a consistent, disk-true roster', () => {
  it('parses and is internally consistent (expectedPublishable === packages.length)', () => {
    const roster = publishRoster();
    expect(Array.isArray(roster.packages)).toBe(true);
    expect(roster.expectedPublishable).toBe(roster.packages.length);
  });

  it('lists exactly the repo-truths publishable set on disk', () => {
    expect([...publishRoster().packages].sort()).toEqual(publishableNames());
  });

  it('declares its generator (a hand-edit is a regeneration reminder, not silent drift)', () => {
    expect(publishRoster().$generated).toContain('scripts/gen-roster.ts');
  });
});
