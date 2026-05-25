/**
 * version (CLI adapter) — thin projection over `@czap/command`'s version
 * command. The structured payload (czap/node/pnpm) is assembled in
 * `@czap/command`; this adapter injects the Node-coupled I/O (the CLI's own
 * package version + the pnpm spawn probe), then renders the JSON receipt to
 * stdout and a pretty one-liner to stderr.
 *
 * @module
 */

import { versionCommand, type VersionPayload } from '@czap/command';
import { spawnArgvCapture } from '../lib/spawn.js';
import { emit } from '../receipts.js';
import { readCliVersion } from './doctor.js';

/** Receipt shape emitted by `czap version`. */
export interface VersionReceipt {
  readonly status: 'ok';
  readonly command: 'version';
  readonly timestamp: string;
  readonly czap: string;
  readonly node: string;
  readonly pnpm: string | null;
}

/** Execute the version command. */
export async function version(opts: { pretty?: boolean; cwd?: string } = {}): Promise<number> {
  const result = await versionCommand.handler(
    { name: 'version', args: {} },
    {
      cwd: opts.cwd,
      hostVersion: () => readCliVersion(opts.cwd),
      spawnCapture: async (command, args) => {
        const r = await spawnArgvCapture(command, args).catch(() => null);
        return r ? { exitCode: r.exitCode, stdout: r.stdout } : { exitCode: 1, stdout: '' };
      },
    },
  );
  const payload = result.payload as VersionPayload;
  const receipt: VersionReceipt = {
    status: 'ok',
    command: 'version',
    timestamp: result.timestamp,
    czap: payload.czap,
    node: payload.node,
    pnpm: payload.pnpm,
  };
  emit(receipt);

  const wantPretty = opts.pretty ?? Boolean(process.stderr.isTTY);
  if (wantPretty) {
    process.stderr.write(`czap ${receipt.czap}  (Node ${receipt.node}, pnpm ${receipt.pnpm ?? 'not found'})\n`);
  }

  return 0;
}
