import { describe, it, expect } from 'vitest';
import { commandRegistry, COMMAND_CATALOG, mcpExposedDescriptors } from '@czap/command';

/** Commands whose execution is CLI-owned (no @czap/command handler, by design). */
const CLI_OWNED = ['completion', 'describe', 'doctor', 'gauntlet', 'help', 'mcp', 'scene.dev', 'ship'] as const;

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

  it('finite commands carry handlers; CLI-owned commands are descriptor-only', () => {
    expect(commandRegistry.get('glossary')?.handler).toBeTypeOf('function');
    expect(commandRegistry.get('version')?.handler).toBeTypeOf('function');
    // CLI-owned: registry-described for identity, no handler (CLI dispatch runs it).
    expect(commandRegistry.get('ship')?.descriptor.name).toBe('ship');
    expect(commandRegistry.get('ship')?.handler).toBeUndefined();
    expect(commandRegistry.get('ship')?.descriptor.annotations?.cliOwned).toBe(true);
  });

  it('every command is EXACTLY one of: handled (structured) or cliOwned (orchestration)', () => {
    for (const descriptor of commandRegistry.list()) {
      const command = commandRegistry.get(descriptor.name)!;
      const handled = typeof command.handler === 'function';
      const cliOwned = descriptor.annotations?.cliOwned === true;
      // XOR: a finite command missing its handler is a bug; a cliOwned one is by design.
      expect(handled !== cliOwned, `${descriptor.name}: handled=${handled} cliOwned=${cliOwned} (must be exactly one)`).toBe(true);
    }
  });

  it('the CLI-owned set is exactly the descriptor-only set', () => {
    const cliOwned = commandRegistry
      .list()
      .filter((d) => d.annotations?.cliOwned === true)
      .map((d) => d.name)
      .sort();
    expect(cliOwned).toEqual([...CLI_OWNED]);
  });

  it('mcpExposedDescriptors never includes a non-mcpExposed cliOwned command', () => {
    const mcpNames = new Set(mcpExposedDescriptors().map((d) => d.name));
    for (const d of commandRegistry.list()) {
      if (d.annotations?.cliOwned === true && d.annotations?.mcpExposed !== true) {
        expect(mcpNames.has(d.name), `${d.name} is cliOwned + non-mcpExposed but leaked into listTools`).toBe(false);
      }
    }
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
