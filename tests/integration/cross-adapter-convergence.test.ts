/**
 * CUT A1 (capstone) — A1-T5: cross-adapter convergence. The CLI adapter and the
 * MCP adapter dispatch the SAME registry commands and produce the SAME structured
 * result. One command truth, two protocol skins.
 *
 * @module
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { run } from '@czap/cli';
import { dispatchToolCall } from '@czap/mcp-server';
import { mcpExposedDescriptors } from '@czap/command';
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

/** Catalog-derived shared handler commands — mcpExposed ∩ executionKind handler. */
const SHARED_HANDLER_COMMANDS = mcpExposedDescriptors().filter((d) => d.executionKind === 'handler');

/** Map MCP tool name → CLI argv (the `czap` invocation shape). */
function cliArgvForTool(name: string): string[] {
  switch (name) {
    case 'asset.analyze':
      return ['asset', 'analyze', 'intro-bed', 'beat'];
    case 'asset.verify':
      return ['asset', 'verify', 'intro-bed'];
    case 'capsule.inspect':
      return ['capsule', 'inspect', 'alpha'];
    case 'capsule.list':
      return ['capsule', 'list'];
    case 'capsule.verify':
      return ['capsule', 'verify', 'alpha'];
    case 'check':
      return ['check'];
    case 'plumb':
      return ['plumb'];
    case 'scene.compile':
      return ['scene', 'compile', 'examples/scenes/intro.ts'];
    case 'scene.render':
      return ['scene', 'render', 'examples/scenes/intro.ts'];
    case 'scene.verify':
      return ['scene', 'verify', 'examples/scenes/intro.ts'];
    default:
      throw new Error(`no CLI argv mapping for ${name}`);
  }
}

function mcpArgsForTool(name: string): Record<string, unknown> {
  switch (name) {
    case 'capsule.list':
    case 'check':
    case 'plumb':
      return {};
    case 'capsule.inspect':
      return { id: 'alpha' };
    case 'capsule.verify':
      return { id: 'alpha' };
    case 'asset.analyze':
      return { asset: 'intro-bed', projection: 'beat' };
    case 'asset.verify':
      return { asset: 'intro-bed' };
    default:
      return { scene: 'examples/scenes/intro.ts' };
  }
}

/** Compare stable payload fields — excludes volatile timing/cache/findings bodies. */
function expectConvergedPayload(
  name: string,
  cliPayload: Record<string, unknown>,
  mcpPayload: Record<string, unknown>,
): void {
  switch (name) {
    case 'check':
      expect(mcpPayload.ok).toBe(cliPayload.ok);
      expect(mcpPayload.blocked).toBe(cliPayload.blocked);
      expect(typeof mcpPayload.findingCount).toBe('number');
      expect(mcpPayload.findingCount).toBe(cliPayload.findingCount);
      return;
    case 'scene.compile':
      expect(mcpPayload.sceneId).toBe(cliPayload.sceneId);
      expect(mcpPayload.trackCount).toBe(cliPayload.trackCount);
      return;
    case 'scene.render':
      expect(mcpPayload.sceneId).toBe(cliPayload.sceneId);
      expect(mcpPayload.frameCount).toBe(cliPayload.frameCount);
      expect(mcpPayload.output).toBe(cliPayload.output);
      return;
    case 'scene.verify':
      expect(mcpPayload.sceneId).toBe(cliPayload.sceneId);
      expect(mcpPayload.generatedTests).toBe(cliPayload.generatedTests);
      return;
    default:
      expect(mcpPayload).toEqual(cliPayload);
  }
}

describe('A1-T5 — CLI and MCP converge on shared handler commands', () => {
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

  it('catalog pin: shared handler set is exactly the 10 mcpExposed tools', () => {
    expect(SHARED_HANDLER_COMMANDS.map((d) => d.name).sort()).toEqual(
      mcpExposedDescriptors()
        .map((d) => d.name)
        .sort(),
    );
    expect(SHARED_HANDLER_COMMANDS.length).toBe(10);
  });

  for (const descriptor of SHARED_HANDLER_COMMANDS) {
    it(
      `${descriptor.name}: CLI receipt and MCP structuredContent agree on command + status`,
      async () => {
        const argv = cliArgvForTool(descriptor.name);
        const { exit, stdout } = await captureCli(() => run(argv));

        const mcp = await dispatchToolCall({ name: descriptor.name, arguments: mcpArgsForTool(descriptor.name) });
        const mcpPayload = mcp.structuredContent as Record<string, unknown>;

        expect(mcp.isError).toBe(exit !== 0);

        const receiptLine = stdout.trim().split('\n').filter(Boolean).pop();
        if (receiptLine) {
          const cliReceipt = JSON.parse(receiptLine) as Record<string, unknown>;
          expect(cliReceipt.command).toBe(descriptor.name);
          expect(cliReceipt.status).toBe(mcp.isError ? 'failed' : 'ok');

          const { timestamp: _cliTs, status: _cliStatus, command: _cliCmd, ...cliPayload } = cliReceipt;
          void _cliTs;
          void _cliStatus;
          void _cliCmd;
          expectConvergedPayload(descriptor.name, cliPayload, mcpPayload);
        } else {
          // emitError-only CLI path — both adapters agree on structured failure.
          expect(mcp.isError).toBe(true);
          expect((mcpPayload as { error?: string }).error).toBeTypeOf('string');
        }
      },
      descriptor.name === 'capsule.verify' || descriptor.name === 'scene.render' ? 120_000 : 60_000,
    );
  }
});
