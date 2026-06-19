/**
 * Plumb-completeness gate — fails when the repo would ship incomplete work green.
 *
 * HARD RULE (no exceptions): a placeholder is BLOCKING. The capsule harness emits
 * `it.skip`/`test.skip` into `tests/generated/` whenever a capsule binding isn't
 * wired — a skipped test that ships green is a LIE about coverage. This gate fails
 * on ANY such skip and prints the full list as the work-list. There is no floor and
 * no registry: the only way to green is to WIRE the binding so the test is REAL (or
 * delete a check that genuinely cannot apply to that capsule kind).
 *
 * It also fails when a published package is missing a `PACKAGE_PLUMB` classification.
 *
 * @module
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { repoRoot } from '../vitest.shared.js';
import { isDirectExecution } from './audit/shared.js';
import { PACKAGE_PLUMB } from './plumb-registry.js';

/** One skipped generated test — a placeholder standing in for unwired work. */
export interface PlumbSkip {
  readonly file: string;
  readonly kind: 'it.skip' | 'test.skip' | 'describe.skip';
  readonly message: string;
}

export interface PlumbGateResult {
  readonly ok: boolean;
  /** Every `*.skip(...)` placeholder in `tests/generated/` — each one is blocking. */
  readonly skips: readonly PlumbSkip[];
  /** Published packages with no PACKAGE_PLUMB classification. */
  readonly unclassified: readonly string[];
  /** Whether the generated test corpus was present to scan (false ⇒ run capsule:compile). */
  readonly generatedPresent: boolean;
}

// Matches the `.skip(` CALL itself — `it.skip(`, `test.skip(`, `describe.skip(` —
// regardless of whether the first arg is a string literal or a computed expression
// (the harness writes `it.skip(cond ? 'a' : 'b')` for not-arbitrary-derivable
// schemas). `.skipIf(` is NOT matched (the `(` must follow `skip` directly), so
// genuine runtime-conditional skips are excluded.
const SKIP_CALL_RE = /\b(it|test|describe)\.skip\(/g;
// The first quoted string after the call — the human-readable reason — used for
// the work-list line (escape-aware; tolerates a leading ternary condition).
const FIRST_STRING_RE = /(['"`])((?:\\.|(?!\1).)*)\1/;

function collectGeneratedSkips(root: string): { skips: PlumbSkip[]; present: boolean } {
  const dir = resolve(root, 'tests', 'generated');
  if (!existsSync(dir)) return { skips: [], present: false };
  const skips: PlumbSkip[] = [];
  let sawTest = false;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.test.ts')) continue;
    sawTest = true;
    const src = readFileSync(resolve(dir, entry.name), 'utf8');
    for (const m of src.matchAll(SKIP_CALL_RE)) {
      const window = src.slice(m.index + m[0].length, m.index + m[0].length + 400);
      const msg = FIRST_STRING_RE.exec(window);
      skips.push({
        file: `tests/generated/${entry.name}`,
        kind: `${m[1]}.skip` as PlumbSkip['kind'],
        message: msg ? (msg[2] ?? '') : '(computed reason)',
      });
    }
  }
  skips.sort((a, b) => a.file.localeCompare(b.file) || a.message.localeCompare(b.message));
  return { skips, present: sawTest };
}

function publishedPackages(root: string): string[] {
  const names: string[] = [];
  const dir = resolve(root, 'packages');
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const pkgPath = resolve(dir, entry.name, 'package.json');
    if (!existsSync(pkgPath)) continue;
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { name?: string; private?: boolean };
    if (pkg.name && !pkg.private) names.push(pkg.name);
  }
  return names.sort();
}

export function runPlumbGate(root = repoRoot): PlumbGateResult {
  const { skips, present } = collectGeneratedSkips(root);
  const unclassified = publishedPackages(root).filter((name) => !(name in PACKAGE_PLUMB));
  return {
    ok: skips.length === 0 && unclassified.length === 0,
    skips,
    unclassified,
    generatedPresent: present,
  };
}

function main(): void {
  const result = runPlumbGate();
  if (!result.ok) {
    if (result.skips.length > 0) {
      process.stderr.write(
        `PLUMB GATE FAILED — ${result.skips.length} placeholder skip(s) in tests/generated/ ` +
          '(a skipped generated test is unwired work shipping green — WIRE the binding so the ' +
          'test is REAL, or remove a check that cannot apply to that capsule kind):\n',
      );
      for (const s of result.skips) process.stderr.write(`  ${s.file}  ${s.kind}('${s.message}')\n`);
    }
    if (result.unclassified.length > 0) {
      process.stderr.write(
        'PLUMB GATE FAILED — published packages missing a PACKAGE_PLUMB classification ' +
          '(runtime | tooling | deferred):\n',
      );
      for (const name of result.unclassified) process.stderr.write(`  ? ${name}\n`);
    }
    process.stderr.write(
      JSON.stringify({
        status: 'failed',
        command: 'plumb-gate',
        skips: result.skips.length,
        unclassified: result.unclassified.length,
        generatedPresent: result.generatedPresent,
        timestamp: new Date().toISOString(),
      }) + '\n',
    );
    process.exit(1);
  }
  process.stdout.write(
    JSON.stringify({
      status: 'ok',
      command: 'plumb-gate',
      skips: 0,
      generatedPresent: result.generatedPresent,
      timestamp: new Date().toISOString(),
    }) + '\n',
  );
}

if (isDirectExecution(import.meta.url)) {
  main();
}
