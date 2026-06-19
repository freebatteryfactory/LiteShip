/**
 * Build-time invariant checker for czap.
 *
 * Scans source files for banned patterns in production code. This stays in
 * pure Node so it behaves the same in PowerShell, bash, and CI.
 */

import { readdirSync, readFileSync } from 'node:fs';
import type { Dirent } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { normalizeRepoPath } from '@czap/audit'; // CUT B5b — one slash-normalize home

export interface Invariant {
  name: string;
  pattern: RegExp;
  dirs: readonly string[];
  exclude?: readonly string[];
  message: string;
}

interface Violation {
  readonly file: string;
  readonly line: number;
  readonly content: string;
}

interface LineEndingRule {
  readonly pattern: string;
  readonly eol: 'lf' | 'crlf' | 'binary';
}

const repoRoot = resolve(import.meta.dirname, '..');

export const INVARIANTS: readonly Invariant[] = [
  {
    name: 'NO_REQUIRE',
    pattern: /\brequire\s*\(/,
    dirs: ['packages'],
    message: 'Use ESM imports, not require().',
  },
  {
    name: 'NO_MODULE_EXPORTS',
    pattern: /module\.exports/,
    dirs: ['packages'],
    message: 'Use ESM exports, not module.exports.',
  },
  {
    name: 'NO_DEFAULT_EXPORT',
    pattern: /export default/,
    dirs: ['packages'],
    // client-directives: Astro's addClientDirective contract requires a
    // default export. inspector-toolbar-app: Astro's addDevToolbarApp
    // entrypoint contract likewise requires a default-exported DevToolbarApp.
    // create-liteship templates: scaffolder *data*, not production code —
    // astro.config.ts must default-export defineConfig.
    exclude: [
      'packages/astro/src/client-directives/',
      'packages/astro/src/runtime/inspector-toolbar-app.ts',
      'packages/create-liteship/templates/',
    ],
    message: 'Named exports only, except Astro client directives.',
  },
  {
    name: 'NO_VAR',
    pattern: /\bvar\s+\w/,
    dirs: ['packages'],
    exclude: [
      'packages/astro/src/integration.ts',
      'packages/remotion/src/hooks.ts',
      'packages/astro/src/detect-upgrade.ts',
      'packages/astro/src/client-directives/worker.ts',
    ],
    message: 'Use const/let, not var.',
  },
  {
    // 0.3.0 signal source-of-truth: the runtime hot path must derive its signal
    // axis from `inputToSource` (@czap/core, the SignalSource source of truth),
    // never re-parse the dot-string with `startsWith('scroll.'/'viewport.')`.
    // The two diagnostic sites below legitimately namespace-check the input to
    // pick a teaching message (not to read a value), so they are excluded.
    name: 'NO_SIGNAL_INPUT_REPARSE',
    pattern: /\.startsWith\(\s*['"](?:scroll|viewport)\./,
    dirs: ['packages/astro/src/runtime', 'packages/vite/src'],
    exclude: [
      // Diagnostic namespace checks (which container message to emit), not axis reads.
      'packages/vite/src/css-quantize.ts',
      'packages/astro/src/runtime/inspector.ts',
    ],
    message:
      'Derive the signal axis from inputToSource(@czap/core), not a startsWith re-parse. ' +
      'If this is a diagnostic namespace check, add the file to the NO_SIGNAL_INPUT_REPARSE exclude.',
  },
] as const;

function walkTsFiles(dir: string): string[] {
  const results: string[] = [];
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    // An invariant scoped to a subtree that doesn't exist in the scanned root
    // contributes zero violations -- not a crash. The first nested-`dirs`
    // invariant (NO_SIGNAL_INPUT_REPARSE: packages/astro/src/runtime) is the
    // first to scan a path that can be absent: the satellite-scan fixture root
    // only materializes packages/core/**, so astro/src/runtime is missing there.
    // (Top-level `dirs: ['packages']` invariants never hit this; the repo always
    // has packages/.) Treat a missing scoped dir as empty, cross-platform.
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return results;
    throw err;
  }
  for (const entry of entries) {
    if (entry.name === 'dist' || entry.name === 'node_modules') continue;
    const absolute = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkTsFiles(absolute));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      results.push(absolute);
    }
  }
  return results;
}

function isExcluded(relativePath: string, excludes: readonly string[] | undefined): boolean {
  if (!excludes || excludes.length === 0) return false;
  const normalized = normalizeRepoPath(relativePath);
  return excludes.some((prefix) => normalized.includes(prefix));
}

export function findViolations(invariant: Invariant, root = repoRoot): Violation[] {
  const violations: Violation[] = [];

  for (const dir of invariant.dirs) {
    for (const file of walkTsFiles(resolve(root, dir))) {
      // relative-then-normalize (a relativeToRoot composition); the slash step is
      // normalizeRepoPath applied to a repo-relative path (CUT B5b).
      const rel = normalizeRepoPath(relative(root, file));
      if (isExcluded(rel, invariant.exclude)) continue;

      const lines = readFileSync(file, 'utf8').split(/\r?\n/);
      lines.forEach((line, index) => {
        if (invariant.pattern.test(line)) {
          violations.push({
            file: rel,
            line: index + 1,
            content: line.trim(),
          });
        }
      });
    }
  }

  return violations;
}

function globToRegExp(glob: string): RegExp {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}

export function parseLineEndingRules(gitattributesContent: string): readonly LineEndingRule[] {
  const rules: LineEndingRule[] = [];

  for (const rawLine of gitattributesContent.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const [pattern, ...attrs] = line.split(/\s+/);
    if (!pattern) {
      continue;
    }

    if (attrs.includes('binary')) {
      rules.push({ pattern, eol: 'binary' });
      continue;
    }

    const eolAttr = attrs.find((attr) => attr.startsWith('eol='));
    if (eolAttr === 'eol=lf' || eolAttr === 'eol=crlf') {
      rules.push({ pattern, eol: eolAttr === 'eol=lf' ? 'lf' : 'crlf' });
    }
  }

  return rules;
}

export function expectedLineEnding(relativePath: string, rules: readonly LineEndingRule[]): LineEndingRule['eol'] | null {
  const normalized = normalizeRepoPath(relativePath);

  for (let index = rules.length - 1; index >= 0; index--) {
    const rule = rules[index]!;
    if (globToRegExp(rule.pattern).test(normalized) || (rule.pattern === '*' && normalized.length > 0)) {
      return rule.eol;
    }
  }

  return null;
}

export function findLineEndingViolations(root = repoRoot): readonly string[] {
  const rules = parseLineEndingRules(readFileSync(resolve(root, '.gitattributes'), 'utf8'));
  const violations: string[] = [];

  const report = execFileSync('git', ['ls-files', '--eol'], {
    cwd: root,
    encoding: 'utf8',
  });

  for (const line of report.split(/\r?\n/)) {
    if (!line.trim()) {
      continue;
    }

    const match = line.match(/^i\/(\S+)\s+w\/(\S+)\s+attr\/(.+?)\s+\t(.+)$/);
    if (!match) {
      continue;
    }

    const [, indexEol, , attr, file] = match;
    const rel = normalizeRepoPath(file);
    if (rel.endsWith('.map')) {
      continue;
    }

    const expected = expectedLineEnding(rel, rules);
    if (!expected) {
      continue;
    }

    if (expected === 'binary') {
      if (!attr.includes('-text') && !attr.includes('binary')) {
        violations.push(`${rel}: expected binary attributes`);
      }
      continue;
    }

    if (expected === 'lf' && !attr.includes('eol=lf')) {
      violations.push(`${rel}: expected .gitattributes attr eol=lf`);
      continue;
    }

    if (expected === 'crlf' && !attr.includes('eol=crlf')) {
      violations.push(`${rel}: expected .gitattributes attr eol=crlf`);
      continue;
    }

    if (indexEol !== 'lf') {
      violations.push(`${rel}: expected normalized git index line endings`);
    }
  }

  return violations;
}

function main(): void {
  let failed = false;

  for (const invariant of INVARIANTS) {
    const violations = findViolations(invariant);
    if (violations.length === 0) continue;

    failed = true;
    console.error(`\n[INVARIANT VIOLATION] ${invariant.name}: ${invariant.message}`);
    for (const violation of violations) {
      console.error(`${violation.file}:${violation.line}: ${violation.content}`);
    }
  }

  const lineEndingViolations = findLineEndingViolations();
  if (lineEndingViolations.length > 0) {
    failed = true;
    console.error('\n[INVARIANT VIOLATION] LINE_ENDINGS: Text files must match .gitattributes eol policy.');
    for (const violation of lineEndingViolations) {
      console.error(violation);
    }
  }

  if (failed) {
    console.error('\nInvariant check failed.');
    process.exit(1);
  }

  console.log('All invariants passed.');
}

function isDirectExecution(moduleUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return moduleUrl === pathToFileURL(entry).href;
}

if (isDirectExecution(import.meta.url)) {
  main();
}
