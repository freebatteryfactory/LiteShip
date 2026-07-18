/**
 * verify (CLI adapter) — thin projection over `@czap/command`'s verify command
 * (ADR-0011 local verifier). The four-verdict decision tree lives in
 * `@czap/command`; this adapter parses argv, injects the file reads and the
 * native (sync) capsule decode + tarball-manifest recompute, and renders the
 * ShipVerifyReceipt. No network, no pnpm, no git.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ShipCapsule } from '@czap/core';
import { verifyCommand, type VerifyPayload } from '@czap/command';
import type { CommandContext } from '@czap/command';
import { tarballManifestAddress } from '../ship-manifest.js';
import { emit, emitError } from '../receipts.js';
import type { ShipVerifyReceipt } from '../receipts.js';

function verifyContext(): CommandContext {
  return {
    fileExists: (path) => existsSync(resolve(path)),
    readFileBytes: (path) => {
      const abs = resolve(path);
      return existsSync(abs) ? new Uint8Array(readFileSync(abs)) : null;
    },
    // The context callbacks are typed Promise-returning by @czap/command; the
    // underlying decode/recompute are now SYNC, so these `async` wrappers just
    // adapt the sync `Result` / sync throw into the injected-capability shape.
    decodeShipCapsule: async (bytes) => {
      const r = ShipCapsule.decode(bytes);
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
      try {
        const addr = tarballManifestAddress(bytes);
        return { ok: true, display_id: addr.display_id, integrity_digest: addr.integrity_digest };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
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
