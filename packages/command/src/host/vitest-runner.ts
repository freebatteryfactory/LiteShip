/**
 * VitestRunner runtime — shell-free spawn of `pnpm exec vitest run <files>`.
 * The host capability the verify commands (capsule/asset/scene) use to run a
 * capsule's generated tests. The capsule *declaration* (`cli.vitest-runner`,
 * walked into the manifest) stays in `@liteship/cli`; this is just the callable.
 *
 * @module
 */
import { spawnArgv } from './spawn.js';

/** Input shape accepted by {@link VitestRunner.run}. */
export interface VitestRunInput {
  readonly testFiles: readonly string[];
}

/** Output shape returned by {@link VitestRunner.run}. */
export interface VitestRunOutput {
  readonly exitCode: number;
  readonly testFiles: readonly string[];
  readonly stderrTail: string;
}

/** Runtime callable for the vitest-runner capsule. */
export const VitestRunner = {
  run: async (input: VitestRunInput): Promise<VitestRunOutput> => {
    const result = await spawnArgv('pnpm', ['exec', 'vitest', 'run', ...input.testFiles]);
    return {
      exitCode: result.exitCode,
      testFiles: input.testFiles,
      stderrTail: result.stderrTail,
    };
  },
} as const;

export declare namespace VitestRunner {
  /** Input shape accepted by {@link VitestRunner.run}. */
  export type Input = VitestRunInput;
  /** Output shape returned by {@link VitestRunner.run}. */
  export type Output = VitestRunOutput;
}
