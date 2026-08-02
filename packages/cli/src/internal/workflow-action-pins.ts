/** Fast-lane scanner for immutable third-party GitHub Action references. */

/**
 * Locally-built tagged `ValidationError` (structurally conformant to the
 * `@liteship/error` contract, which is a shape, not a base class). It stays
 * local because this module must load on a cold checkout — the host-preparation
 * contract imports it before any workspace dist exists, so a value-import of
 * `@liteship/error` resolves into dist and is exactly the cold-start failure
 * the prebuild-dist-free gate forbids — while a relative reach into
 * `../../../error/src` is the cross-package escape that the shipped-dist
 * smoke and the package-import-boundaries law forbid. Same pattern as
 * `packages/command/src/checks/registry.ts`.
 */
const workflowValidationError = (module: string, detail: string): Error =>
  Object.assign(Error(`${module}: ${detail}`), {
    name: 'ValidationError',
    _tag: 'ValidationError' as const,
    module,
    detail,
  });

export interface WorkflowActionPinViolation {
  readonly line: number;
  readonly content: string;
  readonly reason:
    | 'missing-immutable-revision'
    | 'untrusted-source'
    | 'credentials-persisted'
    | 'unreadable-yaml'
    | 'expression-in-run';
}

interface YamlShapeViolation {
  readonly line: number;
  readonly content: string;
  readonly message: string;
}

export interface WorkflowReaderSource {
  readonly path: string;
  readonly text: string;
}

/**
 * Locate dependency-free workflow readers that still parse structure instead
 * of consuming {@link workflowJobSections}. This is a migration census: its
 * grammar recognizes the extant job-header, dynamic job-marker, and artifact
 * step-walk shapes. Only the module that owns the shared implementation is
 * exempt from its own header grammar; merely importing or mentioning the
 * shared symbol cannot hide an additional reader.
 */
export function independentWorkflowReaderSites(files: readonly WorkflowReaderSource[]): readonly string[] {
  const sites: string[] = [];
  for (const file of files) {
    const subject = withoutFunctionThroughNextDoc(
      withoutFunctionThroughNextDoc(file.text, 'export function independentWorkflowReaderSites'),
      'export function workflowJobSections',
    );
    const readsJobHeader = subject.includes('^ {2}([A-Za-z0-9_-]+):');
    const slicesDynamicJobMarker = subject.includes('.indexOf(`  ${');
    const walksArtifactSteps =
      subject.includes('function scanDeliveryEvidenceDownloads') && subject.includes('text.split(/\\r?\\n/u)');
    if (readsJobHeader || slicesDynamicJobMarker || walksArtifactSteps) {
      sites.push(file.path.replaceAll('\\', '/'));
    }
  }
  return sites.sort();
}

function withoutFunctionThroughNextDoc(text: string, declaration: string): string {
  const start = text.indexOf(declaration);
  if (start === -1) return text;
  const nextDoc = text.indexOf('\n/**', start + declaration.length);
  return nextDoc === -1 ? text.slice(0, start) : `${text.slice(0, start)}${text.slice(nextDoc)}`;
}

const IMMUTABLE_REF = /^[0-9a-f]{40}$/i;

/** Reviewed action repositories admitted by LiteShip's workflow trust policy. */
export const TRUSTED_ACTION_SOURCES: ReadonlySet<string> = new Set([
  'actions/attest-build-provenance',
  // The verdict-bank persistence for the exhaustive campaigns (run
  // 30579292227: the census exceeds one job; `.liteship/cache` must survive
  // between nightlies). GitHub-first-party, SHA-pinned like every entry here.
  // The SPLIT sub-actions, deliberately not the combined `actions/cache`: its
  // save hook is `post-if: success()` and a budget-exhausted campaign exits 1,
  // so only an explicit always() save step banks a red run (PR #194 review).
  'actions/cache/restore',
  'actions/cache/save',
  'actions/checkout',
  'actions/download-artifact',
  'actions/setup-node',
  'actions/upload-artifact',
  'dtolnay/rust-toolchain',
  'github/codeql-action/init',
  'github/codeql-action/analyze',
  'pnpm/action-setup',
]);

/** Local reusable workflows are source-bound by the checkout; external actions require a SHA. */
export function scanWorkflowActionPins(text: string): readonly WorkflowActionPinViolation[] {
  const unreadable = yamlShapeViolations(text).map((violation) => ({
    line: violation.line,
    content: violation.content,
    reason: 'unreadable-yaml' as const,
  }));
  if (unreadable.length > 0) return unreadable;
  const violations: WorkflowActionPinViolation[] = [];
  for (const field of workflowUseEntries(text)) {
    const reference = unquoteScalar(field.value);
    if (reference.startsWith('./')) continue;
    const at = reference.lastIndexOf('@');
    const source = at >= 0 ? reference.slice(0, at) : reference;
    const revision = at >= 0 ? reference.slice(at + 1) : '';
    if (!IMMUTABLE_REF.test(revision)) {
      violations.push({ line: field.line, content: field.content, reason: 'missing-immutable-revision' });
    } else if (!TRUSTED_ACTION_SOURCES.has(source)) {
      violations.push({ line: field.line, content: field.content, reason: 'untrusted-source' });
    }
  }
  return violations;
}

/**
 * THE CLASS RULE — expressions interpolated into a shell command.
 *
 * ANCHOR: every `${{ }}` expression in every step's `run:` field. ALLOWLIST:
 * only contexts whose roots are not attacker-controlled: exact step or need
 * outputs, matrix, secrets, env, and vars. `inputs` is NOT admitted —
 * workflow_call inputs are caller data, so they ride env: indirection.
 * GitHub event data is an open grammar (`github.event.*`, `github.head_ref`,
 * and future siblings), so a denylist loses by construction. An unclosed or
 * unclassifiable expression is a violation, never a skipped command.
 */
export function scanWorkflowExpressionInjection(text: string): readonly WorkflowActionPinViolation[] {
  const unreadable = yamlShapeViolations(text).map((violation) => ({
    line: violation.line,
    content: violation.content,
    reason: 'unreadable-yaml' as const,
  }));
  if (unreadable.length > 0) return unreadable;

  const violations: WorkflowActionPinViolation[] = [];
  for (const section of workflowJobSectionRecords(text).values()) {
    const lines = activeLinesOf(section.text, section.lineOffset);
    for (const stepIndex of stepIndicesOf(lines)) {
      const command = stepRunCommandOf(lines, stepIndex);
      if (!command.includes('${{')) continue;
      if (!commandExpressionsAreAdmissible(command)) {
        const step = lines[stepIndex]!;
        violations.push({ line: step.line, content: step.content, reason: 'expression-in-run' });
      }
    }
  }
  return violations;
}

function commandExpressionsAreAdmissible(command: string): boolean {
  let cursor = 0;
  while (cursor < command.length) {
    const start = command.indexOf('${{', cursor);
    if (start === -1) return true;
    const end = command.indexOf('}}', start + 3);
    if (end === -1) return false;
    const references = expressionReferencePaths(command.slice(start + 3, end));
    if (references === null || references.length === 0 || references.some((path) => !admissibleExpressionPath(path))) {
      return false;
    }
    cursor = end + 2;
  }
  return true;
}

/** Dotted identifier paths outside quoted literals; null means unclassifiable syntax. */
function expressionReferencePaths(expression: string): readonly (readonly string[])[] | null {
  const admittedFunctions = new Set(['fromJSON']);
  const paths: string[][] = [];
  let quote: "'" | '"' | null = null;
  let escaped = false;
  let parenthesisDepth = 0;
  let expectOperand = true;
  let pendingFunctionCall = false;
  for (let index = 0; index < expression.length;) {
    const character = expression[index]!;
    if (quote !== null) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) {
        quote = null;
        expectOperand = false;
      }
      index += 1;
      continue;
    }
    if (character === "'" || character === '"') {
      if (!expectOperand) return null;
      quote = character;
      index += 1;
      continue;
    }
    if (/\s/u.test(character)) {
      index += 1;
      continue;
    }
    if (character === '.') {
      if (expectOperand || expression[index - 1] !== ')' || !/[A-Za-z_]/u.test(expression[index + 1] ?? '')) {
        return null;
      }
      index += 1;
      continue;
    }
    const binaryOperator = /^(?:&&|\|\||==|!=|<=|>=)/u.exec(expression.slice(index));
    if (binaryOperator !== null) {
      if (expectOperand) return null;
      expectOperand = true;
      index += binaryOperator[0].length;
      continue;
    }
    if (character === '!') {
      if (!expectOperand) return null;
      index += 1;
      continue;
    }
    if (character === '<' || character === '>') {
      if (expectOperand) return null;
      expectOperand = true;
      index += 1;
      continue;
    }
    if (/[0-9]/u.test(character)) {
      if (!expectOperand) return null;
      const number = /^[0-9]+(?:\.[0-9]+)?/u.exec(expression.slice(index));
      if (number === null) return null;
      expectOperand = false;
      index += number[0].length;
      continue;
    }
    if (character === '(') {
      if (!pendingFunctionCall || !expectOperand) return null;
      pendingFunctionCall = false;
      parenthesisDepth += 1;
      index += 1;
      continue;
    }
    if (character === ')') {
      if (parenthesisDepth === 0 || expectOperand || pendingFunctionCall) return null;
      parenthesisDepth -= 1;
      expectOperand = false;
      index += 1;
      continue;
    }
    if (character === ',') {
      if (parenthesisDepth === 0 || expectOperand) return null;
      expectOperand = true;
      index += 1;
      continue;
    }
    if (!/[A-Za-z_]/u.test(character)) {
      return null;
    }
    const isCallResultProperty = expression[index - 1] === '.';
    const segments: string[] = [];
    let end = index + 1;
    while (end < expression.length && /[A-Za-z0-9_-]/u.test(expression[end]!)) end += 1;
    segments.push(expression.slice(index, end));
    while (expression[end] === '.') {
      const segmentStart = end + 1;
      if (!/[A-Za-z_]/u.test(expression[segmentStart] ?? '')) return null;
      end = segmentStart + 1;
      while (end < expression.length && /[A-Za-z0-9_-]/u.test(expression[end]!)) end += 1;
      segments.push(expression.slice(segmentStart, end));
    }
    let next = end;
    while (/\s/u.test(expression[next] ?? '')) next += 1;
    if (!isCallResultProperty) {
      if (!expectOperand) return null;
      if (segments.length === 1 && expression[next] !== '(' && !['true', 'false', 'null'].includes(segments[0]!)) {
        return null;
      }
      if (segments.length === 1 && expression[next] === '(') {
        if (!admittedFunctions.has(segments[0]!)) return null;
        pendingFunctionCall = true;
      } else {
        expectOperand = false;
        if (segments.length > 1) paths.push(segments);
      }
    } else if (expectOperand) {
      return null;
    }
    index = end;
  }
  return quote === null && parenthesisDepth === 0 && !pendingFunctionCall && !expectOperand ? paths : null;
}

function admissibleExpressionPath(path: readonly string[]): boolean {
  const root = path[0];
  if (root === 'steps' || root === 'needs') return path.length >= 4 && path[2] === 'outputs';
  // `inputs` is deliberately absent: workflow_call inputs are caller data
  // (a caller can pipe event text straight through), and GitHub substitutes
  // the value before shell parsing. Caller data rides env: indirection.
  return path.length >= 2 && ['matrix', 'secrets', 'env', 'vars'].includes(root ?? '');
}

/**
 * The exhaustive-campaign cache-persistence contract (PR #194 review,
 * confirmed P1): the combined `actions/cache` declares its save hook
 * `post-if: success()`, and a budget-exhausted campaign exits 1 by design
 * (inconclusive findings red the gates) — the combined action would NEVER
 * save and every nightly would restart from the same old bank. Each named
 * job must RESTORE via `actions/cache/restore`, SAVE via an explicit
 * `actions/cache/save` step under `if: always()`, and carry NO combined
 * `actions/cache` use. Returns one violation string per broken job.
 */
export function scanExhaustiveCachePersistence(text: string, jobs: readonly string[]): readonly string[] {
  const violations: string[] = [...unreadableYamlViolations(text)];
  if (violations.length > 0) return violations;
  const sections = workflowSectionsForScan(text);
  for (const job of jobs) {
    const section = campaignJobSection(sections, job);
    if (section === null) {
      violations.push(`${job}: job not found`);
      continue;
    }
    const lines = activeLinesOf(section);
    const saves: Array<{ readonly key: string; readonly path: string | null }> = [];
    const restores: Array<{ readonly prefixes: readonly string[]; readonly path: string | null }> = [];
    let sawSave = false;
    let sawRestore = false;
    for (const step of stepIndicesOf(lines)) {
      // The step's uses FIELD decides its role — live steps are written as
      // `- name:` bullets with uses: on a child line, and a bullet-spelling
      // detector skipped every one of them (PR #196 review round 5,
      // confirmed P2: the per-key validation went vacuous while the coarse
      // presence checks stayed green).
      const uses = stepFieldOf(lines, step, 'uses: ');
      if (uses === null) continue;
      const isSave = /^actions\/cache\/save@[0-9a-f]{40}/u.test(uses);
      const isRestore = /^actions\/cache\/restore@[0-9a-f]{40}/u.test(uses);
      if (/^actions\/cache@[0-9a-f]{40}/u.test(uses)) {
        violations.push(`${job}: combined actions/cache present — its post-if: success() save skips red runs`);
      }
      if (!isSave && !isRestore) continue;
      sawSave ||= isSave;
      sawRestore ||= isRestore;
      const withIndex = childIndicesOf(lines, step).find((c) => mappingKeyIs(lines[c]!.body, 'with'));
      const withChildren = withIndex === undefined ? [] : childIndicesOf(lines, withIndex);
      if (isSave) {
        // The always() condition binds to EACH save step — a decoy always()
        // save elsewhere in the job must not shield a success()-gated bank
        // save (PR #196 review round 13, confirmed P2: the job-wide regex
        // was satisfied by any single always() save).
        const condition = stepFieldOf(lines, step, 'if: ');
        if (condition === null || !stepConditionIsUnconditional(condition)) {
          violations.push(
            `${job}: cache save step is not gated if: always() — a red campaign never banks this step's verdicts`,
          );
        }
        // GitHub cache keys are immutable per scope: a re-run attempt saving
        // under a run_id-only key finds it reserved by attempt 1 and banks
        // NOTHING (PR #195 review, confirmed). Only a DIRECT child key: of
        // with: names the immutable save key — an env.key decoy or a key:
        // line inside a block scalar must not satisfy the contract, and a
        // step without a with.key stays a violation (PR #196 review rounds
        // 2–3, confirmed P2s: every looser text match failed OPEN).
        const key = withChildren.map((c) => lines[c]!.body).find((body) => body.startsWith('key: '));
        if (key === undefined) {
          violations.push(`${job}: cache save step has no with.key — the attempt-qualification contract is unprovable`);
        } else if (!normalizeExpressions(uncommentedScalar(key)).includes('${{ github.run_attempt }}')) {
          violations.push(
            `${job}: cache save key lacks github.run_attempt — a re-run attempt cannot bank its verdicts`,
          );
        } else if (!normalizeExpressions(uncommentedScalar(key)).includes('${{ github.run_id }}')) {
          // run_attempt restarts at 1 for every workflow run — without the
          // run id, a later run collides with the first run's immutable key
          // and banks nothing (PR #196 review round 10, confirmed P2).
          violations.push(
            `${job}: cache save key lacks github.run_id — a later run collides with the first run's reserved key`,
          );
        } else {
          saves.push({
            key: normalizeExpressions(uncommentedScalar(key)).slice(5),
            path: withPathOf(lines, withChildren),
          });
        }
      } else {
        if (!stepConditionIsUnconditional(stepFieldOf(lines, step, 'if: '))) {
          violations.push(`${job}: conditional cache restore step cannot discharge the persistence contract`);
          continue;
        }
        // Restore fallbacks are REQUIRED and ordered (rounds 3, 7, 8, 12):
        // attempt-qualified primaries can never exact-match a re-run, so a
        // restore without a non-empty restore-keys leaves banked work
        // unrecoverable; the FIRST entry must be run-scoped; every
        // HISTORICAL entry must come after its own same-run counterpart (a
        // re-run must never reach for an older bank of a namespace whose
        // same-run bank it never tried — attempt 2 picking the partial
        // attempt-1 shard slice over the completed attempt-1 merged fold);
        // and SOME run-scoped entry must prefix the restore's own primary,
        // or the same-run self-recovery it claims cannot happen.
        const rkIndex = withChildren.find((c) => lines[c]!.body.startsWith('restore-keys:'));
        const restoreKeysValue =
          rkIndex === undefined ? '' : uncommentedScalar(lines[rkIndex]!.body.slice('restore-keys:'.length).trim());
        const entries =
          rkIndex === undefined
            ? []
            : restoreKeysValue !== '' && !/^[|>][-+]?$/u.test(restoreKeysValue)
              ? [normalizeExpressions(unquoteScalar(restoreKeysValue))]
              : blockLinesOf(lines, rkIndex).map((line) =>
                  normalizeExpressions(uncommentedScalar(line.body.replace(/^- /u, ''))),
                );
        const primary = withChildren.map((c) => lines[c]!.body).find((body) => body.startsWith('key: '));
        const primaryKey = primary === undefined ? null : normalizeExpressions(uncommentedScalar(primary)).slice(5);
        if (entries.length === 0) {
          violations.push(
            `${job}: cache restore has no restore-keys fallback — an attempt-qualified primary can never exact-match a re-run, leaving banked work unrecoverable`,
          );
        } else if (!entries[0]!.includes('${{ github.run_id }}')) {
          violations.push(
            `${job}: restore-keys leads with a historical prefix — a re-run must prefer this run's own bank first`,
          );
        } else if (
          entries.some(
            (entry, index) =>
              !entry.includes('${{ github.run_id }}') &&
              !entries.slice(0, index).includes(`${entry}\${{ github.run_id }}-`),
          )
        ) {
          violations.push(
            `${job}: a historical fallback precedes its same-run counterpart — this run's own bank of that namespace must be tried first`,
          );
        } else if (
          primaryKey === null ||
          !entries.some((entry) => entry.includes('${{ github.run_id }}') && primaryKey.startsWith(entry))
        ) {
          violations.push(
            `${job}: no run-scoped restore-keys entry is inside its own key namespace — the same-run fallback can never recover this restore's bank`,
          );
        } else {
          restores.push({
            prefixes: entries.filter((entry) => entry.includes('${{ github.run_id }}')),
            path: withPathOf(lines, withChildren),
          });
        }
      }
    }
    if (!sawRestore) {
      violations.push(`${job}: no actions/cache/restore step — the verdict bank is never restored`);
    }
    if (!sawSave) {
      violations.push(`${job}: no always() actions/cache/save step — a red campaign never banks its verdicts`);
    }
    // Every saved namespace must be one some restore RECOVERS: a job that
    // saves bank-* while only restoring wrong-* passes every per-step check
    // yet no re-run ever restores the bank it banks (PR #196 review round
    // 10, confirmed P2). And the pair must share its with.path —
    // actions/cache folds the path list into the archive VERSION, so a
    // matching key over a different path still restores nothing (round 11,
    // confirmed P2).
    for (const saved of saves) {
      const namespaceMatches = restores.filter((restore) =>
        restore.prefixes.some((prefix) => saved.key.startsWith(prefix)),
      );
      if (namespaceMatches.length === 0) {
        violations.push(
          `${job}: a saved bank namespace is never restored — no restore-keys first prefix recovers what this job saves`,
        );
      } else if (
        !namespaceMatches.some((restore) => restore.path !== null && saved.path !== null && restore.path === saved.path)
      ) {
        violations.push(
          `${job}: a saved bank's path has no matching restore — actions/cache versions the archive by path, so the pair can never exchange it`,
        );
      }
    }
  }
  return violations;
}

/** A comment-free, blank-free view of a YAML fragment: indentation plus trimmed body per line. */
export interface ActiveLine {
  readonly indent: number;
  readonly body: string;
  readonly line: number;
  readonly content: string;
}

/**
 * A YAML line with any inline plain-scalar comment removed — the runner
 * excludes ` #...` from the effective value, so comment text must never
 * satisfy a key or knob contract (PR #196 review round 4, confirmed P2: an
 * attempt token inside a trailing comment passed the immutable-key check
 * while the real key stayed run-id-only). Stripping inside a quoted scalar
 * would only fail CLOSED — a legitimate value reads as non-compliant.
 */
function uncommentedScalar(body: string): string {
  const cut = body.indexOf(' #');
  return (cut === -1 ? body : body.slice(0, cut)).trim();
}

/** A block-mapping key stays the same key when followed by an inert YAML comment. */
function mappingKeyIs(body: string, key: string): boolean {
  return uncommentedScalar(body) === `${key}:`;
}

/** A scalar with surrounding quotes removed after its inline comment is stripped. */
function unquoteScalar(body: string): string {
  const value = uncommentedScalar(body);
  if (
    value.length >= 2 &&
    ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"')))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

/** Collapse legal whitespace variations inside GitHub expression delimiters. */
function normalizeExpressions(value: string): string {
  return value.replace(/\$\{\{\s*(.*?)\s*\}\}/gu, (_whole, expression: string) => {
    const normalized = expression.trim().replace(/\s+/gu, ' ');
    return `\${{ ${normalized} }}`;
  });
}

export function activeLinesOf(text: string, lineOffset = 0): readonly ActiveLine[] {
  const lines: ActiveLine[] = [];
  for (const [index, source] of text.split('\n').entries()) {
    const raw = source.replace(/\r$/u, '');
    const body = raw.trim();
    if (body.length === 0 || body.startsWith('#')) continue;
    lines.push({ indent: /^ */u.exec(raw)![0].length, body, line: lineOffset + index + 1, content: body });
  }
  return lines;
}

/** Every line nested under lines[index] — deeper indentation until the first sibling or dedent. */
function blockLinesOf(lines: readonly ActiveLine[], index: number): readonly ActiveLine[] {
  const parent = lines[index]!.indent;
  const block: ActiveLine[] = [];
  for (let i = index + 1; i < lines.length && lines[i]!.indent > parent; i++) block.push(lines[i]!);
  return block;
}

/**
 * Indices of the DIRECT children of lines[index]: the shallowest indentation
 * level inside its block. Deeper lines are nested mappings or block-scalar
 * content and never satisfy a direct-child contract.
 */
export function childIndicesOf(lines: readonly ActiveLine[], index: number): readonly number[] {
  const parent = lines[index]!.indent;
  let end = index + 1;
  while (end < lines.length && lines[end]!.indent > parent) end++;
  let childIndent = Number.POSITIVE_INFINITY;
  for (let i = index + 1; i < end; i++) childIndent = Math.min(childIndent, lines[i]!.indent);
  const children: number[] = [];
  for (let i = index + 1; i < end; i++) if (lines[i]!.indent === childIndent) children.push(i);
  return children;
}

/**
 * One top-level job's text, keyed by exact job id, for every job under
 * `jobs:`. Missing structural authority is refused rather than interpreted
 * as an empty workflow.
 */
export function workflowJobSections(text: string): ReadonlyMap<string, string> {
  return new Map([...workflowJobSectionRecords(text)].map(([name, record]) => [name, record.text] as const));
}

interface WorkflowJobSectionRecord {
  readonly text: string;
  readonly lineOffset: number;
}

// The line index of the top-level `jobs:` mapping key, or -1. A trailing
// comment is inert exactly as on every other mapping key; an indented
// `jobs:` belongs to some other mapping and never confers authority.
// (Line comments, not TSDoc: this helper lives inside the reader-census
// self-exemption span, which runs from workflowJobSections through the
// next doc comment.)
function topLevelJobsIndex(lines: readonly string[]): number {
  return lines.findIndex((line) => !/^\s/u.test(line) && mappingKeyIs(line, 'jobs'));
}

function workflowJobSectionRecords(text: string): ReadonlyMap<string, WorkflowJobSectionRecord> {
  const lines = text.split('\n').map((line) => line.replace(/\r$/u, ''));
  const jobsIndex = topLevelJobsIndex(lines);
  if (jobsIndex === -1) {
    throw workflowValidationError('workflow.jobs', 'workflow must declare a top-level jobs: mapping');
  }
  let jobsEnd = lines.length;
  for (let index = jobsIndex + 1; index < lines.length; index++) {
    const body = lines[index]!.trim();
    if (body !== '' && !body.startsWith('#') && /^\S/u.test(lines[index]!)) {
      jobsEnd = index;
      break;
    }
  }
  const headers: Array<{ readonly name: string; readonly line: number }> = [];
  for (let index = jobsIndex + 1; index < jobsEnd; index++) {
    // A trailing comment is inert YAML and therefore part of the admitted
    // block-mapping spelling, not a reason to lose the next-job boundary.
    const match = /^ {2}([A-Za-z0-9_-]+):(?:\s+#.*)?\s*$/u.exec(lines[index]!);
    if (match !== null) headers.push({ name: match[1]!, line: index });
  }
  const sections = new Map<string, WorkflowJobSectionRecord>();
  for (let index = 0; index < headers.length; index++) {
    const header = headers[index]!;
    const end = headers[index + 1]?.line ?? jobsEnd;
    if (sections.has(header.name)) {
      throw workflowValidationError('workflow.jobs', `workflow declares duplicate top-level job id "${header.name}"`);
    }
    sections.set(header.name, { text: lines.slice(header.line, end).join('\n'), lineOffset: header.line });
  }
  return sections;
}

/**
 * THE CLASS RULE — workflow YAML reader completeness.
 *
 * ANCHOR: every active line visited by this dependency-free block-mapping
 * reader. ALLOWLIST: ordinary block mappings, block sequences, and block
 * scalars. Flow collections, aliases, merge keys, tab indentation, malformed
 * carriage returns, and duplicate sibling keys are outside that closed
 * grammar. An unclassified spelling is a violation; it is never skipped.
 */
export function unreadableYamlViolations(text: string): readonly string[] {
  return yamlShapeViolations(text).map(
    (violation) => `workflow line ${violation.line}: ${violation.message}: ${violation.content}`,
  );
}

function yamlShapeViolations(text: string): readonly YamlShapeViolation[] {
  const violations: YamlShapeViolation[] = [];
  const lines = text.split('\n');
  const siblingKeys = new Map<string, Map<string, number>>();
  const parents: Array<{ readonly indent: number; readonly identity: string }> = [];
  let scalarIndent: number | null = null;
  for (let index = 0; index < lines.length; index++) {
    const original = lines[index]!;
    const raw = original.replace(/\r$/u, '');
    const line = index + 1;
    if (/\r/u.test(raw)) {
      violations.push({ line, content: raw.trim(), message: 'carriage return is not part of a CRLF line ending' });
    }
    if (/^\s*\t/u.test(raw) || /^ *\t/u.test(raw)) {
      violations.push({ line, content: raw.trim(), message: 'tab indentation is unreadable' });
    }
    const body = raw.trim();
    if (body === '' || body.startsWith('#')) continue;
    const indent = /^ */u.exec(raw)![0].length;
    if (scalarIndent !== null) {
      if (indent > scalarIndent) continue;
      scalarIndent = null;
    }
    while (parents.length > 0 && parents.at(-1)!.indent >= indent) parents.pop();
    const sequenceItem = /^-\s+/u.test(body);
    if (sequenceItem) parents.push({ indent, identity: `item:${line}` });
    const value = body.replace(/^-\s+/u, '');
    if (
      (sequenceItem && /^[{[]/u.test(value)) ||
      /^(?:uses|run|if|with|env|steps|timeout-minutes|key|path|restore-keys):\s*[{[]/u.test(value)
    ) {
      violations.push({ line, content: body, message: 'flow collection is outside the structural reader grammar' });
    }
    if (/^(?:[A-Za-z0-9_-]+:\s*)?\*[A-Za-z0-9_-]+(?:\s+#.*)?$/u.test(value)) {
      violations.push({ line, content: body, message: 'YAML aliases are outside the structural reader grammar' });
    }
    if (/^<<:/u.test(value)) {
      violations.push({ line, content: body, message: 'YAML merge keys are outside the structural reader grammar' });
    }
    // A quoted mapping key is valid YAML the structural readers cannot see:
    // stepRunCommandOf and the field walkers recognize only the unquoted
    // spelling, so admitting the quoted one would let `- "run": …` carry an
    // expression past every scanner. Fail closed instead (Codex review on
    // PR #197, confirmed P1).
    if (/^(?:"[^"]*"|'[^']*')\s*:(?:\s|$)/u.test(value)) {
      violations.push({
        line,
        content: body,
        message: 'quoted mapping keys are outside the structural reader grammar',
      });
    }
    const keyMatch = /^([A-Za-z0-9_-]+):/u.exec(value);
    if (keyMatch !== null) {
      const parent = parents.map((entry) => entry.identity).join('/');
      const byKey = siblingKeys.get(parent) ?? new Map<string, number>();
      const key = keyMatch[1]!;
      const first = byKey.get(key);
      if (first !== undefined) {
        violations.push({
          line,
          content: body,
          message: `duplicate key ${key} at one level (first declared on line ${first})`,
        });
      } else {
        byKey.set(key, line);
        siblingKeys.set(parent, byKey);
      }
      if (!sequenceItem) parents.push({ indent, identity: `${line}:${key}` });
    }
    if (/^.*:\s*[|>][-+]?\s*(?:#.*)?$/u.test(value)) scalarIndent = indent;
  }
  return violations;
}

function workflowSectionsForScan(text: string): ReadonlyMap<string, string> {
  if (topLevelJobsIndex(text.split(/\r?\n/u)) !== -1) return workflowJobSections(text);
  // Several focused scanner laws deliberately pass a job fragment instead
  // of a complete workflow. Give those fragments the same structural reader
  // by supplying only the absent authority wrapper.
  return workflowJobSections(`jobs:\n${text.replace(/^\r?\n/u, '')}`);
}

/** The job section of a workflow, from its key to the next top-level job key (two-space indent). */
function campaignJobSection(sections: ReadonlyMap<string, string>, job: string): string | null {
  return sections.get(job) ?? null;
}

/** The literal campaign invocation — the one command whose step owns the wall-budget env. */
export const CAMPAIGN_GATES_INVOCATION = 'pnpm exec tsx packages/cli/src/bin.ts check gates';

/** An 85-minute cold seam-coverage probe phase, measured in run 30606178745 (first heartbeat 07:04 vs step start 05:39). */
export const CAMPAIGN_COLD_PROBE_MS = 5_100_000;
/** ~9.5 minutes per census target, measured across 37 targets in run 30606178745. */
export const CAMPAIGN_TARGET_EVAL_MS = 570_000;
/** Setup before the gates run plus save/upload after it — both outside the wall-budget clock but inside timeout-minutes. */
export const CAMPAIGN_POST_STEP_MARGIN_MS = 900_000;

/**
 * The campaign wall-budget sizing contract (PR #195 review, confirmed): the
 * budget clock anchors at the top of the facts builders — BEFORE the probe
 * phase — so a budget smaller than a cold probe plus two targets folds the
 * whole census inconclusive at index 0 and mints nothing. And a budget too
 * close to timeout-minutes hands the kill to GitHub's backstop, which skips
 * the always() save/upload post-steps the banking design depends on.
 */
export function scanCampaignWallBudget(text: string, jobs: readonly string[]): readonly string[] {
  const violations: string[] = [...unreadableYamlViolations(text)];
  if (violations.length > 0) return violations;
  const sections = workflowSectionsForScan(text);
  for (const job of jobs) {
    const section = campaignJobSection(sections, job);
    if (section === null) {
      violations.push(`${job}: job not found`);
      continue;
    }
    // Both knobs are read at their OWNING YAML levels — a commented-out knob,
    // a step-level timeout-minutes, or an env on an unrelated step is a
    // MISSING knob, because GitHub applies none of them to the campaign
    // (PR #196 review rounds 2–3, confirmed P2s: every flat text search
    // accepted a knob the runner never honors).
    const lines = activeLinesOf(section);
    const jobChildren = childIndicesOf(lines, 0).map((c) => lines[c]!);
    const timeoutBody = jobChildren
      .map((line) => /^timeout-minutes:\s*(.*)$/u.exec(uncommentedScalar(line.body)))
      .find((match) => match !== null);
    const timeoutValue = timeoutBody === undefined ? null : unquoteScalar(timeoutBody[1]!);
    const timeout = timeoutValue !== null && /^\d+$/u.test(timeoutValue) ? timeoutValue : null;
    const budgets = campaignStepBudgets(lines, job.includes('mcdc') ? '--mcdc' : '--mutate');
    if (timeoutBody === undefined) {
      violations.push(`${job}: job-level timeout-minutes is missing — the budget contract is unenforceable`);
      continue;
    }
    if (timeout === null) {
      violations.push(`${job}: job-level timeout-minutes is present but is not an integer`);
      continue;
    }
    if (budgets.length === 0) {
      violations.push(`${job}: no qualifying campaign step invokes the gates — the budget contract has no subject`);
      continue;
    }
    for (const budget of budgets) {
      if (!budget.unconditional) {
        violations.push(
          `${job}: campaign step at line ${budget.line} is conditional and cannot discharge the budget contract`,
        );
      }
      if (budget.value === null) {
        violations.push(
          budget.declared
            ? `${job}: campaign step at line ${budget.line} declares a non-integer LITESHIP_CAMPAIGN_WALL_BUDGET_MS`
            : `${job}: campaign step at line ${budget.line} is missing LITESHIP_CAMPAIGN_WALL_BUDGET_MS`,
        );
        continue;
      }
      const budgetMs = Number(budget.value);
      if (budgetMs < CAMPAIGN_COLD_PROBE_MS + 2 * CAMPAIGN_TARGET_EVAL_MS) {
        violations.push(
          `${job}: wall budget ${budgetMs}ms cannot absorb a cold probe plus two targets — a cold run folds everything inconclusive and banks nothing`,
        );
      }
      // The budget is checked at the per-target BOUNDARY, so a target that
      // starts just under the budget runs to completion — the ceiling must
      // reserve a twice-measured in-flight allowance on top of the post-step
      // margin, or an ordinary ~9.5-minute target started at budget-1ms hands
      // the kill to GitHub's backstop before the always() save (PR #196
      // review round 6, confirmed P2).
      if (budgetMs + 2 * CAMPAIGN_TARGET_EVAL_MS + CAMPAIGN_POST_STEP_MARGIN_MS > Number(timeout) * 60_000) {
        violations.push(
          `${job}: wall budget ${budgetMs}ms leaves no in-flight-target and post-step margin under timeout-minutes ${timeout} — the backstop kill skips the always() save`,
        );
      }
    }
  }
  return violations;
}

/** Indices of the step bullets under the job's direct-child `steps:` mapping (lines[0] is the job key). */
export function stepIndicesOf(lines: readonly ActiveLine[]): readonly number[] {
  const stepsIndex = childIndicesOf(lines, 0).find((c) => mappingKeyIs(lines[c]!.body, 'steps'));
  return stepsIndex === undefined ? [] : childIndicesOf(lines, stepsIndex);
}

interface WorkflowUseEntry {
  readonly line: number;
  readonly content: string;
  readonly value: string;
  readonly lines?: readonly ActiveLine[];
  readonly stepIndex?: number;
}

function fieldEntryOf(
  lines: readonly ActiveLine[],
  ownerIndex: number,
  prefix: string,
): { readonly line: ActiveLine; readonly value: string } | null {
  const owner = lines[ownerIndex]!;
  const candidates = [
    { line: owner, body: owner.body.replace(/^- /u, '') },
    ...childIndicesOf(lines, ownerIndex).map((index) => ({ line: lines[index]!, body: lines[index]!.body })),
  ];
  const field = candidates.find((candidate) => candidate.body.startsWith(prefix));
  return field === undefined ? null : { line: field.line, value: field.body.slice(prefix.length) };
}

function workflowUseEntries(text: string): readonly WorkflowUseEntry[] {
  const sourceLines = text.split('\n').map((line) => line.replace(/\r$/u, ''));
  const entries: WorkflowUseEntry[] = [];
  if (topLevelJobsIndex(sourceLines) !== -1) {
    for (const section of workflowJobSectionRecords(text).values()) {
      const lines = activeLinesOf(section.text, section.lineOffset);
      const jobUse = fieldEntryOf(lines, 0, 'uses: ');
      if (jobUse !== null) {
        entries.push({ line: jobUse.line.line, content: jobUse.line.content, value: jobUse.value });
      }
      for (const stepIndex of stepIndicesOf(lines)) {
        const use = fieldEntryOf(lines, stepIndex, 'uses: ');
        if (use !== null) {
          entries.push({
            line: use.line.line,
            content: use.line.content,
            value: use.value,
            lines,
            stepIndex,
          });
        }
      }
    }
    return entries;
  }
  const hasStepsRoot = sourceLines.some((line) => line.trim() === 'steps:' && /^steps:/u.test(line));
  const prefix = hasStepsRoot ? 'synthetic:\n' : 'synthetic:\n  steps:\n';
  const indentation = hasStepsRoot ? '  ' : '    ';
  const lineOffset = hasStepsRoot ? -1 : -2;
  const section = `${prefix}${sourceLines.map((line) => `${indentation}${line}`).join('\n')}`;
  const lines = activeLinesOf(section, lineOffset);
  for (const stepIndex of stepIndicesOf(lines)) {
    const use = fieldEntryOf(lines, stepIndex, 'uses: ');
    if (use !== null) {
      entries.push({
        line: use.line.line,
        content: use.line.content,
        value: use.value,
        lines,
        stepIndex,
      });
    }
  }
  return entries;
}

/**
 * A step's direct-child field value for a `field: ` prefix — read from the
 * bullet line itself (`- uses: x`) or a direct-child line (`uses: x` under a
 * `- name:` bullet). Never from nested blocks, so a decoy in a block scalar
 * or sub-mapping cannot impersonate the field.
 */
function stepFieldOf(lines: readonly ActiveLine[], stepIndex: number, prefix: string): string | null {
  return fieldEntryOf(lines, stepIndex, prefix)?.value ?? null;
}

/**
 * The step's run COMMAND: an inline scalar's value, or the joined content of
 * its `run: |` block. A step is only the campaign step when this command
 * invokes the gates — a step merely named after the campaign, or echoing its
 * name, never qualifies (PR #196 review round 5, confirmed P2).
 */
export function stepRunCommandOf(lines: readonly ActiveLine[], stepIndex: number): string {
  const bullet = lines[stepIndex]!.body.replace(/^- /u, '');
  if (bullet.startsWith('run:')) {
    const value = bullet.slice(4).trim();
    // A bullet-inline `- run: |` scalar ends at the step's FIELD indent
    // (bullet indent + 2) — sibling fields and their block scalars are not
    // command text (PR #196 review round 9, confirmed P2: an if: | block
    // mentioning the invocation leaked into the command).
    return /^[|>]/u.test(value) || value === ''
      ? scalarLinesUnder(lines, stepIndex, lines[stepIndex]!.indent + 2)
      : value;
  }
  const runIndex = childIndicesOf(lines, stepIndex).find((c) => lines[c]!.body.startsWith('run:'));
  if (runIndex === undefined) return '';
  const value = lines[runIndex]!.body.slice(4).trim();
  return /^[|>]/u.test(value) || value === '' ? scalarLinesUnder(lines, runIndex, lines[runIndex]!.indent) : value;
}

/** The with.path value of a cache step — inline scalar or joined block-scalar content; null when absent. */
function withPathOf(lines: readonly ActiveLine[], withChildren: readonly number[]): string | null {
  const index = withChildren.find((c) => lines[c]!.body.startsWith('path:'));
  if (index === undefined) return null;
  const value = uncommentedScalar(lines[index]!.body.slice(5).trim());
  return /^[|>]/u.test(value) || value === '' ? scalarLinesUnder(lines, index, lines[index]!.indent) : value;
}

/** Block-scalar content after lines[index]: every following line strictly deeper than boundaryIndent. */
function scalarLinesUnder(lines: readonly ActiveLine[], index: number, boundaryIndent: number): string {
  const content: string[] = [];
  for (let i = index + 1; i < lines.length && lines[i]!.indent > boundaryIndent; i++) content.push(lines[i]!.body);
  return content.join('\n');
}

/**
 * The wall-budget env value declared on the CAMPAIGN step — the step whose
 * run command invokes `check gates` — or null when no such step declares it.
 * An env on any other step never reaches the campaign process, so it must
 * not satisfy the contract (PR #196 review rounds 3 and 5, confirmed P2s).
 */
interface CampaignStepBudget {
  readonly value: string | null;
  readonly declared: boolean;
  readonly line: number;
  readonly unconditional: boolean;
}

function stepConditionIsUnconditional(condition: string | null): boolean {
  if (condition === null) return true;
  const value = normalizeExpressions(uncommentedScalar(condition));
  return value === 'always()' || value === '${{ always() }}';
}

function campaignStepBudgets(lines: readonly ActiveLine[], modeFlag: string): readonly CampaignStepBudget[] {
  const budgets: CampaignStepBudget[] = [];
  // GitHub inherits job env into every step. Workflow-level env deliberately
  // remains outside this reader's admitted grammar.
  const jobEnvIndex = childIndicesOf(lines, 0).find((child) => mappingKeyIs(lines[child]!.body, 'env'));
  const jobBudget = campaignBudgetFieldOf(lines, jobEnvIndex);
  for (const stepIndex of stepIndicesOf(lines)) {
    // An INVOCATION, not a mention: only a command line that STARTS with the
    // literal gates invocation qualifies — `echo check gates`, a name, or an
    // argument to another tool never does (PR #196 review round 8, confirmed
    // P2). And it must carry the JOB'S OWN mode flag as an argument token —
    // a budgeted lean gates step must not stand in for the exhaustive one
    // (round 9, confirmed P2).
    // The invocation ends at a TOKEN BOUNDARY — `check gates-extra` is a
    // different command (round 12, confirmed P2).
    const invokes = stepRunCommandOf(lines, stepIndex)
      .split('\n')
      .some(
        (line) =>
          (line === CAMPAIGN_GATES_INVOCATION || line.startsWith(`${CAMPAIGN_GATES_INVOCATION} `)) &&
          line.split(/\s+/u).includes(modeFlag),
      );
    if (!invokes) continue;
    const envIndex = childIndicesOf(lines, stepIndex).find((c) => mappingKeyIs(lines[c]!.body, 'env'));
    const stepBudget = campaignBudgetFieldOf(lines, envIndex);
    const selectedBudget = stepBudget.declared ? stepBudget : jobBudget;
    budgets.push({
      value: selectedBudget.value,
      declared: selectedBudget.declared,
      line: lines[stepIndex]!.line,
      unconditional: stepConditionIsUnconditional(stepFieldOf(lines, stepIndex, 'if: ')),
    });
  }
  return budgets;
}

interface CampaignBudgetField {
  readonly declared: boolean;
  readonly value: string | null;
}

function campaignBudgetFieldOf(lines: readonly ActiveLine[], envIndex: number | undefined): CampaignBudgetField {
  if (envIndex === undefined) return { declared: false, value: null };
  const body = childIndicesOf(lines, envIndex)
    .map((child) => lines[child]!.body)
    .find((line) => line.startsWith('LITESHIP_CAMPAIGN_WALL_BUDGET_MS:'));
  if (body === undefined) return { declared: false, value: null };
  const value = unquoteScalar(body.slice('LITESHIP_CAMPAIGN_WALL_BUDGET_MS:'.length));
  return { declared: true, value: /^\d+$/u.test(value) ? value : null };
}

/** A checkout step is safe only when it explicitly declines credential persistence. */
export function scanWorkflowCheckoutCredentials(text: string): readonly WorkflowActionPinViolation[] {
  const unreadable = yamlShapeViolations(text).map((violation) => ({
    line: violation.line,
    content: violation.content,
    reason: 'unreadable-yaml' as const,
  }));
  if (unreadable.length > 0) return unreadable;
  const violations: WorkflowActionPinViolation[] = [];
  for (const use of workflowUseEntries(text)) {
    if (!/^actions\/checkout@[0-9a-f]{40}$/iu.test(unquoteScalar(use.value))) continue;
    let safe = false;
    if (use.lines !== undefined && use.stepIndex !== undefined) {
      const withIndex = childIndicesOf(use.lines, use.stepIndex).find((index) =>
        mappingKeyIs(use.lines![index]!.body, 'with'),
      );
      if (withIndex !== undefined) {
        const persisted = childIndicesOf(use.lines, withIndex)
          .map((index) => use.lines![index]!.body)
          .find((body) => body.startsWith('persist-credentials:'));
        safe = persisted !== undefined && uncommentedScalar(persisted.slice('persist-credentials:'.length)) === 'false';
      }
    }
    if (!safe) {
      violations.push({ line: use.line, content: use.content, reason: 'credentials-persisted' });
    }
  }
  return violations;
}
