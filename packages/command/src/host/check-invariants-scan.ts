/**
 * The invariant-checker scan engine (migrated from `scripts/check-invariants.ts`).
 * A pure `node:fs` source walk over a repo root — no process.exit, no stdout —
 * that backs the `runCheckInvariants` capability in {@link createNodeCommandContext}.
 * Kept as a host module (alongside spawn / vitest-runner / plumb-scan) so the pure
 * `@czap/command` registry never takes an fs/child_process edge, and so the scan
 * is unit testable in isolation.
 *
 * The banned-pattern rule set lives in the pure `check-invariants-registry.ts`
 * data module; this host module supplies the scan over a working tree:
 *   - {@link findViolations}: banned-pattern violations for one rule.
 *   - line-ending policy (`.gitattributes` vs the git index, via `git ls-files --eol`).
 *   - {@link runCheckInvariantsScan}: the full verdict the command projects.
 *
 * @module
 */
import { readdirSync, readFileSync } from 'node:fs';
import type { Dirent } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { IoError } from '@czap/error';
import { spawnArgvCapture } from './spawn.js';
import { INVARIANTS, type Invariant } from '../commands/check-invariants-registry.js';
import type {
  CheckInvariantsSummary,
  InvariantViolationGroup,
  InvariantViolation,
} from '../registry.js';

/**
 * Pure repo-path slash normalization (Windows `\` → `/`). Inlined here rather
 * than imported from `@czap/audit` so the light `node:fs` scan never drags the
 * heavy TypeScript-compiler/glob audit engine into `@czap/command`/`@czap/mcp-server`.
 */
function normalizeRepoPath(value: string): string {
  return value.replace(/\\/g, '/');
}

interface LineEndingRule {
  readonly pattern: string;
  readonly eol: 'lf' | 'crlf' | 'binary';
}

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

/**
 * Every banned-pattern violation of `invariant` under `root`. A repo-relative,
 * slash-normalized `file` + 1-based `line` + trimmed `content` per hit.
 */
export function findViolations(invariant: Invariant, root: string): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  for (const dir of invariant.dirs) {
    for (const file of walkTsFiles(resolve(root, dir))) {
      // relative-then-normalize (a relativeToRoot composition); the slash step is
      // normalizeRepoPath applied to a repo-relative path.
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

/** Parse `.gitattributes` eol rules in declaration order. */
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

/** The expected eol for `relativePath` under `rules` (last matching rule wins), or null. */
export function expectedLineEnding(
  relativePath: string,
  rules: readonly LineEndingRule[],
): LineEndingRule['eol'] | null {
  const normalized = normalizeRepoPath(relativePath);

  for (let index = rules.length - 1; index >= 0; index--) {
    const rule = rules[index]!;
    if (globToRegExp(rule.pattern).test(normalized) || (rule.pattern === '*' && normalized.length > 0)) {
      return rule.eol;
    }
  }

  return null;
}

/** Files whose committed line endings violate the `.gitattributes` eol policy under `root`. */
export async function findLineEndingViolations(root: string): Promise<readonly string[]> {
  const rules = parseLineEndingRules(readFileSync(resolve(root, '.gitattributes'), 'utf8'));
  const violations: string[] = [];

  // Route the `git ls-files --eol` probe through the canonical spawn helper (the
  // host bans raw node:child_process). captureBytes is bumped well past the 1 MiB
  // default — the per-file eol report scales with the whole tracked tree.
  const probe = await spawnArgvCapture('git', ['ls-files', '--eol'], {
    cwd: root,
    captureBytes: 64 * 1024 * 1024,
  });
  if (probe.exitCode !== 0) {
    throw IoError('check-invariants.git-ls-files', `git ls-files --eol failed (exit ${probe.exitCode})`, {
      path: root,
    });
  }
  const report = probe.stdout;

  for (const line of report.split(/\r?\n/)) {
    if (!line.trim()) {
      continue;
    }

    const match = line.match(/^i\/(\S+)\s+w\/(\S+)\s+attr\/(.+?)\s+\t(.+)$/);
    if (!match) {
      continue;
    }

    const [, indexEol, , attr, file] = match;
    // The 4-group regex matched, so every captured group is present; the guard
    // narrows `string | undefined` for the strict `@czap/command` compile.
    if (indexEol === undefined || attr === undefined || file === undefined) {
      continue;
    }
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

/**
 * Run the fast-lane invariant gate over `root` (the host's `cwd`). Pure scan:
 * `ok` ⟺ no banned-pattern violation in any `INVARIANTS` rule AND every committed
 * text file matches the `.gitattributes` eol policy. Returns a structured verdict
 * — no process.exit, no stdout.
 */
export async function runCheckInvariantsScan(root: string): Promise<CheckInvariantsSummary> {
  const groups: InvariantViolationGroup[] = [];
  for (const invariant of INVARIANTS) {
    const violations = findViolations(invariant, root);
    if (violations.length === 0) continue;
    groups.push({ name: invariant.name, message: invariant.message, violations });
  }

  const lineEndings = await findLineEndingViolations(root);

  return {
    ok: groups.length === 0 && lineEndings.length === 0,
    groups,
    lineEndings,
  };
}
