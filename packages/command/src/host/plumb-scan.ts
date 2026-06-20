/**
 * The plumb-gate scan engine (migrated from `scripts/plumb-gate.ts`). A pure
 * `node:fs` directory walk over a repo root — no process.exit, no stdout — that
 * backs the `runPlumb` capability in {@link createNodeCommandContext}. Kept as a
 * host module (alongside spawn / vitest-runner / ffmpeg) so the pure
 * `@czap/command` registry never takes an fs edge, and so the scan is unit
 * testable in isolation.
 *
 * @module
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { ParseError } from '@czap/error';
import { PACKAGE_PLUMB } from '../commands/plumb-registry.js';
import type { PlumbGateSummary, PlumbSkip } from '../registry.js';

// Matches the `.skip(` CALL itself — `it.skip(`, `test.skip(`, `describe.skip(` —
// regardless of whether the first arg is a string literal or a computed expression
// (the harness writes `it.skip(cond ? 'a' : 'b')` for not-arbitrary-derivable
// schemas). `.skipIf(` is NOT matched (the `(` must follow `skip` directly), so
// genuine runtime-conditional skips are excluded.
const SKIP_CALL_RE = /\b(it|test|describe|bench)\.skip\(/g;
// The first quoted string after the call — the human-readable reason — used for
// the work-list line (escape-aware; tolerates a leading ternary condition).
const FIRST_STRING_RE = /(['"`])((?:\\.|(?!\1).)*)\1/;

function collectGeneratedSkips(root: string): { skips: PlumbSkip[]; present: boolean } {
  const dir = resolve(root, 'tests', 'generated');
  if (!existsSync(dir)) return { skips: [], present: false };
  const skips: PlumbSkip[] = [];
  let sawGenerated = false;
  // Scan EVERY generated lane, recursively: `.test.ts` (unit), `.bench.ts` (bench),
  // and any nested lane dir (e.g. `integration/`). The lane-aware harness routes a
  // check into the lane that fits — so a placeholder skip hiding in a non-unit lane
  // would be the EXACT blindness this gate exists to kill. No lane is exempt.
  const rels = readdirSync(dir, { recursive: true }) as string[];
  for (const rel of rels) {
    if (!rel.endsWith('.test.ts') && !rel.endsWith('.bench.ts')) continue;
    sawGenerated = true;
    const src = readFileSync(resolve(dir, rel), 'utf8');
    for (const m of src.matchAll(SKIP_CALL_RE)) {
      const window = src.slice(m.index + m[0].length, m.index + m[0].length + 400);
      const msg = FIRST_STRING_RE.exec(window);
      skips.push({
        file: `tests/generated/${rel.split(/[\\/]/).join('/')}`,
        kind: `${m[1]}.skip` as PlumbSkip['kind'],
        message: msg ? (msg[2] ?? '') : '(computed reason)',
      });
    }
  }
  skips.sort((a, b) => a.file.localeCompare(b.file) || a.message.localeCompare(b.message));
  return { skips, present: sawGenerated };
}

function publishedPackages(root: string): string[] {
  const names: string[] = [];
  const dir = resolve(root, 'packages');
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const pkgPath = resolve(dir, entry.name, 'package.json');
    if (!existsSync(pkgPath)) continue;
    const raw = readFileSync(pkgPath, 'utf8');
    let pkg: { name?: string; private?: boolean };
    try {
      pkg = JSON.parse(raw) as { name?: string; private?: boolean };
    } catch (error) {
      // A malformed package.json is a real, blocking fault — surface it as a
      // tagged ParseError rather than crashing the gate with a bare SyntaxError.
      throw ParseError(
        'plumb.package-json',
        `failed to parse ${pkgPath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (pkg.name && !pkg.private) names.push(pkg.name);
  }
  return names.sort();
}

/**
 * Run the plumb-completeness gate over `root` (the host's `cwd`). Pure scan:
 * `ok` ⟺ no `*.skip` placeholders in `tests/generated/` AND every published
 * package classified in `PACKAGE_PLUMB`.
 */
export function runPlumbScan(root: string): PlumbGateSummary {
  const { skips, present } = collectGeneratedSkips(root);
  const unclassified = publishedPackages(root).filter((name) => !(name in PACKAGE_PLUMB));
  return {
    ok: skips.length === 0 && unclassified.length === 0,
    skips,
    unclassified,
    generatedPresent: present,
  };
}
