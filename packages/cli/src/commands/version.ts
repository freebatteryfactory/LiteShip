/**
 * version (CLI adapter) — thin projection over `@liteship/command`'s version
 * command. The structured payload (liteship/node/pnpm) is assembled in
 * `@liteship/command`; this adapter injects the Node-coupled I/O (the CLI's own
 * package version + the pnpm spawn probe), then renders the JSON receipt to
 * stdout and a pretty one-liner to stderr.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCliCommand } from '../lib/run-command.js';
import { emit, type WallClockTimestamp } from '../receipts.js';

/** Receipt shape emitted by `liteship version`. */
export interface VersionReceipt {
  readonly status: 'ok';
  readonly command: 'version';
  readonly timestamp: WallClockTimestamp;
  readonly liteship: string;
  readonly node: string;
  readonly pnpm: string | null;
}

/**
 * The module-relative `packages/cli/package.json` candidate, or `undefined` when
 * `import.meta.url` is unavailable in an odd bundling/loader context. Isolating the
 * best-effort resolution here lets the caught failure record an explicit "no
 * module-relative candidate" fallback instead of swallowing the error silently —
 * non-corrupting, because `readCliVersion` still resolves a real version from the
 * cwd-relative candidates below.
 */
function moduleRelativePackageJson(): string | undefined {
  let candidate: string | undefined;
  try {
    const moduleDir = dirname(fileURLToPath(import.meta.url));
    candidate = resolve(moduleDir, '../../package.json');
  } catch {
    // import.meta.url unavailable (odd bundling/loader context) — record `undefined`
    // (no module-relative candidate) so the caller falls through to the cwd-relative
    // paths. Non-corrupting: a real version is still resolved from the workspace.
    candidate = undefined;
  }
  return candidate;
}

/**
 * Read the @liteship/cli package version off disk. This is `liteship version`'s own
 * logic (not doctoring), so it lives here beside its primary caller.
 *
 * Resolution order:
 *   1. Module-relative — `packages/cli/{src,dist}/commands/version.{ts,js}`
 *      back to the cli package.json is `../../package.json` either way.
 *      Works from any cwd (monorepo subdir, global install, external project).
 *   2. cwd-relative fallback — for test seams that pass a synthesized cwd
 *      containing a `packages/cli/package.json` or root `package.json`.
 *
 * Returns `'0.0.0-unknown'` only if every candidate fails (unusual: would
 * indicate the package was unpacked without its own package.json).
 */
export function readCliVersion(cwd?: string): string {
  const candidates: string[] = [];
  const moduleRelative = moduleRelativePackageJson();
  if (moduleRelative !== undefined) candidates.push(moduleRelative);
  const root = cwd ?? process.cwd();
  candidates.push(resolve(root, 'packages/cli/package.json'));
  candidates.push(resolve(root, 'package.json'));
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const pkg = JSON.parse(readFileSync(path, 'utf8')) as { name?: string; version?: string };
    if (pkg.name === '@liteship/cli' && typeof pkg.version === 'string') return pkg.version;
  }
  return '0.0.0-unknown';
}

/**
 * Execute the version command. The pnpm probe (`spawnCapture`) comes from the
 * shared host context; only the CLI's own `hostVersion` (its package version off
 * disk) is an adapter override. The typed `VersionPayload` arrives at the
 * projection with no cast.
 */
export async function version(opts: { pretty?: boolean; cwd?: string } = {}): Promise<number> {
  return runCliCommand(
    'version',
    {},
    { cwd: opts.cwd, overrides: { hostVersion: () => readCliVersion(opts.cwd) } },
    (payload, result) => {
      const receipt: VersionReceipt = {
        status: 'ok',
        command: 'version',
        timestamp: result.timestamp,
        liteship: payload.liteship,
        node: payload.node,
        pnpm: payload.pnpm,
      };
      emit(receipt);

      const wantPretty = opts.pretty ?? Boolean(process.stderr.isTTY);
      if (wantPretty) {
        process.stderr.write(
          `liteship ${receipt.liteship}  (Node ${receipt.node}, pnpm ${receipt.pnpm ?? 'not found'})\n`,
        );
      }

      return 0;
    },
  );
}
