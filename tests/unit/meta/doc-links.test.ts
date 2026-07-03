// @vitest-environment node
/**
 * Doc link integrity — a guard for the Front-Door Cut's doc moves.
 *
 * Renaming or relocating a root doc, an ADR, or an example silently breaks every
 * relative link that pointed at it — and the published npm READMEs hard-code
 * `github.com/.../blob/main/<file>` links that a rename breaks with no local signal.
 * This gate resolves every RELATIVE markdown link (and every `blob/main` link) in the
 * hand-authored prose to a real file, so a move that orphans a link reds here instead
 * of on the deployed site.
 *
 * Scope: hand-authored prose only — root `*.md`, `docs/**` (minus generated TypeDoc
 * under `docs/api`), each package's published `README.md`, and the examples ladder
 * (`examples/README.md` + each example's `README.md`, now load-bearing navigation).
 * External `http(s)` and pure `#anchor` links are out of scope (no network /
 * heading-slug fragility).
 */
import { describe, test, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';

const REPO = process.cwd();

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.astro', 'docs/api']);

function walkMarkdown(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const rel = relative(REPO, abs).replace(/\\/g, '/');
    if (SKIP_DIRS.has(entry) || SKIP_DIRS.has(rel)) continue;
    const stat = statSync(abs);
    if (stat.isDirectory()) walkMarkdown(abs, out);
    else if (entry.endsWith('.md')) out.push(abs);
  }
}

/** Root docs + docs/** (minus docs/api) + every package README + the examples ladder. */
function collectDocs(): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(REPO)) {
    if (entry.endsWith('.md')) out.push(join(REPO, entry));
  }
  walkMarkdown(join(REPO, 'docs'), out);
  for (const pkg of readdirSync(join(REPO, 'packages'))) {
    const readme = join(REPO, 'packages', pkg, 'README.md');
    if (existsSync(readme)) out.push(readme);
  }
  const examplesRoot = join(REPO, 'examples');
  const examplesIndex = join(examplesRoot, 'README.md');
  if (existsSync(examplesIndex)) out.push(examplesIndex);
  for (const example of readdirSync(examplesRoot)) {
    const readme = join(examplesRoot, example, 'README.md');
    if (existsSync(readme)) out.push(readme);
  }
  return out;
}

const LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const BLOB = /^https?:\/\/github\.com\/[^/]+\/[^/]+\/blob\/main\/(.+)$/;

describe('doc link integrity', () => {
  test('every relative markdown link (and blob/main link) resolves to a real file', () => {
    const broken: string[] = [];
    for (const file of collectDocs()) {
      const src = readFileSync(file, 'utf8');
      for (const match of src.matchAll(LINK)) {
        const raw = match[1]!;
        const target = raw.split('#')[0]!.trim();
        if (target === '') continue; // pure #anchor — in-page, out of scope
        const blob = BLOB.exec(raw);
        if (!blob && /^(https?:|mailto:|tel:)/.test(target)) continue; // external
        const abs = blob ? resolve(REPO, blob[1]!.split('#')[0]!) : resolve(dirname(file), target);
        if (!existsSync(abs)) {
          broken.push(`${relative(REPO, file).replace(/\\/g, '/')} → ${raw}`);
        }
      }
    }
    expect(broken, `broken doc links (${broken.length}):\n${broken.join('\n')}`).toEqual([]);
  });
});
