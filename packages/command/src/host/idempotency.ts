/**
 * Content-addressed idempotency — hash command + inputs + environment
 * fingerprint, look up `.czap/cache/<hash>.json`, return cached receipt
 * if present unless `force` is true.
 *
 * @module
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { CanonicalCbor } from '@czap/core';

/** Context supplied to the idempotency helpers. */
export interface IdempotencyCtx {
  readonly command: string;
  readonly inputs: Record<string, unknown>;
  readonly force: boolean;
  /** Cache root. Defaults to `process.cwd()` when omitted. */
  readonly cwd?: string;
  /**
   * Environment fingerprint folded into the cache identity so a receipt
   * cached under one toolchain (node / platform / arch / package-manager) is
   * never served to another. Defaults to {@link currentEnvFingerprint} when
   * omitted — pass an explicit one only to pin it in a test.
   */
  readonly env?: Readonly<Record<string, string>>;
}

/**
 * The current process's environment fingerprint — node version, platform,
 * arch, and (when invoked through a package manager) its user-agent. This is a
 * genuine input to a cached command's result, so it belongs IN the cache
 * identity rather than standing beside it.
 */
export function currentEnvFingerprint(): Record<string, string> {
  return {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    pm: process.env.npm_config_user_agent ?? '',
  };
}

/** Hash the command + inputs + environment fingerprint into a short hex slug. */
export function hashInputs(ctx: IdempotencyCtx): string {
  // ADR-0003: feed SHA-256 RFC 8949 canonical CBOR bytes so the slug is
  // invariant under key permutation and JSON stringification quirks. The env
  // fingerprint is part of the identity (a receipt is only valid for the
  // toolchain that produced it), defaulting to the current process.
  const canonical = CanonicalCbor.encode({
    command: ctx.command,
    inputs: ctx.inputs,
    env: ctx.env ?? currentEnvFingerprint(),
  });
  return createHash('sha256').update(canonical).digest('hex').slice(0, 16);
}

/** Path where the cached receipt lives (relative to `cwd`, or process cwd). */
export function cachePath(hash: string, cwd: string = process.cwd()): string {
  return join(cwd, '.czap', 'cache', `${hash}.json`);
}

/** Return a cached receipt for this invocation, or null if absent / forced. */
export function tryReadCache(ctx: IdempotencyCtx): unknown | null {
  if (ctx.force) return null;
  const path = cachePath(hashInputs(ctx), ctx.cwd);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

/** Write the fresh receipt to the cache for future identical invocations. */
export function writeCache(ctx: IdempotencyCtx, receipt: unknown): void {
  const path = cachePath(hashInputs(ctx), ctx.cwd);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(receipt, null, 2), 'utf8');
}
