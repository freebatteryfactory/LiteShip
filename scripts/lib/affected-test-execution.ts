/** Pure execution projection for the affected Node-test authority. @module */

import { isNodeTestEntrypoint } from '../../packages/cli/src/internal/test-corpus.js';

export interface AffectedVitestExecution {
  readonly args: readonly string[];
  readonly junitPath?: string;
}

/** Materialize one affected plan as a shell-free Vitest argv. */
export function affectedVitestExecution(
  mode: 'full' | 'focused',
  testFiles: readonly string[],
  junitPath?: string,
): AffectedVitestExecution {
  if (mode === 'focused' && testFiles.length === 0) {
    throw new TypeError('focused affected-test execution requires at least one selected test');
  }
  const foreignEntrypoint = testFiles.find((path) => !isNodeTestEntrypoint(path));
  if (foreignEntrypoint !== undefined) {
    throw new TypeError(`affected-test execution received a non-Vitest entrypoint: ${foreignEntrypoint}`);
  }
  if (junitPath !== undefined && junitPath.trim().length === 0) {
    throw new TypeError('affected-test JUnit path must not be blank');
  }
  const reportArgs =
    junitPath === undefined ? [] : ['--reporter=default', '--reporter=junit', `--outputFile.junit=${junitPath}`];
  return {
    args: [
      'exec',
      'vitest',
      'run',
      '--config',
      'vitest.config.ts',
      ...(mode === 'focused' ? testFiles : []),
      ...reportArgs,
    ],
    ...(junitPath !== undefined ? { junitPath } : {}),
  };
}
