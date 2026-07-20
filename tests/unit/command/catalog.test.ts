import { describe, it, expect } from 'vitest';
import { commandRegistry, COMMAND_CATALOG, mcpExposedDescriptors } from '@liteship/command';

/** Commands whose execution is CLI-owned (executionKind 'cli-orchestration', no handler). */
const CLI_ORCHESTRATION = [
  'add',
  'astro.dev',
  'astro.status',
  'astro.stop',
  'build',
  'completion',
  'describe',
  'dev',
  'doctor',
  'gauntlet',
  'help',
  'info',
  'lsp',
  'mcp',
  'sbom',
  'scene.dev',
  'ship',
] as const;

/** Every command liteship currently routes — the single canonical catalog. */
const EXPECTED_NAMES = [
  'add',
  'asset.analyze',
  'asset.verify',
  'astro.dev',
  'astro.status',
  'astro.stop',
  'audit',
  'audit-floor',
  'build',
  'capsule-verify',
  'capsule.inspect',
  'capsule.list',
  'capsule.verify',
  'check',
  'check-invariants',
  'completion',
  'context',
  'describe',
  'dev',
  'doctor',
  'explain',
  'gauntlet',
  'glossary',
  'help',
  'info',
  'lsp',
  'mcp',
  'package-smoke',
  'plumb',
  'sbom',
  'scene.compile',
  'scene.dev',
  'scene.render',
  'scene.verify',
  'ship',
  'verify',
  'version',
] as const;

/**
 * The MCP-exposed subset: the 12 finite, handler-backed compute/verify/gate and
 * reference (explain / context) commands. describe (catalog projection — tools/list already serves it) and
 * gauntlet (terminal-streaming orchestration) are CLI-owned orchestration, never
 * MCP tools. `plumb` IS exposed: it returns a structured skip work-list — an ideal
 * agent tool. `check` IS exposed: it runs the PURE gauntlet gate fold in-process
 * (`litelaunchGauntlet`) and returns the Finding[] work-list — the tasks-vs-gates
 * weld, an ideal agent tool (distinct from the CLI-owned `gauntlet` orchestrator).
 * `check-invariants` is NOT exposed: its scan needs `@liteship/audit`'s
 * `normalizeRepoPath` (the one B5b slash-normalize home), so — like `audit`/
 * `audit-floor` — it is CLI-only and the capability is absent over MCP.
 * `capsule-verify` is NOT exposed either: like `package-smoke` its engine is a
 * CLI-injected subprocess orchestrator (it spawns `capsule:compile` + `vitest`),
 * so the capability is absent over MCP.
 */
const EXPECTED_MCP_NAMES = [
  'asset.analyze',
  'asset.verify',
  'capsule.inspect',
  'capsule.list',
  'capsule.verify',
  'check',
  'context',
  'explain',
  'plumb',
  'scene.compile',
  'scene.render',
  'scene.verify',
] as const;

describe('@liteship/command canonical catalog', () => {
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

  it('preserves the MCP inputSchemas (now single-source-derived from one Effect Schema)', () => {
    const byName = new Map(commandRegistry.list().map((d) => [d.name, d.inputSchema]));
    // 0.2.0 widening: `output` is no longer required — when omitted, the
    // handler derives `<sceneBasename>.mp4` beside the scene file.
    // Source-of-truth cut: these inputSchemas are now DERIVED from the command's
    // args Effect Schema (schemaToJsonSchema), so a literal-set field surfaces as
    // a bare `{ enum: [...] }` (the dialect's literal-set form) rather than the
    // old hand-written `{ type:'string', enum:[...] }` — tighter, same constraint.
    expect(byName.get('scene.render')).toEqual({
      type: 'object',
      properties: { scene: { type: 'string' }, output: { type: 'string' } },
      required: ['scene'],
    });
    expect(byName.get('asset.analyze')).toEqual({
      type: 'object',
      properties: { asset: { type: 'string' }, projection: { enum: ['beat', 'onset', 'waveform'] } },
      required: ['asset', 'projection'],
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
        target: { type: 'string', enum: ['cloudflare', 'astro'] },
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
