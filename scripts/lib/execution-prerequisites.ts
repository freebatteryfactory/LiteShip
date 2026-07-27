/** Closed execution-prerequisite vocabulary shared by repository CI projections. @module */

/** A prerequisite identity. These describe executable setup, never assertion semantics. */
export type ExecutionPrerequisiteId =
  'install' | 'workspace-build' | 'browser-install' | 'wasm-build' | 'packed-artifacts' | 'coverage-inputs';

/** One executable prerequisite projected into a plan. */
export interface ExecutionPrerequisite {
  readonly id: ExecutionPrerequisiteId;
  readonly command: string;
  readonly claim: string;
}

/** The single authored prerequisite catalog. Plans reference these rows by identity. */
export const EXECUTION_PREREQUISITES = Object.freeze({
  install: {
    id: 'install',
    command: 'pnpm install --frozen-lockfile',
    claim: 'The frozen dependency graph is installed.',
  },
  'workspace-build': {
    id: 'workspace-build',
    command: 'pnpm run build',
    claim: 'Every source-level workspace runtime import has current executable output.',
  },
  'browser-install': {
    id: 'browser-install',
    command: 'pnpm exec playwright install --with-deps chromium chromium-headless-shell',
    claim: 'The selected browser authority has its pinned executable runtime.',
  },
  'wasm-build': {
    id: 'wasm-build',
    command: 'pnpm run build:wasm',
    claim: 'The WASM artifact under test was built from the current source.',
  },
  'packed-artifacts': {
    id: 'packed-artifacts',
    command: 'pnpm exec tsx scripts/build-release-artifacts.ts release-artifacts/tarballs',
    claim: 'The package authority materialized the immutable source-and-plan-bound tarball fleet.',
  },
  'coverage-inputs': {
    id: 'coverage-inputs',
    command: 'pnpm run coverage:merge-shards',
    claim: 'Every declared coverage shard is present and mergeable.',
  },
} as const satisfies Readonly<Record<ExecutionPrerequisiteId, ExecutionPrerequisite>>);

/** Resolve prerequisite ids through the one catalog and preserve declared order. */
export function executionPrerequisites(ids: readonly ExecutionPrerequisiteId[]): readonly ExecutionPrerequisite[] {
  return ids.map((id) => EXECUTION_PREREQUISITES[id]);
}
