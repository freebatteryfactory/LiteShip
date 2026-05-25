/**
 * CUT D2 — outputSchema descriptor law.
 *
 *   executionKind:'handler'          ⟹ handler + inputSchema + outputSchema
 *   executionKind:'cli-orchestration'⟹ NO outputSchema (strict exemption — present = fail)
 *   mcpExposed:true                  ⟹ executionKind:'handler'
 *
 * Plus: every handler's success payload conforms to its declared outputSchema,
 * the 8 MCP tools expose outputSchema in tools/list, and the validator has teeth.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { commandRegistry, mcpExposedDescriptors } from '@czap/command';
import { dispatchToolCall, listTools } from '../../../packages/mcp-server/src/dispatch.js';
import { validateStructural, type StructuralSchema } from '../../support/structural-schema.js';

describe('D2 — outputSchema registry law', () => {
  it('every handler-backed descriptor declares an object outputSchema with properties', () => {
    for (const d of commandRegistry.list()) {
      if (d.executionKind !== 'handler') continue;
      expect(d.outputSchema, `handler '${d.name}' is missing outputSchema`).toBeDefined();
      expect(d.outputSchema?.type, `handler '${d.name}' outputSchema.type`).toBe('object');
      expect(Object.keys(d.outputSchema?.properties ?? {}).length, `handler '${d.name}' outputSchema has no properties`).toBeGreaterThan(0);
    }
  });

  it('all 11 handler-backed descriptors carry outputSchema (scope = all handlers, not just MCP)', () => {
    const handlers = commandRegistry.list().filter((d) => d.executionKind === 'handler');
    expect(handlers.length).toBe(11);
    expect(handlers.every((d) => d.outputSchema !== undefined)).toBe(true);
  });

  it('cli-orchestration descriptors are exempt AND must NOT carry an outputSchema (strict exemption)', () => {
    for (const d of commandRegistry.list()) {
      if (d.executionKind !== 'cli-orchestration') continue;
      expect(d.outputSchema, `cli-orchestration '${d.name}' must not declare outputSchema`).toBeUndefined();
    }
  });

  it('every mcpExposed descriptor is a handler with an outputSchema', () => {
    for (const d of mcpExposedDescriptors()) {
      expect(d.executionKind).toBe('handler');
      expect(d.outputSchema?.type, `mcpExposed '${d.name}' outputSchema`).toBe('object');
    }
  });
});

describe('D2 — tools/list exposes outputSchema for the MCP tools', () => {
  it('all 8 MCP tools include an object outputSchema', () => {
    const tools = listTools();
    expect(tools.length).toBe(8);
    for (const t of tools) {
      expect((t as { outputSchema?: { type?: string } }).outputSchema?.type, `${t.name} tools/list outputSchema`).toBe('object');
    }
  });
});

describe('D2 — payload conformance + validator teeth', () => {
  // Representative success payloads matching each handler's documented return
  // shape (see docs/superpowers/specs/2026-05-25-d2-output-schema-descriptor-law.md).
  const samples: Record<string, unknown> = {
    glossary: { term: 'boundary', entries: [{ term: 'boundary', category: 'core', definition: 'x' }] },
    version: { czap: '0.1.3', node: '22.12.0', pnpm: '10.32.1' },
    'capsule.inspect': { capsule: { name: 'core.x', kind: 'pureTransform' } },
    'capsule.list': { capsules: [{ name: 'core.x', kind: 'pureTransform' }], kind: null },
    'capsule.verify': { capsuleId: 'core.x' },
    'asset.analyze': { assetId: 'intro-bed', projection: 'beat', markerCount: 12, cached: false },
    'asset.verify': { assetId: 'intro-bed', invariantsChecked: 3 },
    'scene.compile': { sceneId: 'intro', trackCount: 6, durationMs: 4000 },
    'scene.render': { sceneId: 'intro', output: 'out.mp4', frameCount: 240, elapsedMs: 1200, cached: false },
    'scene.verify': { sceneId: 'intro', generatedTests: 2 },
    verify: { tarball: 't.tgz', capsule_id: null, checks: { tarball_manifest: 'skipped' }, mismatches: [] },
  };

  it('each handler outputSchema accepts its documented success payload', () => {
    for (const d of commandRegistry.list()) {
      if (d.executionKind !== 'handler') continue;
      const sample = samples[d.name];
      expect(sample, `no sample payload fixture for '${d.name}'`).toBeDefined();
      const errors = validateStructural(d.outputSchema as StructuralSchema, sample);
      expect(errors, `'${d.name}' payload does not conform: ${errors.join('; ')}`).toEqual([]);
    }
  });

  it('a REAL glossary payload (run through dispatch) conforms to glossary outputSchema', async () => {
    const result = await dispatchToolCall({ name: 'glossary', arguments: { term: 'boundary' } });
    const schema = commandRegistry.get('glossary')!.descriptor.outputSchema as StructuralSchema;
    expect(validateStructural(schema, result.structuredContent)).toEqual([]);
  });

  it('the validator has teeth: a missing required field and a wrong type both fail', () => {
    const schema = commandRegistry.get('asset.analyze')!.descriptor.outputSchema as StructuralSchema;
    // missing markerCount
    expect(validateStructural(schema, { assetId: 'x', projection: 'beat', cached: false }).length).toBeGreaterThan(0);
    // markerCount wrong type
    expect(validateStructural(schema, { assetId: 'x', projection: 'beat', markerCount: 'nope', cached: false }).length).toBeGreaterThan(0);
    // projection out of enum
    expect(validateStructural(schema, { assetId: 'x', projection: 'tempo', markerCount: 1, cached: false }).length).toBeGreaterThan(0);
  });
});
