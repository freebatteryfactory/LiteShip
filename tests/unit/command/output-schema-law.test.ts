/**
 * CUT D2 — outputSchema descriptor law.
 *
 *   executionKind:'handler'          ⟹ handler + inputSchema + outputSchema
 *   executionKind:'cli-orchestration'⟹ NO outputSchema (strict exemption — present = fail)
 *   mcpExposed:true                  ⟹ executionKind:'handler'
 *
 * Plus: every handler's success payload conforms to its declared outputSchema,
 * the 9 MCP tools expose outputSchema in tools/list, and the validator has teeth.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import {
  commandRegistry,
  mcpExposedDescriptors,
  GlossaryPayloadSchema,
  VersionPayloadSchema,
  PlumbPayloadSchema,
  AssetAnalyzePayloadSchema,
  VerifyPayloadSchema,
  AuditPayloadSchema,
  AuditFloorPayloadSchema,
  PackageSmokePayloadSchema,
  CheckInvariantsPayloadSchema,
  CapsuleVerifyPayloadSchema,
  CheckPayloadSchema,
} from '@liteship/command';
import { dispatchToolCall, listTools } from '../../../packages/mcp-server/src/dispatch.js';
import { validateStructural, type StructuralSchema } from '../../support/structural-schema.js';

describe('D2 — outputSchema registry law', () => {
  it('every handler-backed descriptor declares an object outputSchema with properties', () => {
    for (const d of commandRegistry.list()) {
      if (d.executionKind !== 'handler') continue;
      expect(d.outputSchema, `handler '${d.name}' is missing outputSchema`).toBeDefined();
      expect(d.outputSchema?.type, `handler '${d.name}' outputSchema.type`).toBe('object');
      expect(
        Object.keys(d.outputSchema?.properties ?? {}).length,
        `handler '${d.name}' outputSchema has no properties`,
      ).toBeGreaterThan(0);
    }
  });

  it('all 18 handler-backed descriptors carry outputSchema (scope = all handlers, not just MCP)', () => {
    const handlers = commandRegistry.list().filter((d) => d.executionKind === 'handler');
    expect(handlers.length).toBe(18);
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
  it('all 10 MCP tools include an object outputSchema', () => {
    const tools = listTools();
    expect(tools.length).toBe(10);
    for (const t of tools) {
      expect((t as { outputSchema?: { type?: string } }).outputSchema?.type, `${t.name} tools/list outputSchema`).toBe(
        'object',
      );
    }
  });
});

describe('D2 — payload conformance + validator teeth', () => {
  // Representative success payloads matching each handler's documented return
  // shape (see docs/superpowers/specs/2026-05-25-d2-output-schema-descriptor-law.md).
  const samples: Record<string, unknown> = {
    glossary: { term: 'boundary', entries: [{ term: 'boundary', category: 'core', definition: 'x' }] },
    version: { liteship: '0.1.3', node: '22.12.0', pnpm: '10.32.1' },
    'capsule.inspect': { capsule: { name: 'core.x', kind: 'pureTransform' } },
    'capsule.list': { capsules: [{ name: 'core.x', kind: 'pureTransform' }], kind: null },
    'capsule.verify': { capsuleId: 'core.x' },
    'asset.analyze': { assetId: 'intro-bed', projection: 'beat', markerCount: 12, cached: false },
    'asset.verify': { assetId: 'intro-bed', invariantsChecked: 3 },
    'scene.compile': { sceneId: 'intro', trackCount: 6, durationMs: 4000 },
    'scene.render': { sceneId: 'intro', output: 'out.mp4', frameCount: 240, elapsedMs: 1200, cached: false },
    'scene.verify': { sceneId: 'intro', generatedTests: 2 },
    verify: {
      tarball: 't.tgz',
      capsule_id: null,
      // The real payload always carries all four checks (the handler spreads
      // SKIPPED_BASE); the derived schema is tighter than the old bare
      // {type:'object'} and recurses into the checks struct, so the sample must
      // be a complete VerifyChecks value, not an incomplete one.
      checks: {
        tarball_manifest: 'skipped',
        lockfile: 'skipped',
        workspace_manifest: 'skipped',
        chain_link: 'skipped',
      },
      mismatches: [],
    },
    audit: {
      errorCount: 0,
      warningCount: 6,
      infoCount: 282,
      findingCount: 288,
      suppressedCount: 15,
      passFindingCounts: { structure: 1, integrity: 2, surface: 0 },
      repoRoot: '/repo',
      profileSource: 'default',
    },
    'audit-floor': {
      ok: false,
      expectedWarnings: 0,
      actualWarnings: 1,
      errorCount: 0,
      delta: { added: ['new-rule@packages/x/src/y.ts'], removed: [] },
      inventory: ['new-rule@packages/x/src/y.ts'],
    },
    'package-smoke': {
      ok: false,
      packagesPacked: 3,
      importsSmoked: 0,
      failedStep: 'pnpm install in consumer dir',
      failure: '@liteship/web missing from node_modules after install',
    },
    plumb: {
      ok: false,
      skips: [{ file: 'tests/generated/x.test.ts', kind: 'it.skip', message: 'unwired' }],
      unclassified: ['@liteship/mystery'],
      generatedPresent: true,
      generatedCorpusMessage: null,
    },
    'check-invariants': {
      ok: false,
      groups: [
        {
          name: 'NO_VAR',
          message: 'Use const/let, not var.',
          violations: [{ file: 'packages/x/src/y.ts', line: 3, content: 'var x = 1;' }],
        },
      ],
      lineEndings: ['packages/x/src/z.ts: expected .gitattributes attr eol=lf'],
    },
    'capsule-verify': {
      status: 'stale',
      errors: ['generated bench missing for core.x: tests/generated/core.x.bench.ts'],
      capsuleCount: 42,
      benches: { total: 41, real: 30, placeholder: ['core.x'] },
    },
    check: {
      ok: false,
      blocked: true,
      findingCount: 1,
      findings: [
        {
          ruleId: 'gauntlet/no-bare-throw',
          severity: 'error',
          level: 'L3',
          title: 'bare throw',
          detail: 'throw a tagged @liteship/error, not a bare value',
          location: { file: 'packages/x/src/y.ts', line: 12 },
        },
      ],
    },
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

  // Source-of-truth law: each migrated handler's descriptor.outputSchema IS its
  // ONE exported payload constant — the same hand-written `as const satisfies
  // CommandJsonSchema` JSON-Schema the payload TYPE mirrors. A second, hand-edited
  // outputSchema beside the exported constant (the drift this migration killed)
  // would diverge here. The CLI-only commands whose payload schema is
  // module-private (capsule.*, scene.*) are guaranteed by construction (the
  // descriptor literally references the same constant); this pins every EXPORTED
  // payload schema as the single source.
  const SINGLE_SOURCE_SCHEMAS = {
    glossary: GlossaryPayloadSchema,
    version: VersionPayloadSchema,
    plumb: PlumbPayloadSchema,
    'asset.analyze': AssetAnalyzePayloadSchema,
    verify: VerifyPayloadSchema,
    audit: AuditPayloadSchema,
    'audit-floor': AuditFloorPayloadSchema,
    'package-smoke': PackageSmokePayloadSchema,
    'check-invariants': CheckInvariantsPayloadSchema,
    'capsule-verify': CapsuleVerifyPayloadSchema,
    check: CheckPayloadSchema,
  } as const;

  it('every handler outputSchema deep-equals its ONE exported payload constant (no proxy beside the type)', () => {
    for (const [name, schema] of Object.entries(SINGLE_SOURCE_SCHEMAS)) {
      const descriptor = commandRegistry.get(name)?.descriptor;
      expect(descriptor, `no descriptor for '${name}'`).toBeDefined();
      expect(descriptor!.outputSchema, `'${name}' outputSchema is not the single-source payload constant`).toEqual(
        schema,
      );
    }
  });

  it('the validator has teeth: a missing required field and a wrong type both fail', () => {
    const schema = commandRegistry.get('asset.analyze')!.descriptor.outputSchema as StructuralSchema;
    // missing markerCount
    expect(validateStructural(schema, { assetId: 'x', projection: 'beat', cached: false }).length).toBeGreaterThan(0);
    // markerCount wrong type
    expect(
      validateStructural(schema, { assetId: 'x', projection: 'beat', markerCount: 'nope', cached: false }).length,
    ).toBeGreaterThan(0);
    // projection out of enum
    expect(
      validateStructural(schema, { assetId: 'x', projection: 'tempo', markerCount: 1, cached: false }).length,
    ).toBeGreaterThan(0);
  });
});
