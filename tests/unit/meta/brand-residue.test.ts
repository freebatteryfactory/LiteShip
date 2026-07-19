// @vitest-environment node
/**
 * Brand-residue gate (permanent) — the enforcement arm of ADR-0044.
 *
 * The `@czap` brand (scope, `data-czap-*` wire prefix, `CZAP_*` identifiers, the
 * `czap` CLI/config, the CZAP engine name) was retired wholesale when the project
 * consolidated onto the single LiteShip brand. This gate recursively scans the
 * repository for any `/czap/i` residue and reds if the old brand reappears — a new
 * file, a copy-pasted snippet, a regenerated doc that reintroduces the scope.
 *
 * Allowlist (frozen historical records only; a real fix is always preferred to an
 * allowlist entry, and every entry carries its reason):
 *   - `docs/adr/**`                          — immutable ADRs; the audit trail keeps `@czap`.
 *   - `docs/plan/**`                          — historical planning records, likewise.
 *   - `CHANGELOG.md`                          — released history is not rewritten.
 *   - `traceability/effect-shed-receipt.json` — a frozen, content-addressed receipt.
 *   - `ARCHITECTURE.md`                       — allowed ONE sanctioned sentence only (below);
 *                                               any other `czap` there is a violation, and
 *                                               a duplicate of the sentence anywhere reds.
 *   - this test file                          — structural: it embeds the search token and the
 *                                               sanctioned sentence, so it cannot scan itself.
 *
 * `pnpm-lock.yaml` is intentionally NOT allowlisted — it was verified to carry zero
 * `czap` residue after the `@liteship/*` regeneration, and staying scanned keeps it honest.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnArgvCapture } from '../../../scripts/lib/spawn.js';

const REPO = process.cwd();

/** The retired brand, case-insensitive. */
const RESIDUE = /czap/i;

/**
 * The single sanctioned present-tense sentence recording the retirement, verbatim
 * from ARCHITECTURE.md. It must appear EXACTLY once across the whole repo; any
 * duplicate — here, or copied into another doc — reds the gate.
 */
const SANCTIONED_SENTENCE =
  "LiteShip's packages were originally published under the `@czap` scope (CZAP: content-zoned adaptive projection, the engine's original name); the scope, the `data-czap-*` wire prefix, and `CZAP_*` identifiers were retired wholesale in v0.19.";

/**
 * Directory prefixes out of scope (per ADR-0044's residue-gate scope). These are
 * all gitignored build/output dirs, so `git ls-files` already omits them; the set
 * is kept as a defensive filter in case one ever becomes tracked.
 */
const EXCLUDED_DIRS = ['node_modules/', 'dist/', '.git/', 'coverage/', 'reports/', 'test-results/'];

/** Files skipped whole — frozen historical records. Relative paths from REPO. */
const ALLOWLIST = new Set([
  'CHANGELOG.md',
  'traceability/effect-shed-receipt.json',
  'tests/unit/meta/brand-residue.test.ts',
]);

/** Allowlisted path prefixes (whole subtrees of immutable history). */
const ALLOWLIST_PREFIXES = ['docs/adr/', 'docs/plan/'];

/** Binary extensions we do not read as text. */
const BINARY_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.icns', '.wasm',
  '.woff', '.woff2', '.ttf', '.otf', '.eot', '.mp4', '.webm', '.mov', '.mp3',
  '.wav', '.ogg', '.pdf', '.zip', '.gz', '.br', '.node',
]);

function isAllowlisted(rel: string): boolean {
  if (ALLOWLIST.has(rel)) return true;
  return ALLOWLIST_PREFIXES.some((p) => rel.startsWith(p));
}

function isBinary(name: string): boolean {
  const dot = name.lastIndexOf('.');
  return dot !== -1 && BINARY_EXT.has(name.slice(dot).toLowerCase());
}

/**
 * Enumerate the repo's TRACKED text files (repo-relative paths). Using
 * `git ls-files` — not a raw fs walk — makes the scan deterministic across
 * environments: it omits every gitignored build output (node_modules/, dist/,
 * coverage/, reports/, test-results/, .git/) AND transient local junk (a dev
 * server's `.astro/dev.log`, a `.wrangler/` log) that a bare walk would trip on.
 * The committed repo is the thing that must carry one brand.
 */
async function trackedTextFiles(): Promise<string[]> {
  const res = await spawnArgvCapture('git', ['ls-files', '-z'], { cwd: REPO, captureBytes: 32 * 1024 * 1024 });
  if (res.exitCode !== 0) throw new Error(`git ls-files failed (${res.exitCode}): ${res.stderr}`);
  return res.stdout
    .split('\0')
    .filter(Boolean)
    .filter((rel) => !EXCLUDED_DIRS.some((d) => rel.startsWith(d)))
    .filter((rel) => !isBinary(rel));
}

function occurrences(haystack: string, needle: string): number {
  let n = 0;
  let i = 0;
  for (;;) {
    const at = haystack.indexOf(needle, i);
    if (at === -1) return n;
    n++;
    i = at + needle.length;
  }
}

describe('brand residue — the LiteShip brand is the only brand (ADR-0044)', () => {
  let files: string[] = [];
  beforeAll(async () => {
    files = await trackedTextFiles();
  });

  it('scanned a meaningful slice of the repo (walk sanity)', () => {
    expect(files.length).toBeGreaterThan(500);
  });

  it('no `czap` residue outside the sanctioned ARCHITECTURE sentence and the frozen allowlist', () => {
    const violations: string[] = [];
    let sanctionedCount = 0;
    const sanctionedFiles: string[] = [];

    for (const rel of files) {
      if (isAllowlisted(rel)) continue;

      let content: string;
      try {
        content = readFileSync(join(REPO, rel), 'utf8');
      } catch {
        continue; // unreadable (e.g. a socket) — nothing to scan
      }

      const hits = occurrences(content, SANCTIONED_SENTENCE);
      if (hits > 0) {
        sanctionedCount += hits;
        sanctionedFiles.push(rel);
      }

      // Strip the sanctioned sentence; anything left that still matches is residue.
      const stripped = content.split(SANCTIONED_SENTENCE).join('\u0000');
      if (RESIDUE.test(stripped)) {
        stripped.split('\n').forEach((line, i) => {
          if (RESIDUE.test(line)) violations.push(`${rel}:${i + 1}: ${line.trim().slice(0, 160)}`);
        });
      }
    }

    expect(
      violations,
      `czap residue found outside the allowlist (${violations.length}):\n${violations.join('\n')}`,
    ).toEqual([]);

    // The sanctioned sentence must exist exactly once, and only in ARCHITECTURE.md.
    expect(
      sanctionedCount,
      `the sanctioned ARCHITECTURE sentence must appear exactly once; found ${sanctionedCount} in ${sanctionedFiles.join(', ')}`,
    ).toBe(1);
    expect(sanctionedFiles).toEqual(['ARCHITECTURE.md']);
  });
});
