/** Ordered, resource-bounded declaration and TypeDoc projection. @module */

import type { LocalResourcePlan } from './local-resource-profile.js';
import { withAdmittedNodeHeap } from './local-resource-profile.js';
import { spawnArgv, type SpawnArgvOpts, type SpawnResult } from './spawn.js';

export type TypeDocBuildRunner = (
  command: string,
  args: readonly string[],
  options: SpawnArgvOpts,
) => Promise<SpawnResult>;

export interface TypeDocBuildPipelineInput {
  readonly repoRoot: string;
  readonly tempDir: string;
  readonly plan: Pick<LocalResourcePlan, 'nativeTypeScriptWorkers' | 'docs'>;
  readonly run?: TypeDocBuildRunner;
  readonly environment?: NodeJS.ProcessEnv;
}

function restoreEnvironment(environment: NodeJS.ProcessEnv, key: string, inherited: string | undefined): void {
  if (inherited === undefined) delete environment[key];
  else environment[key] = inherited;
}

/**
 * Refresh declaration inputs before TypeDoc projects committed truth.
 *
 * The liteship facade re-exports package-owned declarations, so TypeDoc follows
 * parts of that graph through dist/. A warm but stale dist/ tree can otherwise
 * mint documentation that disagrees with the same sources on a cold CI host.
 */
export async function runTypeDocBuildPipeline(input: TypeDocBuildPipelineInput): Promise<void> {
  const run = input.run ?? spawnArgv;
  const environment = input.environment ?? process.env;
  const options = { cwd: input.repoRoot, stdio: 'inherit' } as const;

  const inheritedWorkers = environment.LITESHIP_NATIVE_TSC_WORKERS;
  environment.LITESHIP_NATIVE_TSC_WORKERS = String(input.plan.nativeTypeScriptWorkers);
  let declarations: SpawnResult;
  try {
    declarations = await run('pnpm', ['exec', 'tsx', 'scripts/native-tsc.ts', '--', '--build'], options);
  } finally {
    restoreEnvironment(environment, 'LITESHIP_NATIVE_TSC_WORKERS', inheritedWorkers);
  }
  if (declarations.exitCode !== 0) {
    throw new Error('declaration build exited ' + String(declarations.exitCode));
  }

  const inheritedNodeOptions = environment.NODE_OPTIONS;
  environment.NODE_OPTIONS = withAdmittedNodeHeap(inheritedNodeOptions, input.plan.docs.heapMiB);
  let typedoc: SpawnResult;
  try {
    typedoc = await run('pnpm', ['exec', 'typedoc', '--out', input.tempDir], options);
  } finally {
    restoreEnvironment(environment, 'NODE_OPTIONS', inheritedNodeOptions);
  }
  if (typedoc.exitCode !== 0) throw new Error('TypeDoc exited ' + String(typedoc.exitCode));
}
