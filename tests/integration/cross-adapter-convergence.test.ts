/**
 * CUT A1 (capstone) — A1-T5: cross-adapter convergence. The CLI adapter and the
 * MCP adapter dispatch the SAME registry command (`capsule.list`) and produce
 * the SAME structured result. One command truth, two protocol skins.
 *
 * @module
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { run } from '@czap/cli';
import { dispatchToolCall } from '@czap/mcp-server';
import { captureCli } from './cli/capture.js';

let tmpDir: string;
let manifestPath: string;
let prevEnv: string | undefined;

const MANIFEST = {
  capsules: [
    { name: 'alpha', kind: 'pureTransform', source: 'a.ts', generated: { testFile: 'a.test.ts', benchFile: 'a.bench.ts' } },
    { name: 'beta', kind: 'stateMachine', source: 'b.ts', generated: { testFile: 'b.test.ts', benchFile: 'b.bench.ts' } },
  ],
};

describe('A1-T5 — CLI and MCP converge on the same registry command', () => {
  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'czap-xadapter-'));
    manifestPath = join(tmpDir, 'capsule-manifest.json');
    mkdirSync(dirname(manifestPath), { recursive: true });
    writeFileSync(manifestPath, JSON.stringify(MANIFEST), 'utf8');
    prevEnv = process.env.CZAP_CAPSULE_MANIFEST;
    process.env.CZAP_CAPSULE_MANIFEST = manifestPath;
  });
  afterAll(() => {
    if (prevEnv === undefined) delete process.env.CZAP_CAPSULE_MANIFEST;
    else process.env.CZAP_CAPSULE_MANIFEST = prevEnv;
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('capsule.list: CLI stdout receipt and MCP structuredContent carry the same capsules', async () => {
    // CLI skin: argv → dispatch → stdout JSON receipt.
    const { exit, stdout } = await captureCli(() => run(['capsule', 'list']));
    expect(exit).toBe(0);
    const cliReceipt = JSON.parse(stdout.trim().split('\n').pop()!) as { capsules: Array<{ name: string }> };

    // MCP skin: { name, arguments } → same dispatcher → structuredContent.
    const mcp = await dispatchToolCall({ name: 'capsule.list', arguments: {} });
    expect(mcp.isError).toBe(false);
    const mcpPayload = mcp.structuredContent as { capsules: Array<{ name: string }> };

    // Both skins, one registry entry, equivalent structured result.
    expect(mcpPayload.capsules.map((c) => c.name)).toEqual(cliReceipt.capsules.map((c) => c.name));
    expect(mcpPayload.capsules.map((c) => c.name)).toEqual(['alpha', 'beta']);
  });
});
