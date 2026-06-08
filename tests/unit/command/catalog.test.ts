import { describe, it, expect } from 'vitest';
import { commandRegistry, COMMAND_CATALOG, mcpExposedDescriptors } from '@czap/command';

/** Commands whose execution is CLI-owned (executionKind 'cli-orchestration', no handler). */
const CLI_ORCHESTRATION = ['completion', 'describe', 'doctor', 'gauntlet', 'help', 'mcp', 'scene.dev', 'ship'] as const;

/** Every command czap currently routes — the single canonical catalog. */
const EXPECTED_NAMES = [
  'asset.analyze',
  'asset.verify',
  'audit',
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

/**
 * The MCP-exposed subset: the 8 finite, handler-backed compute/verify commands.
 * describe (catalog projection — tools/list already serves it) and gauntlet
 * (terminal-streaming orchestration) were dropped from the legacy 10: an MCP
 * tool must be handler-backed structured execution, never CLI-owned orchestration.
 */
const EXPECTED_MCP_NAMES = [
  'asset.analyze',
  'asset.verify',
  'capsule.inspect',
  'capsule.list',
  'capsule.verify',
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

  it('finite commands are executionKind handler; CLI-owned commands are cli-orchestration', () => {
    expect(commandRegistry.get('glossary')?.handler).toBeTypeOf('function');
    expect(commandRegistry.get('glossary')?.descriptor.executionKind).toBe('handler');
    // CLI-owned: registry-described for identity, no handler (CLI dispatch runs it).
    expect(commandRegistry.get('ship')?.descriptor.name).toBe('ship');
    expect(commandRegistry.get('ship')?.handler).toBeUndefined();
    expect(commandRegistry.get('ship')?.descriptor.executionKind).toBe('cli-orchestration');
  });

  it('executionKind matches handler presence EXACTLY (handler ⟺ executionKind "handler")', () => {
    for (const descriptor of commandRegistry.list()) {
      const command = commandRegistry.get(descriptor.name)!;
      const handled = typeof command.handler === 'function';
      const isHandlerKind = descriptor.executionKind === 'handler';
      // A finite command missing its handler is a bug; a cli-orchestration one is by design.
      expect(handled, `${descriptor.name}: handler=${handled} but executionKind=${descriptor.executionKind}`).toBe(isHandlerKind);
    }
  });

  it('the cli-orchestration set is exactly the handler-less set', () => {
    const cliOrchestration = commandRegistry
      .list()
      .filter((d) => d.executionKind === 'cli-orchestration')
      .map((d) => d.name)
      .sort();
    expect(cliOrchestration).toEqual([...CLI_ORCHESTRATION]);
  });

  it('every mcpExposed command is handler-backed (mcpExposed ⟹ executionKind "handler")', () => {
    // The gremlin guard: an MCP tool MUST be finite structured execution. A
    // cli-orchestration (handler-less) command can never be advertised as a tool.
    for (const d of mcpExposedDescriptors()) {
      expect(d.executionKind, `mcpExposed '${d.name}' is not executionKind handler`).toBe('handler');
      expect(commandRegistry.get(d.name)?.handler, `mcpExposed '${d.name}' has no handler`).toBeTypeOf('function');
    }
  });

  it('mcpExposedDescriptors never includes a cli-orchestration command', () => {
    const mcpNames = new Set(mcpExposedDescriptors().map((d) => d.name));
    for (const d of commandRegistry.list()) {
      if (d.executionKind === 'cli-orchestration') {
        expect(mcpNames.has(d.name), `${d.name} is cli-orchestration but leaked into listTools`).toBe(false);
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
    expect(byName.get('doctor')).toEqual({
      type: 'object',
      properties: {
        fix: { type: 'boolean' },
        ci: { type: 'boolean' },
        preflight: { type: 'boolean' },
        target: { type: 'string', enum: ['cloudflare'] },
      },
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
