/**
 * CUT B6b — the docs state truth by pointing at canonical sources, not by mirroring
 * counts/registries that silently drift.
 *
 * The "15 publishable / 14 compiled / 11 compilers" numbers were hand-copied into many
 * docs and had already drifted twice (a package count is not a sentence). The fix is to
 * DE-NUMBER recurring counts (say "every publishable scope", not "15") and DE-ENUMERATE
 * the gauntlet phase list (point at packages/cli/src/gauntlet-phases.ts, don't mirror all
 * 32). This guard keeps the stale mirrors from coming back, and pins the roster docs that
 * must name the real package set.
 *
 * Scope: LIVE docs only. CHANGELOG.md and RELEASE_NOTES_*.md are historical artifacts —
 * accurate when written — and are intentionally excluded.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO = resolve(import.meta.dirname, '..', '..', '..');
const read = (rel: string): string => readFileSync(resolve(REPO, rel), 'utf8');

/** Hand-maintained, currently-true docs (not historical release notes / changelog). */
const LIVE_DOCS = [
  'README.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'docs/GETTING-STARTED.md',
  'docs/STATUS.md',
  'docs/RELEASING.md',
  'docs/ARCHITECTURE.md',
  'packages/compiler/README.md',
  'packages/cli/README.md',
];

describe('B6b — recurring counts are de-numbered (no hand-copied package/compiler counts)', () => {
  // Each phrase is a number copied into prose that drifts when packages/compilers change.
  const BANNED = [/\b15 publishable\b/, /\b14 compiled\b/, /\b11 compilers\b/];
  for (const rel of LIVE_DOCS) {
    it(`${rel} contains no hand-copied package/compiler count`, () => {
      const src = read(rel);
      for (const pattern of BANNED) {
        expect(src, `${rel} should not hand-copy a count matching ${pattern}`).not.toMatch(pattern);
      }
    });
  }
});

describe('B6b — SECURITY.md does not pin a brittle gauntlet phase number for the red-team gate', () => {
  it('the red-team gate is named, not numbered', () => {
    const src = read('SECURITY.md');
    expect(src).not.toMatch(/phase\s*16/i); // off-by-one once already; phase numbers drift
  });
});

describe('B6b — STATUS.md points at the canonical phase source instead of mirroring it', () => {
  const src = read('docs/STATUS.md');
  it('points at packages/cli/src/gauntlet-phases.ts (the ONE phase source, CUT D8)', () => {
    expect(src).toMatch(/gauntlet-phases\.ts/);
  });
  it('does not credit `await run(...)` calls in scripts/gauntlet.ts as the phase source', () => {
    expect(src).not.toMatch(/await run\(/);
  });
});

describe('B6b — roster docs name the real package set (command + audit present)', () => {
  for (const rel of ['docs/ARCHITECTURE.md', 'README.md']) {
    it(`${rel} lists @czap/command and @czap/audit`, () => {
      const src = read(rel);
      expect(src, `${rel} must list @czap/command`).toMatch(/@czap\/command/);
      expect(src, `${rel} must list @czap/audit`).toMatch(/@czap\/audit/);
    });
  }
  it('the CLI README documents the `czap audit` verb (added in D9b)', () => {
    expect(read('packages/cli/README.md')).toMatch(/czap audit/);
  });
});

describe('B6b — the MCP resource comment is not pinned to a stale descriptor count', () => {
  it('resources.ts does not hardcode "19-descriptor" (catalog grew to 20 in D9b-2)', () => {
    expect(read('packages/mcp-server/src/resources.ts')).not.toMatch(/19-descriptor/);
  });
});
