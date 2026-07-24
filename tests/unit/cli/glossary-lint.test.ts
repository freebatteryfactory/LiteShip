/**
 * Public operational vocabulary guard.
 *
 * LiteShip uses standard technical language in CLI output and setup guidance.
 * This test rejects the retired maritime register without confusing ordinary
 * technical English such as "load-bearing" or String.prototype.trim().
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { GLOSSARY_ENTRIES } from '../../../packages/cli/src/commands/glossary.js';

const REPO_ROOT = resolve(__dirname, '../../..');
const CLI_SRC = resolve(REPO_ROOT, 'packages/cli/src');
const SCRIPTS_DIR = resolve(REPO_ROOT, 'scripts');
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
  { term: 'rig', pattern: /\b(?:re-)?[Rr]ig(?:ged|ging)?\b|\brig-check\b/ },
  { term: 'stow', pattern: /\b[Ss]tow\b/ },
  {
    term: 'bearing',
    pattern: /\bnamed bearings\b|\bbearing changes\b|\bboundary-bearing\b|\bper-check bearings\b|\bCLI bearings\b|\bBearing for\b/,
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

function walk(dir: string, ext: readonly string[] = ['.ts', '.mjs', '.sh']): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full, ext));
    else if (ext.some((suffix) => entry.endsWith(suffix))) out.push(full);
  }
  return out;
}

function collectCliSurfaceContent(): string {
  return [...walk(CLI_SRC), ...walk(SCRIPTS_DIR)]
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
}

describe('public operational vocabulary', () => {
  const cliContent = collectCliSurfaceContent();
  const glossaryMd = readFileSync(GLOSSARY_MD, 'utf8');

  it('keeps the retired maritime register out of CLI and setup output', () => {
    const hits = RETIRED_OPERATIONAL_TERMS
      .filter(({ pattern }) => pattern.test(cliContent))
      .map(({ term }) => term);
    expect(hits, `retired public operational terms: ${hits.join(', ')}`).toEqual([]);
  });

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
});
