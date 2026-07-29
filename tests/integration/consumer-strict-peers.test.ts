/**
 * Strict-peer law for generated scratch consumers (codex P1 on PR #170).
 *
 * The repository's `strictPeerDependencies: true` lives in pnpm-workspace.yaml,
 * so it governs ONLY workspace installs. Every packed-consumer proof installs
 * OUTSIDE the workspace (temp dirs, or `--ignore-workspace` scratch dirs), where
 * pnpm's documented default is NON-strict: an incompatible peer graph produces a
 * warning and a green exit — a release proof that cannot fail on the exact
 * defect it exists to catch.
 *
 * {@link CONSUMER_STRICT_PEER_FLAG} is the one argv-level cure (the same
 * argv-not-environment doctrine as the hermetic `--offline` law): every scratch
 * consumer install carries it. This suite proves the flag is LOAD-BEARING with
 * a real offline pnpm install against a local `file:` dependency whose peer can
 * never be satisfied:
 *
 *  - WITHOUT the flag, the install exits green (the documented hole — the
 *    negative control that keeps this law falsifiable);
 *  - WITH the flag, the same install fails closed naming the peer.
 *
 * @module
 */
import { afterEach, describe, expect, it } from 'vitest';
import { scaledTimeout } from '../../vitest.shared.js';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnArgvCaptureWithEnv } from '../../packages/command/src/host/launcher.js';
import { CONSUMER_STRICT_PEER_FLAG } from '../../packages/cli/src/internal/package-smoke-helpers.js';

const fixtureDirs: string[] = [];

/**
 * A consumer whose peer graph is INCOMPATIBLE rather than missing: `peer-heavy`
 * requires `peer-target@^2.0.0` while the consumer installs `peer-target@1.0.0`.
 * (A MISSING peer is the wrong fixture — pnpm's default `auto-install-peers`
 * tries to fetch it, failing for an unrelated registry reason. An installed but
 * wrong-version peer is the shape the non-strict default warns past.)
 * All packages are local `file:` dependencies, so the proof runs offline.
 */
function scaffoldConsumerWithIncompatiblePeer(): string {
  const root = mkdtempSync(join(tmpdir(), 'liteship-strict-peer-'));
  fixtureDirs.push(root);
  const write = (dir: string, manifest: object): void => {
    mkdirSync(join(root, dir));
    writeFileSync(join(root, dir, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  };
  write('peer-target', { name: 'peer-target', version: '1.0.0' });
  write('peer-heavy', {
    name: 'peer-heavy',
    version: '1.0.0',
    peerDependencies: { 'peer-target': '^2.0.0' },
  });
  write('consumer', {
    name: 'strict-peer-consumer',
    private: true,
    dependencies: { 'peer-heavy': 'file:../peer-heavy', 'peer-target': 'file:../peer-target' },
  });
  return join(root, 'consumer');
}

/**
 * Neutralize every inherited strict-peer config channel. A parent `pnpm run`
 * exports the workspace's strictPeerDependencies into test-process env (the CI
 * launcher does; a local `pnpm exec` does not), and worker pools can re-case
 * the key (tinypool uppercases env names on Windows) — so every casing/spelling
 * variant actually present is overridden, plus both canonical spellings. This
 * makes both arms launcher-independent AND makes the strict arm prove the
 * stronger claim: the argv flag defeats an explicitly non-strict environment
 * (pnpm precedence: CLI over env).
 */
function nonStrictPeerEnv(): Record<string, string> {
  const overrides: Record<string, string> = {
    FORCE_COLOR: '0',
    npm_config_strict_peer_dependencies: 'false',
    'npm_config_strict-peer-dependencies': 'false',
  };
  for (const key of Object.keys(process.env)) {
    if (/^npm_config_strict[-_]peer[-_]dependencies$/iu.test(key)) overrides[key] = 'false';
  }
  return overrides;
}

async function install(consumer: string, extraArgs: readonly string[]) {
  return spawnArgvCaptureWithEnv('pnpm', ['install', '--prefer-offline', ...extraArgs], {
    cwd: consumer,
    envAdditions: nonStrictPeerEnv(),
    timeoutMs: 120_000,
  });
}

afterEach(() => {
  for (const dir of fixtureDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('scratch-consumer strict-peer law', () => {
  it(
    'the default non-workspace install passes an incompatible peer graph (the hole the flag closes)',
    { timeout: scaledTimeout(120_000) },
    async () => {
      const consumer = scaffoldConsumerWithIncompatiblePeer();
      const result = await install(consumer, []);
      expect(result.timedOut).toBe(false);
      expect(result.exitCode, `install output:\n${(result.stderr + result.stdout).slice(-1200)}`).toBe(0);
    },
  );

  it(
    'the consumer strict-peer flag makes the same install fail closed naming the peer',
    { timeout: scaledTimeout(120_000) },
    async () => {
      const consumer = scaffoldConsumerWithIncompatiblePeer();
      const result = await install(consumer, [CONSUMER_STRICT_PEER_FLAG]);
      expect(result.timedOut).toBe(false);
      expect(result.exitCode).not.toBe(0);
      expect(`${result.stdout}\n${result.stderr}`).toContain('peer-target');
    },
  );
});
