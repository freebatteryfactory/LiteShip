/** Repository TypeScript 7 launcher with a bounded native worker policy. @module */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnArgvVisibleWithEnv } from '../packages/command/src/host/launcher.js';
import { resolveNativeTypeScriptWorkers } from './lib/typescript-toolchain-qualification.js';

const bin = resolve('node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc');
if (!existsSync(bin)) {
  throw new Error('Native TypeScript bin is missing. Install the typescript-native dependency before building.');
}

const policy = resolveNativeTypeScriptWorkers({
  ci: process.env['CI'] === 'true',
  requested: process.env['LITESHIP_NATIVE_TSC_WORKERS'],
});
if (policy.requested < 1 || policy.requested > policy.ceiling) {
  throw new Error(
    `LITESHIP_NATIVE_TSC_WORKERS must be a positive integer no greater than the measured ceiling (${policy.ceiling}).`,
  );
}

const argv = process.argv.slice(2).filter((arg, index) => !(index === 0 && arg === '--'));
const result = await spawnArgvVisibleWithEnv(bin, argv, {
  cwd: process.cwd(),
  envAdditions: { GOMAXPROCS: String(policy.requested) },
});
process.exitCode = result.exitCode;
