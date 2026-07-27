/**
 * serverInfo — the `serverInfo` block @liteship/mcp-server returns from `initialize`
 * (CUT D1). Reads the real `@liteship/mcp-server` package version (mirrors the CLI's
 * `readCliVersion` pattern) rather than hardcoding a literal. Host-local: this is
 * the one spot the protocol skin touches the filesystem, and it is memoized so
 * the read happens once per process, not per handshake.
 *
 * @module
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { IoError } from '@liteship/error';

/** Server identity advertised in the MCP initialize response. */
export interface ServerInfo {
  readonly name: string;
  readonly version: string;
}

const PACKAGE_NAME = '@liteship/mcp-server';

function readServerVersion(cwd: string = process.cwd()): string {
  const candidates: string[] = [];
  try {
    // dist/server-info.js → ../package.json ; src/server-info.ts → ../package.json
    const moduleDir = dirname(fileURLToPath(import.meta.url));
    candidates.push(resolve(moduleDir, '../package.json'));
  } catch (err) {
    // The ONLY designed failure here is `import.meta.url` not being a `file:`
    // URL (a non-ESM-URL host context) — `fileURLToPath` rejects it with a
    // TypeError / `ERR_INVALID_URL_SCHEME`. That is fully recoverable: the cwd
    // candidates below find the manifest. The binding is CONSUMED by checking
    // the error shape; any OTHER error type is a real fault we surface loud
    // rather than mask behind the fallthrough.
    const code = (err as NodeJS.ErrnoException).code;
    const recoverable = err instanceof TypeError || code === 'ERR_INVALID_URL_SCHEME' || code === 'ERR_INVALID_URL';
    if (!recoverable) {
      throw IoError('mcp.serverInfo', 'failed to resolve module directory for version read', { cause: err });
    }
  }
  candidates.push(resolve(cwd, 'packages/mcp-server/package.json'));
  candidates.push(resolve(cwd, 'package.json'));
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const pkg = JSON.parse(readFileSync(path, 'utf8')) as { name?: string; version?: string };
    if (pkg.name === PACKAGE_NAME && typeof pkg.version === 'string') return pkg.version;
  }
  return '0.0.0-unknown';
}

let cached: ServerInfo | undefined;

/** The memoized server identity for the initialize handshake. */
export function serverInfo(): ServerInfo {
  cached ??= { name: 'LiteShip', version: readServerVersion() };
  return cached;
}
