/**
 * Shipped-docs Effect-residue gate — the classifier gap closed for PR #158 (finding #7).
 *
 * Invariant 14 (tests/unit/core/invariants.test.ts) pins that no `.ts` under any
 * `packages/<pkg>/src` tree imports `effect`. But the zero-residue closeout
 * (traceability/effect-shed-receipt.json) certified an ECOSYSTEM-level zero while
 * every package README still shipped `pnpm add … effect@beta` install lines,
 * `import { Effect } from 'effect'` snippets, and `Effect.runSync(...)` usage — and
 * three READMEs claimed an `effect` peer their own `package.json` never declared.
 * Those are ACTIVE, WRONG consumer instructions the source-only invariant never saw,
 * because it walks only `.ts` under `src/`, never `.md`, and matches only
 * `from 'effect'` (not install lines or version pins).
 *
 * This gate extends the tripwire to the shipped, consumer-facing docs: no package
 * README (including `_`-prefixed packages), the root README, or GETTING-STARTED.md
 * may carry an Effect INSTALL / version-PIN / IMPORT / runtime-USAGE instruction, nor
 * a live PEER-DEPENDENCY / beta-version-range claim (the P1 support-matrix regression:
 * the root README asserted `Effect is currently >=4.0.0-beta.0 … dev-pins 4.0.0-beta.32`
 * long after the runtime was shed). The patterns are deliberately instruction/claim-
 * shaped, so NEGATION prose — "the `effect` peer was shed in v0.18", "no `effect` import
 * here", "Effect-free", "the `effect` runtime … was fully removed" — never matches and
 * stays legal (removal prose carries no concrete prerelease pin).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '../../../..');

/** Consumer-facing shipped docs: every package README + the root README + getting-started. */
function shippedDocFiles(): readonly string[] {
  const files: string[] = [];
  for (const rel of ['README.md', 'GETTING-STARTED.md']) {
    const abs = join(REPO_ROOT, rel);
    if (existsSync(abs)) files.push(abs);
  }
  const packagesDir = join(REPO_ROOT, 'packages');
  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const readme = join(packagesDir, entry.name, 'README.md');
    if (existsSync(readme)) files.push(readme); // includes `_`-prefixed (e.g. _spine)
  }
  return files;
}

/**
 * Effect INSTRUCTION residue — install / version-pin / import / runtime-usage. Each
 * is instruction-shaped, so a sentence that merely says Effect was REMOVED never
 * matches (no install verb, no `@` pin, no `from 'effect'`, no `Effect.method(`).
 */
const RESIDUE_PATTERNS: readonly { readonly label: string; readonly re: RegExp }[] = [
  { label: 'install command adding effect', re: /\b(?:pnpm add|pnpm i|npm i(?:nstall)?|yarn add)\b[^\n]*\beffect(?:@|\b)/ },
  { label: 'effect@ version pin', re: /\beffect@(?:beta|latest|next|\d)/ },
  { label: "import from 'effect'", re: /from ['"]effect['"]/ },
  { label: 'Effect runtime usage', re: /\bEffect\.(?:runSync|runPromise|gen|scoped|all|succeed|fail|promise|sync|forEach)\s*\(/ },
  {
    // Live peer-dependency / version-range claim: Effect adjacent to a concrete
    // prerelease pin (`4.0.0-beta.0`, `4.0.0-beta.32`) on the same line, in either
    // order. Removal prose ("Effect was fully removed", "Effect-free") carries no
    // such pin and stays legal.
    label: 'effect peer-dependency / beta-version-range claim',
    re: /\beffect\b[^\n]*?\d+\.\d+\.\d+-(?:beta|alpha|rc|next)|\d+\.\d+\.\d+-(?:beta|alpha|rc|next)[^\n]*?\beffect\b/i,
  },
];

describe('shipped docs are Effect-free (consumer install/usage residue gate)', () => {
  const files = shippedDocFiles();

  it('the shipped-doc roster is non-empty (the sweep is not vacuous)', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('no package README / root README / GETTING-STARTED carries an Effect install, pin, import, or usage instruction', () => {
    const violations: string[] = [];
    for (const file of files) {
      const rel = file.slice(REPO_ROOT.length + 1);
      const lines = readFileSync(file, 'utf8').split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        for (const { label, re } of RESIDUE_PATTERNS) {
          if (re.test(line)) {
            violations.push(`  ${rel}:${i + 1} [${label}]: ${line.trim()}`);
            break;
          }
        }
      }
    }
    expect(
      violations,
      [
        'Shipped consumer docs still instruct installing or using Effect.',
        '',
        'The ecosystem was certified Effect-free (traceability/effect-shed-receipt.json);',
        'these are ACTIVE, incorrect install/usage instructions, not archival prose. Remove',
        'the Effect install line / version pin / import / usage — the current API is',
        'synchronous (plain `.read()`/`.subscribe()`/function calls). Statements that Effect',
        'was SHED ("the `effect` peer was shed in v0.18") are allowed and never flagged.',
        '',
        'Violations:',
        ...violations,
      ].join('\n'),
    ).toEqual([]);
  });
});
