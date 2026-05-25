/**
 * Unit tests for the `describe` command. Covers JSON, MCP no-cache, and
 * MCP cached-manifest branches.
 */
import { describe as describeTest, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { describe } from '../../../../packages/cli/src/commands/describe.js';

const MANIFEST_PATH = '.czap/generated/mcp-manifest.json';
let preexisting: string | undefined;

describeTest('describe command', () => {
  beforeAll(() => {
    if (existsSync(MANIFEST_PATH)) {
      preexisting = readFileSync(MANIFEST_PATH, 'utf8');
    }
  });
  afterAll(() => {
    if (preexisting !== undefined) {
      writeFileSync(MANIFEST_PATH, preexisting, 'utf8');
    } else if (existsSync(MANIFEST_PATH)) {
      rmSync(MANIFEST_PATH);
    }
  });

  it('default JSON mode emits assembly kinds + command list', () => {
    const r = describe({}) as { assemblyKinds: readonly string[]; commands: readonly unknown[] };
    expect(r.assemblyKinds.length).toBeGreaterThan(5);
    expect(r.commands.length).toBeGreaterThan(5);
  });

  it('explicit JSON mode behaves the same as default', () => {
    const r = describe({ format: 'json' }) as { assemblyKinds: readonly string[] };
    expect(r.assemblyKinds.length).toBeGreaterThan(0);
  });

  it('MCP mode without cache projects the mcpExposed catalog subset with real schemas', () => {
    if (existsSync(MANIFEST_PATH)) rmSync(MANIFEST_PATH);
    const r = describe({ format: 'mcp' }) as {
      tools: ReadonlyArray<{ name: string; description: string; inputSchema: { type?: string; required?: string[] } }>;
    };
    expect(r.tools.length).toBeGreaterThan(5);
    // Real object schemas now — the empty `{ properties: {} }` stand-in is gone.
    for (const t of r.tools) expect(t.inputSchema.type).toBe('object');
    const names = r.tools.map((t) => t.name);
    // CLI-only / non-exposed commands never appear in the MCP tool manifest.
    expect(names).not.toContain('help');
    expect(names).not.toContain('version');
    expect(names).not.toContain('mcp');
    // Exposed compute tools carry their real input schemas.
    const analyze = r.tools.find((t) => t.name === 'asset.analyze')!;
    expect(analyze.inputSchema.required).toEqual(['asset', 'projection']);
  });

  it('MCP mode with cached manifest returns the cached tool list (covers L58 readFileSync branch)', () => {
    mkdirSync(dirname(MANIFEST_PATH), { recursive: true });
    const cached = {
      tools: [
        { name: 'cached.tool.x', description: 'cached', inputSchema: { type: 'object', properties: { id: { type: 'string' } } } },
      ],
    };
    writeFileSync(MANIFEST_PATH, JSON.stringify(cached), 'utf8');
    const r = describe({ format: 'mcp' }) as { tools: ReadonlyArray<{ name: string }> };
    expect(r.tools).toHaveLength(1);
    expect(r.tools[0]!.name).toBe('cached.tool.x');
    if (preexisting === undefined) rmSync(MANIFEST_PATH);
  });
});
