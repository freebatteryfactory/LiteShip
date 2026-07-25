/** Pure local-verification plan used by both humans and agents. @module */

export interface LocalVerificationStep {
  readonly label: string;
  readonly argv: readonly string[];
  readonly remedy: string;
}

export interface LocalVerificationPlan {
  readonly schema: 'liteship/local-verification-plan@1';
  readonly mode: 'workspace' | 'staged';
  readonly docsReason: 'workspace-authority' | 'staged-docs-input' | 'not-affected';
  readonly steps: readonly LocalVerificationStep[];
}

const STATIC_STEPS: readonly LocalVerificationStep[] = Object.freeze([
  Object.freeze({
    label: 'format:check',
    argv: Object.freeze(['run', 'format:check']),
    remedy: "run 'pnpm run format' to auto-fix, then re-run preflight",
  }),
  Object.freeze({
    label: 'lint:structural',
    argv: Object.freeze(['run', 'lint:structural']),
    remedy: "fix the ast-grep finding above, then re-run 'pnpm run lint:structural'",
  }),
  Object.freeze({
    label: 'lint',
    argv: Object.freeze(['run', 'lint']),
    remedy: "run 'pnpm run fix' (format + eslint --fix), then re-run preflight",
  }),
  Object.freeze({
    label: 'typecheck',
    argv: Object.freeze(['run', 'typecheck']),
    remedy: 'fix the native TypeScript errors above (build + scripts + tests projects)',
  }),
  Object.freeze({
    label: 'check-invariants',
    argv: Object.freeze(['exec', 'tsx', 'packages/cli/src/bin.ts', 'check-invariants']),
    remedy: 'fix the reported invariant violation, then re-run preflight',
  }),
]);

const DOCS_STEP: LocalVerificationStep = Object.freeze({
  label: 'docs:check',
  argv: Object.freeze(['run', 'docs:check:local']),
  remedy: "run 'pnpm run docs:build' and commit docs/api/ if the public API projection changed",
});

const DOCS_INPUT_PATTERNS: readonly RegExp[] = Object.freeze([
  /^packages\/[^/]+\/src\/.*\.ts$/u,
  /^packages\/_spine\/.*\.d\.ts$/u,
  /^packages\/_spine\/typedoc-entry\.ts$/u,
  /^typedoc\.json$/u,
  /^docs\/api(?:\/|$)/u,
]);

function normalizeRepoPath(path: string): string {
  return path.replaceAll('\\', '/').replace(/^\.\//u, '');
}

/** Whether a changed path can alter the committed TypeDoc projection. */
export function isTypeDocProofInput(path: string): boolean {
  const normalized = normalizeRepoPath(path);
  return DOCS_INPUT_PATTERNS.some((pattern) => pattern.test(normalized));
}

/** Build the exact fail-fast local plan without executing any command. */
export function buildLocalVerificationPlan(input: {
  readonly staged: boolean;
  readonly changedPaths?: readonly string[];
}): LocalVerificationPlan {
  const docsAffected = !input.staged || (input.changedPaths ?? []).some(isTypeDocProofInput);
  return Object.freeze({
    schema: 'liteship/local-verification-plan@1',
    mode: input.staged ? 'staged' : 'workspace',
    docsReason: !input.staged ? 'workspace-authority' : docsAffected ? 'staged-docs-input' : 'not-affected',
    steps: Object.freeze(docsAffected ? [...STATIC_STEPS, DOCS_STEP] : [...STATIC_STEPS]),
  });
}
