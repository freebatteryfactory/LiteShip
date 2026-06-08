/**
 * verify (CLI adapter) — thin projection over `@czap/command`'s verify command
 * (ADR-0011 local verifier). The four-verdict decision tree lives in
 * `@czap/command`; this adapter parses argv, injects the file reads and the
 * Effect-backed capsule decode + tarball-manifest recompute, and renders the
 * ShipVerifyReceipt. No network, no pnpm, no git.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Cause, Effect, Result } from 'effect';
import { ShipCapsule } from '@czap/core';
import { verifyCommand, type VerifyPayload } from '@czap/command';
import type { CommandContext } from '@czap/command';
import { tarballManifestAddress } from '../ship-manifest.js';
import { emit, emitError } from '../receipts.js';
import type { ShipVerifyReceipt } from '../receipts.js';

async function runEffect<A, E>(
  effect: Effect.Effect<A, E>,
): Promise<{ ok: true; value: A } | { ok: false; error: string }> {
  const exit = await Effect.runPromiseExit(effect);
  if (exit._tag === 'Success') return { ok: true, value: exit.value };
  const found = Cause.findError(exit.cause);
  if (Result.isSuccess(found)) {
    const err = Result.getOrThrow(found) as unknown;
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  return {
    ok: false,
    error: Cause.prettyErrors(exit.cause)
      .map((e) => e.message)
      .join('; '),
  };
}

function verifyContext(): CommandContext {
  return {
    fileExists: (path) => existsSync(resolve(path)),
    readFileBytes: (path) => {
      const abs = resolve(path);
      return existsSync(abs) ? new Uint8Array(readFileSync(abs)) : null;
    },
    decodeShipCapsule: async (bytes) => {
      const r = await runEffect(ShipCapsule.decode(bytes));
      if (!r.ok) return { ok: false, error: r.error };
      return {
        ok: true,
        id: r.value.id,
        tarballManifestAddress: {
          display_id: r.value.tarball_manifest_address.display_id,
          integrity_digest: r.value.tarball_manifest_address.integrity_digest,
        },
      };
    },
    recomputeTarballAddress: async (bytes) => {
      const r = await runEffect(tarballManifestAddress(bytes));
      if (!r.ok) return { ok: false, error: r.error };
      return { ok: true, display_id: r.value.display_id, integrity_digest: r.value.integrity_digest };
    },
  };
}

interface ParsedVerifyArgs {
  readonly tarball: string | undefined;
  readonly capsule: string | undefined;
}

function parseArgs(args: readonly string[]): ParsedVerifyArgs {
  let tarball: string | undefined;
  let capsule: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '--capsule') {
      const next = args[i + 1];
      if (next !== undefined) {
        capsule = next;
        i++;
      }
      continue;
    }
    if (a.startsWith('--capsule=')) {
      capsule = a.slice('--capsule='.length);
      continue;
    }
    if (!a.startsWith('-') && tarball === undefined) {
      tarball = a;
    }
  }
  return { tarball, capsule };
}

/** Execute the verify command. */
export async function verify(args: readonly string[]): Promise<number> {
  const parsed = parseArgs(args);
  const result = await verifyCommand.handler(
    {
      name: 'verify',
      args: {
        ...(parsed.tarball !== undefined ? { tarball: parsed.tarball } : {}),
        ...(parsed.capsule !== undefined ? { capsule: parsed.capsule } : {}),
      },
    },
    verifyContext(),
  );

  // A verdict-bearing result emits a ShipVerifyReceipt; a plain failure (bad
  // input) goes to stderr as a structured error event.
  if (result.verdict === undefined) {
    emitError('verify', (result.payload as { error: string }).error);
    return result.exitCode ?? 1;
  }
  const payload = result.payload as VerifyPayload;
  const receipt: ShipVerifyReceipt = {
    status: result.status,
    command: 'verify',
    timestamp: result.timestamp,
    verdict: result.verdict,
    tarball: payload.tarball,
    capsule_id: payload.capsule_id,
    checks: payload.checks,
    mismatches: payload.mismatches,
  };
  emit(receipt);
  return result.exitCode ?? 0;
}
