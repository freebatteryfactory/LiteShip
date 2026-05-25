/**
 * serverInfo — the `serverInfo` block @czap/mcp-server returns from `initialize`
 * (CUT D1). Reads the real `@czap/mcp-server` package version (mirrors the CLI's
 * `readCliVersion` pattern) rather than hardcoding a literal. Host-local: this is
 * the one spot the protocol skin touches the filesystem, and it is memoized so
 * the read happens once per process, not per handshake.
 *
 * @module
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Server identity advertised in the MCP initialize response. */
export interface ServerInfo {
  readonly name: string;
  readonly version: string;
}

const PACKAGE_NAME = '@czap/mcp-server';

function readServerVersion(cwd: string = process.cwd()): string {
  const candidates: string[] = [];
  try {
    // dist/server-info.js → ../package.json ; src/server-info.ts → ../package.json
    const moduleDir = dirname(fileURLToPath(import.meta.url));
    candidates.push(resolve(moduleDir, '../package.json'));
  } catch {
    // import.meta.url unavailable in odd contexts — fall through to cwd candidates.
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
