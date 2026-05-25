/**
 * CUT A1 (catalog collapse): every command surface is a projection of the ONE
 * canonical catalog in @czap/command. These tests prove the duplication is gone
 * — no surface maintains its own parallel command table.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { run } from '@czap/cli';
import { COMMAND_CATALOG, mcpExposedDescriptors } from '@czap/command';
import { listTools } from '@czap/mcp-server';
import { TOP_LEVEL_VERBS } from '../../packages/cli/src/commands/completion.js';
import { HELP_TEXT } from '../../packages/cli/src/commands/help.js';
import { captureCli } from './cli/capture.js';

function lastJson(stdout: string): unknown {
  return JSON.parse(stdout.trim().split('\n').pop()!);
}

describe('catalog projection — single source of command identity', () => {
  it('CLI describe (json) lists exactly the canonical catalog', async () => {
    const { exit, stdout } = await captureCli(() => run(['describe']));
    expect(exit).toBe(0);
    const receipt = lastJson(stdout) as { commands: ReadonlyArray<{ name: string }> };
    expect(receipt.commands.map((c) => c.name)).toEqual(COMMAND_CATALOG.map((d) => d.name));
  });

  it('MCP listTools() and CLI describe --format=mcp agree on the exact tool set + schemas', async () => {
    const { exit, stdout } = await captureCli(() => run(['describe', '--format=mcp']));
    expect(exit).toBe(0);
    const manifest = lastJson(stdout) as { tools: ReadonlyArray<{ name: string; inputSchema: unknown }> };

    const expected = mcpExposedDescriptors().map((d) => ({
      name: d.name,
      description: d.summary,
      inputSchema: d.inputSchema,
      // CUT D2: handler-backed (hence all mcpExposed) descriptors carry outputSchema,
      // and BOTH projections (describe --format=mcp and listTools) emit it.
      ...(d.outputSchema ? { outputSchema: d.outputSchema } : {}),
    }));
    // describe --format=mcp == the catalog's mcpExposed subset, projected.
    expect(manifest.tools).toEqual(expected);
    // ...and MCP's listTools() is the same projection, byte-for-byte.
    expect(listTools()).toEqual(expected);
  });

  it('mcp is a CLI command but NOT an MCP tool (start-server is not callable over MCP)', async () => {
    const json = (await captureCli(() => run(['describe']))).stdout;
    const def = lastJson(json) as { commands: ReadonlyArray<{ name: string }> };
    expect(def.commands.map((c) => c.name)).toContain('mcp');

    const mcpOut = (await captureCli(() => run(['describe', '--format=mcp']))).stdout;
    const tools = lastJson(mcpOut) as { tools: ReadonlyArray<{ name: string }> };
    expect(tools.tools.map((t) => t.name)).not.toContain('mcp');
  });

  it('completion top-level verbs are derived from the catalog (no hand-maintained list)', () => {
    const derived = [...new Set(COMMAND_CATALOG.map((d) => d.name.split('.')[0]!))].sort();
    expect([...TOP_LEVEL_VERBS].sort()).toEqual(derived);
  });

  it('help mentions every catalog command (the chart is projected, not hand-listed)', () => {
    for (const d of COMMAND_CATALOG) {
      expect(HELP_TEXT, `help missing ${d.name}`).toContain(d.name);
    }
  });
});
