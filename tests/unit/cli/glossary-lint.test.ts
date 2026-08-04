// @vitest-environment node
/**
 * Public operational vocabulary guard.
 *
 * GLOSSARY.md's first sentence declares its own denominator — "Vocabulary for
 * prose across this repository" — so this guard scans the tracked tree, not a
 * hand-picked directory pair. It rejects the retired maritime register without
 * confusing ordinary technical English such as "load-bearing" or
 * String.prototype.trim().
 *
 * HOW FAIL-CLOSED THIS IS, STATED HONESTLY. This is a RETIRED-REGISTER scan
 * over its true population, not a positive allowlist over natural-language
 * prose: requiring every word of every doc to appear in GLOSSARY.md is not
 * tractable and would be a guard nobody could keep green. What IS closed:
 *   - the population (every tracked text file, from `git ls-files`, minus a
 *     frozen allowlist that carries a written reason per entry);
 *   - each retired term's SHAPE, so no inflection or respacing evades it. The
 *     `bearing` clause used to enumerate six literal phrasings and
 *     `ASTRO-STATIC-MENTAL-MODEL.md` slipped `named bearings` by writing
 *     `named bearing`. It is now structural: the retired sense is the
 *     FREE-STANDING noun, matched in any inflection and any surrounding words.
 * What is NOT closed, deliberately: the hyphenated compound adjective
 * `<noun>-bearing` ("carrying a <noun>") is a productive English construction
 * with 33 distinct live qualifiers in this tree and 108 uses of `load-bearing`
 * alone, so it is structurally exempt — with the single exception of
 * `boundary-bearing`, retained by name so this rewrite is a strict superset of
 * the coverage it replaces. A new maritime metaphor that is not one of the
 * terms below is also not caught; this guard retires a named register, it does
 * not police vocabulary in general.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { GLOSSARY_ENTRIES } from '../../../packages/cli/src/commands/glossary.js';
import { spawnArgvCapture } from '../../../scripts/lib/spawn.js';
import { repositoryProofTimeout } from '../../../vitest.shared.js';

const REPO_ROOT = resolve(__dirname, '../../..');
const GLOSSARY_MD = resolve(REPO_ROOT, 'GLOSSARY.md');

/** Patterns are limited to the retired metaphor, not ordinary technical prose. */
const RETIRED_OPERATIONAL_TERMS: ReadonlyArray<{ term: string; pattern: RegExp }> = [
  { term: 'hull', pattern: /\b[Hh]ull\b/ },
  { term: 'keel', pattern: /\b[Kk]eel\b/ },
  { term: 'cast off', pattern: /\b[Cc]ast off\b/ },
  { term: 'moored', pattern: /\b[Mm]oored\b/ },
  { term: 'shake-down', pattern: /\b[Ss]hake[- ]?down\b|\bshakedown\b/ },
  { term: 'dry-dock', pattern: /\b[Dd]ry[- ]?dock\b/ },
  { term: 'deck plan', pattern: /\b[Dd]eck plan\b/ },
  { term: 'chart', pattern: /\b(?:the|verb|usage) chart\b|\bchart order\b/ },
  // `rigs` was missing from the inflection set, so three shipped `@module`
  // headers ("rigs the client:adaptive directive") passed by one character.
  { term: 'rig', pattern: /\b(?:re-)?[Rr]ig(?:s|ged|ging)?\b|\brig-check\b/ },
  { term: 'stow', pattern: /\b[Ss]tow\b/ },
  {
    // Free-standing noun in any inflection ("a bearing", "named bearing",
    // "visual bearings", "CLI bearings"), never the `X-bearing` compound
    // adjective — plus the one compound the retired register itself minted.
    term: 'bearing',
    pattern: /(?<![\w-])[Bb]earings?\b|\bboundary-bearings?\b/,
  },
  { term: 'trim', pattern: /\bre-trim\b|\bworking deck trim\b/ },
  { term: 'working deck', pattern: /\ba working deck\b|\bworking deck\s*[/]/ },
  { term: 'quay', pattern: /\b[Qq]uay\b/ },
];

const RETIRED_GLOSSARY_ENTRIES = [
  'rig',
  'bearing',
  'trim',
  'dry-dock',
  'deck plan',
  'chart',
  'rig (verb)',
  'stow',
] as const;

/**
 * Files skipped whole. A real fix is always preferred to an allowlist entry, so
 * every entry here is structural rather than convenient, and carries its reason:
 *   - `CHANGELOG.md`                                  — released history is not rewritten.
 *   - `GLOSSARY.md`                                   — the register authority. Its drift-check
 *                                                       instruction names the retired verb on
 *                                                       purpose ("mixed boundary verbs (wire vs
 *                                                       rig)"), so it cannot be scanned for the
 *                                                       register it defines.
 *   - this test file                                  — structural: it embeds every pattern and
 *                                                       every retired glossary term verbatim.
 *   - the three MCP digest-pin ledgers + the CLI help
 *     provenance comment                              — structural: each is an append-only record
 *                                                       of WHICH retired term caused a pinned
 *                                                       projection digest to shift. Rewording them
 *                                                       to avoid the words would delete the
 *                                                       evidence the pin exists to carry. This is
 *                                                       the glossary's own "historical evidence"
 *                                                       register: the old term is quoted and
 *                                                       identified as historical.
 */
const ALLOWLIST = new Set([
  'CHANGELOG.md',
  'GLOSSARY.md',
  'tests/unit/cli/glossary-lint.test.ts',
  'tests/unit/cli/commands/help.test.ts',
  'tests/unit/mcp-server/d3-resources-prompts.test.ts',
  'tests/unit/mcp-server/d4-ui-resources.test.ts',
  'tests/unit/mcp-server/d5-app-resources.test.ts',
]);

/**
 * Directory prefixes out of scope. These are gitignored build/output dirs, so
 * `git ls-files` already omits them; the set is a defensive filter in case one
 * ever becomes tracked.
 */
const EXCLUDED_DIRS = ['node_modules/', 'dist/', '.git/', 'coverage/', 'reports/', 'test-results/'];

/** Binary extensions we do not read as text. */
const BINARY_EXT = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.ico',
  '.icns',
  '.wasm',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.mp4',
  '.webm',
  '.mov',
  '.mp3',
  '.wav',
  '.ogg',
  '.pdf',
  '.zip',
  '.gz',
  '.br',
  '.node',
]);

function isBinary(name: string): boolean {
  const dot = name.lastIndexOf('.');
  return dot !== -1 && BINARY_EXT.has(name.slice(dot).toLowerCase());
}

/**
 * Enumerate the repo's TRACKED text files. `git ls-files` — not an fs walk — is
 * what makes the denominator the committed repository rather than whatever
 * happens to sit on this disk.
 */
async function trackedTextFiles(): Promise<readonly string[]> {
  const res = await spawnArgvCapture('git', ['ls-files', '-z'], {
    cwd: REPO_ROOT,
    captureBytes: 32 * 1024 * 1024,
  });
  if (res.exitCode !== 0) throw new Error(`git ls-files failed (${res.exitCode}): ${res.stderr}`);
  return res.stdout
    .split('\0')
    .filter(Boolean)
    .filter((rel) => !EXCLUDED_DIRS.some((dir) => rel.startsWith(dir)))
    .filter((rel) => !isBinary(rel));
}

/** Every retired-register hit in one file, as `path:line: term: text`. */
export function retiredRegisterHits(rel: string, content: string): readonly string[] {
  const hits: string[] = [];
  content.split('\n').forEach((line, index) => {
    for (const { term, pattern } of RETIRED_OPERATIONAL_TERMS) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) hits.push(`${rel}:${index + 1}: ${term}: ${line.trim().slice(0, 140)}`);
    }
  });
  return hits;
}

describe('public operational vocabulary', () => {
  let files: readonly string[] = [];
  beforeAll(async () => {
    files = await trackedTextFiles();
  });

  const glossaryMd = readFileSync(GLOSSARY_MD, 'utf8');

  it('scanned a meaningful slice of the repo (walk sanity)', () => {
    expect(files.length).toBeGreaterThan(500);
  });

  it(
    'keeps the retired maritime register out of every tracked file',
    () => {
      const violations: string[] = [];
      for (const rel of files) {
        if (ALLOWLIST.has(rel)) continue;
        let content: string;
        try {
          content = readFileSync(join(REPO_ROOT, rel), 'utf8');
        } catch {
          continue; // unreadable (e.g. a socket) — nothing to scan
        }
        violations.push(...retiredRegisterHits(rel, content));
      }

      expect(
        violations,
        `retired operational register found outside the allowlist (${violations.length}):\n${violations.join('\n')}`,
      ).toEqual([]);
    },
    repositoryProofTimeout(),
  );

  it('removes retired terms from both glossary projections', () => {
    const terms = new Set(GLOSSARY_ENTRIES.map((entry) => entry.term));
    for (const retired of RETIRED_GLOSSARY_ENTRIES) {
      expect(terms.has(retired), `${retired} remains in liteship glossary`).toBe(false);
      expect(glossaryMd, `${retired} remains a documented glossary term`).not.toContain(`**${retired}**`);
    }
  });

  it('keeps the retired-term policy explicit', () => {
    expect(RETIRED_OPERATIONAL_TERMS.length).toBeGreaterThan(5);
  });

  it('the bearing clause survives inflection and respacing, and spares the compound adjective', () => {
    const bearing = RETIRED_OPERATIONAL_TERMS.find(({ term }) => term === 'bearing')!.pattern;

    // The exact evasion that was live in the tree, plus its neighbours.
    for (const evasion of [
      'each named bearing casts',
      'each named bearings cast',
      'discrete visual bearings',
      'the server-resolved bearing',
      'Bearing for the check',
      'per-check bearings',
      'a boundary-bearing adaptive',
    ]) {
      bearing.lastIndex = 0;
      expect(bearing.test(evasion), `must red: ${evasion}`).toBe(true);
    }

    // Ordinary English: the compound adjective, in any qualifier.
    for (const ordinary of [
      'the load-bearing property',
      'only verdict-bearing commands',
      'identity-bearing fields',
      'slot-bearing elements',
      'a freshly-invented-qualifier-bearing value',
    ]) {
      bearing.lastIndex = 0;
      expect(bearing.test(ordinary), `must pass: ${ordinary}`).toBe(false);
    }
  });

  it('the rig clause covers every inflection the retired verb takes', () => {
    const rig = RETIRED_OPERATIONAL_TERMS.find(({ term }) => term === 'rig')!.pattern;
    for (const evasion of [
      'a rig primitive',
      'rigs the directive',
      'rigged evaluation',
      'rigging support',
      're-rig it',
    ]) {
      rig.lastIndex = 0;
      expect(rig.test(evasion), `must red: ${evasion}`).toBe(true);
    }
    for (const ordinary of ['the rigorous check', 'right-hand side', 'a trigger fired']) {
      rig.lastIndex = 0;
      expect(rig.test(ordinary), `must pass: ${ordinary}`).toBe(false);
    }
  });

  it('MUTATION: the scanner reports the exact file, line and term it rejects', () => {
    expect(retiredRegisterHits('DOC.md', 'clean line\nStyles define what each named bearing casts.\n')).toEqual([
      'DOC.md:2: bearing: Styles define what each named bearing casts.',
    ]);
    expect(retiredRegisterHits('DOC.md', 'the load-bearing property is fine\n')).toEqual([]);
  });
});
