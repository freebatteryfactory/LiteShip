/**
 * The plumb-gate scan engine (migrated from `scripts/plumb-gate.ts`). A pure
 * `node:fs` directory walk over a repo root — no process.exit, no stdout — that
 * backs the `runPlumb` capability in {@link createNodeCommandContext}. Kept as a
 * host module (alongside spawn / vitest-runner / ffmpeg) so the pure
 * `@liteship/command` registry never takes an fs edge, and so the scan is unit
 * testable in isolation.
 *
 * @module
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { walkFiles } from '@liteship/core/fs-walk';
import { ParseError } from '@liteship/error';
import { detectSkips, type SkipMatch } from '@liteship/gauntlet';
import { PACKAGE_PLUMB } from '../commands/plumb-registry.js';
import type { PlumbGateSummary, PlumbSkip } from '../registry.js';

/**
 * The skip detector the scan folds — a `(source) => SkipMatch[]`. INJECTED by the caller so the
 * SOUND AST detector (`@liteship/audit`'s `detectSkipsAST`, line-agnostic + the structural
 * conditionality) can be used WITHOUT `@liteship/command` gaining a `typescript`/`@liteship/audit` edge
 * (the boundary LAW: the lean token `detectSkips` is the FALLBACK; the CLI host — which deps
 * `@liteship/audit` — injects the AST detector). Defaults to the dependency-free token `detectSkips`.
 */
export type PlumbSkipDetector = (source: string) => readonly SkipMatch[];

// The first quoted string after the matched skip token — the human-readable reason —
// used for the work-list line (escape-aware; tolerates a leading ternary condition).
const FIRST_STRING_RE = /(['"`])((?:\\.|(?!\1).)*)\1/;
const MISSING_GENERATED_CORPUS_MESSAGE =
  'tests/generated/ has no generated test corpus; run `pnpm run capsule:compile` before `liteship plumb`.';

/**
 * THE GENERATED HANDOFF, detector-UNIFIED. `tests/generated/` is the plumb-gate's
 * exclusive subtree (the `no-skipped-test` gate excludes it to avoid double-jeopardy), so
 * this scan must use the SAME full, alias-aware detector that gate uses — never a weaker
 * regex. The first cut here matched only the literal `.skip(` CALL, so a generated
 * `it.runIf(...)` / `it.skipIf(...)` / `it.todo(...)` / `xit(...)` / the `COND ? it :
 * it.skip` alias would slip through BOTH this scan AND the gate (the exact handoff gap the
 * second review found). Now it folds `@liteship/gauntlet`'s `detectSkips` (call / conditional /
 * alias forms over `codeOnly`-stripped text, so a prose mention is never flagged) — ONE
 * owner, the FULL detector. A generated test must NEVER skip in ANY form.
 */
function collectGeneratedSkips(root: string, detect: PlumbSkipDetector): { skips: PlumbSkip[]; present: boolean } {
  const dir = resolve(root, 'tests', 'generated');
  if (!existsSync(dir)) return { skips: [], present: false };
  const skips: PlumbSkip[] = [];
  let sawGenerated = false;
  // Scan EVERY generated lane, recursively: `.test.ts` (unit), `.bench.ts` (bench),
  // and any nested lane dir (e.g. `integration/`). The lane-aware harness routes a
  // check into the lane that fits — so a placeholder skip hiding in a non-unit lane
  // would be the EXACT blindness this gate exists to kill. No lane is exempt. The
  // recursive `.test.ts`/`.bench.ts` walk is `@liteship/core/fs-walk`'s `walkFiles`
  // (deterministic, cycle-safe); its absolute paths slice back to the `tests/generated/`
  // relative id the work-list line reports.
  for (const abs of walkFiles(dir, { suffixes: ['.test.ts', '.bench.ts'] })) {
    const rel = abs.slice(dir.length + 1);
    sawGenerated = true;
    const src = readFileSync(abs, 'utf8');
    const lines = src.split('\n');
    for (const skip of detect(src)) {
      // The human-readable reason: the first string literal at/after the matched line
      // (the title for a call form, the guard's reason for a conditional). Scan from the
      // raw source line so a computed/ternary message is still surfaced as best effort.
      const window = lines.slice(skip.line - 1, skip.line + 9).join('\n');
      const msg = FIRST_STRING_RE.exec(window);
      skips.push({
        file: `tests/generated/${rel.split(/[\\/]/).join('/')}`,
        kind: skip.token,
        message: msg ? (msg[2] ?? '') : '(computed reason)',
      });
    }
  }
  skips.sort(
    (a, b) => a.file.localeCompare(b.file) || a.kind.localeCompare(b.kind) || a.message.localeCompare(b.message),
  );
  return { skips, present: sawGenerated };
}

/**
 * Every publishable `@liteship/*` name, read dynamically from manifests as the
 * independent physical-packaging oracle. Authored classification lives in
 * `scripts/package-catalog.ts` and reaches command through generated
 * `PACKAGE_PLUMB`; this scan intentionally stays independent so drift is loud.
 */
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
 * `ok` ⟺ a generated corpus is present, no `*.skip` placeholders in
 * `tests/generated/`, AND every published package classified in `PACKAGE_PLUMB`.
 *
 * The optional `skipDetector` (a `(source) => SkipMatch[]`) is the INJECTED SOUND AST detector
 * (`@liteship/audit`'s `detectSkipsAST`); the CLI host passes it so a generated multi-line / ASI /
 * inner-describe skip the token scanner would miss is caught here too — `(skipDetector ??
 * detectSkips)`. Omitted (a lean caller) ⇒ the dependency-free token `detectSkips` fallback runs.
 */
export function runPlumbScan(root: string, skipDetector?: PlumbSkipDetector): PlumbGateSummary {
  const { skips, present } = collectGeneratedSkips(root, skipDetector ?? detectSkips);
  const unclassified = publishedPackages(root).filter((name) => !(name in PACKAGE_PLUMB));
  return {
    ok: present && skips.length === 0 && unclassified.length === 0,
    skips,
    unclassified,
    generatedPresent: present,
    generatedCorpusMessage: present ? null : MISSING_GENERATED_CORPUS_MESSAGE,
  };
}
