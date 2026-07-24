/**
 * check-invariants (CLI adapter, CUT A3 → B5b CLI-only) — thin projection over
 * `@liteship/command`'s check-invariants command (the fast-lane invariant gate,
 * migrated from `scripts/check-invariants.ts`). The pass/fail decision lives in
 * `@liteship/command`; the CLI is the ONLY adapter that wires the `runCheckInvariants`
 * capability, because the scan needs `@liteship/audit`'s `normalizeRepoPath` (the one
 * slash-normalize home — B5b cage). `@liteship/command` must NOT import `@liteship/audit`
 * (it would drag the heavy TS-compiler/glob engine into `@liteship/mcp-server`), and
 * the primitive can't relocate to a shared low-level home (`@liteship/audit` may not
 * import `@liteship/core` — the D9b standalone law). So — exactly like `audit` and
 * `audit-floor` — this gate is CLI-only: the `@liteship/audit`-dependent scan lives
 * here, and over MCP the capability is simply absent (capabilityUnavailable).
 *
 * This adapter owns the `node:fs` source-walk + the `git ls-files --eol`
 * line-ending probe + the `INVARIANTS` rule set, emits the structured receipt,
 * and prints the violation work-list to stderr when the gate fails. Exit 0 ok,
 * 1 gate failed.
 *
 * @module
 */
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { walkFiles } from '@liteship/core/fs-walk';
import { IoError } from '@liteship/error';
import { normalizeRepoPath } from '@liteship/audit';
import {
  checkInvariantsCommand,
  INVARIANTS,
  type CheckInvariantsPayload,
  type CheckInvariantsSummary,
  type CommandContext,
  type CheckInvariantEntry,
  type InvariantViolation,
  type InvariantViolationGroup,
} from '@liteship/command';
import { spawnArgvCapture } from '@liteship/command/host';
import { emit, type WallClockTimestamp } from '../receipts.js';
import { scanWorkflowActionPins } from '../lib/workflow-action-pins.js';

/** Receipt emitted by `liteship check-invariants`. */
export interface CheckInvariantsReceipt extends CheckInvariantsPayload {
  readonly status: 'ok' | 'failed';
  readonly command: 'check-invariants';
  readonly timestamp: WallClockTimestamp;
}

/**
 * The subprocess-capture capability the `git ls-files --eol` line-ending probe
 * shells out through. Injectable (defaulting to the real {@link spawnArgvCapture})
 * so tests script the probe deterministically — no real `git` — while production
 * call sites stay byte-identical.
 */
type SpawnArgvCapture = typeof spawnArgvCapture;

interface LineEndingRule {
  readonly pattern: string;
  readonly eol: 'lf' | 'crlf' | 'binary';
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
export function findViolations(invariant: CheckInvariantEntry, root: string): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  for (const dir of invariant.dirs) {
    // The shared `@liteship/core/fs-walk` walker (skips `dist`/`node_modules`, keeps
    // `.ts`); a `.d.ts` is filtered here since `suffixes: ['.ts']` also matches it.
    // An invariant scoped to a subtree that doesn't exist in the scanned root
    // contributes zero violations -- walkFiles tolerates a missing dir (returns
    // []), so a nested-`dirs` invariant whose subtree is absent in the adaptive
    // fixture root is empty, not a crash.
    for (const file of walkFiles(resolve(root, dir), { skipDirs: ['dist', 'node_modules'], suffixes: ['.ts'] })) {
      if (file.endsWith('.d.ts')) continue;
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
export async function findLineEndingViolations(
  root: string,
  spawn: SpawnArgvCapture = spawnArgvCapture,
): Promise<readonly string[]> {
  const rules = parseLineEndingRules(readFileSync(resolve(root, '.gitattributes'), 'utf8'));
  const violations: string[] = [];

  // Route the `git ls-files --eol` probe through the canonical spawn helper (the
  // host bans raw node:child_process). captureBytes is bumped well past the 1 MiB
  // default — the per-file eol report scales with the whole tracked tree.
  const probe = await spawn('git', ['ls-files', '--eol'], {
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
    // narrows `string | undefined` for the strict compile.
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
export async function runCheckInvariantsScan(
  root: string,
  spawn: SpawnArgvCapture = spawnArgvCapture,
): Promise<CheckInvariantsSummary> {
  const groups: InvariantViolationGroup[] = [];
  for (const invariant of INVARIANTS) {
    const violations = findViolations(invariant, root);
    if (violations.length === 0) continue;
    groups.push({ name: invariant.name, message: invariant.message, violations });
  }

  const actionPinViolations: InvariantViolation[] = [];
  for (const file of walkFiles(resolve(root, '.github/workflows'), { suffixes: ['.yml', '.yaml'] })) {
    const rel = normalizeRepoPath(relative(root, file));
    for (const violation of scanWorkflowActionPins(readFileSync(file, 'utf8'))) {
      actionPinViolations.push({ file: rel, line: violation.line, content: violation.content });
    }
  }
  if (actionPinViolations.length > 0) {
    groups.push({
      name: 'IMMUTABLE_WORKFLOW_ACTIONS',
      message: 'Pin every third-party GitHub Action to an immutable 40-character commit SHA.',
      violations: actionPinViolations,
    });
  }

  const lineEndings = await findLineEndingViolations(root, spawn);

  return {
    ok: groups.length === 0 && lineEndings.length === 0,
    groups,
    lineEndings,
  };
}

/**
 * Injectable scan seam for {@link checkInvariants}. `spawn` DEFAULTS (via the
 * null-coalesce at its call site) to the real {@link spawnArgvCapture}, so
 * production `liteship check-invariants` is byte-identical; tests pass a scripted
 * spawn to pin the adapter's receipt + work-list projection without a real
 * `git ls-files --eol` probe. Unexported + off the public barrel.
 */
interface CheckInvariantsDeps {
  readonly spawn?: SpawnArgvCapture;
}

/** Execute `liteship check-invariants` — scan source for banned patterns + line-ending policy; emit a verdict. */
export async function checkInvariants(
  opts: { cwd?: string; pretty?: boolean } = {},
  deps: CheckInvariantsDeps = {},
): Promise<number> {
  const cwd = opts.cwd ?? process.cwd();

  const context: CommandContext = {
    cwd,
    runCheckInvariants: async () => runCheckInvariantsScan(cwd, deps.spawn ?? spawnArgvCapture),
  };

  const result = await checkInvariantsCommand.handler({ name: 'check-invariants', args: {} }, context);
  const payload = result.payload as CheckInvariantsPayload;

  const receipt: CheckInvariantsReceipt = {
    status: result.status === 'ok' ? 'ok' : 'failed',
    command: 'check-invariants',
    timestamp: result.timestamp,
    ...payload,
  };
  emit(receipt);

  // Human work-list on stderr (preserves the deleted script's diagnostic output).
  const wantPretty = opts.pretty ?? Boolean(process.stderr.isTTY);
  if (!payload.ok && wantPretty) {
    for (const group of payload.groups) {
      process.stderr.write(`\n[INVARIANT VIOLATION] ${group.name}: ${group.message}\n`);
      for (const v of group.violations) process.stderr.write(`${v.file}:${v.line}: ${v.content}\n`);
    }
    if (payload.lineEndings.length > 0) {
      process.stderr.write('\n[INVARIANT VIOLATION] LINE_ENDINGS: Text files must match .gitattributes eol policy.\n');
      for (const v of payload.lineEndings) process.stderr.write(`${v}\n`);
    }
    process.stderr.write('\nInvariant check failed.\n');
  }

  return typeof result.exitCode === 'number' ? result.exitCode : payload.ok ? 0 : 1;
}
