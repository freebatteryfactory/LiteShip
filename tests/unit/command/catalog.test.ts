import { describe, it, expect } from 'vitest';
import { commandRegistry, COMMAND_CATALOG, mcpExposedDescriptors } from '@czap/command';

/** Every command czap currently routes — the single canonical catalog. */
const EXPECTED_NAMES = [
  'asset.analyze',
  'asset.verify',
  'capsule.inspect',
  'capsule.list',
  'capsule.verify',
  'completion',
  'describe',
  'doctor',
  'gauntlet',
  'glossary',
  'help',
  'mcp',
  'scene.compile',
  'scene.dev',
  'scene.render',
  'scene.verify',
  'ship',
  'verify',
  'version',
] as const;

/** Exactly the MCP-exposed subset (matches the legacy hand-written listTools). */
const EXPECTED_MCP_NAMES = [
  'asset.analyze',
  'asset.verify',
  'capsule.inspect',
  'capsule.list',
  'capsule.verify',
  'describe',
  'gauntlet',
  'scene.compile',
  'scene.render',
  'scene.verify',
] as const;

describe('@czap/command canonical catalog', () => {
  it('registry.list() is the full catalog, sorted and deduped', () => {
    const names = commandRegistry.list().map((d) => d.name);
    expect(names).toEqual([...EXPECTED_NAMES]);
    expect(new Set(names).size).toBe(names.length);
  });

  it('COMMAND_CATALOG mirrors registry.list()', () => {
    expect(COMMAND_CATALOG.map((d) => d.name)).toEqual(commandRegistry.list().map((d) => d.name));
  });

  it('exposes migrated commands with handlers and pending commands descriptor-only', () => {
    expect(commandRegistry.get('glossary')?.handler).toBeTypeOf('function');
    expect(commandRegistry.get('version')?.handler).toBeTypeOf('function');
    // Declared, routed by legacy CLI dispatch, no registry handler yet.
    expect(commandRegistry.get('ship')?.descriptor.name).toBe('ship');
    expect(commandRegistry.get('ship')?.handler).toBeUndefined();
  });

  it('mcpExposedDescriptors() is the explicit opt-in subset', () => {
    expect(mcpExposedDescriptors().map((d) => d.name)).toEqual([...EXPECTED_MCP_NAMES]);
  });

  it('preserves the legacy MCP inputSchemas byte-for-byte (listTools compatibility)', () => {
    const byName = new Map(commandRegistry.list().map((d) => [d.name, d.inputSchema]));
    expect(byName.get('scene.render')).toEqual({
      type: 'object',
      required: ['scene', 'output'],
      properties: { scene: { type: 'string' }, output: { type: 'string' } },
    });
    expect(byName.get('asset.analyze')).toEqual({
      type: 'object',
      required: ['asset', 'projection'],
      properties: { asset: { type: 'string' }, projection: { type: 'string', enum: ['beat', 'onset', 'waveform'] } },
    });
    expect(byName.get('gauntlet')).toEqual({
      type: 'object',
      properties: { 'dry-run': { type: 'boolean' } },
    });
  });

  it('assigns every command a presentation group (drives help grouping)', () => {
    for (const d of commandRegistry.list()) {
      expect(d.annotations?.group, `${d.name} missing group`).toBeTypeOf('string');
    }
  });

  it('declares the shell enum on the completion descriptor (single source for completion)', () => {
    const completion = commandRegistry.get('completion')?.descriptor;
    expect(completion?.inputSchema.properties?.shell).toEqual({ type: 'string', enum: ['bash', 'zsh', 'fish'] });
  });
});
