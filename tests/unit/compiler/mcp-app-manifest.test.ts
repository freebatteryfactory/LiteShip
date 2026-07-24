/**
 * CUT D6 — the pure MCP-app manifest projector (compiler unit law).
 *
 * Exercises `compileMcpAppManifest` in isolation with SYNTHETIC inputs (no
 * @liteship/mcp-server import): the projection rule, passthrough fidelity, no
 * invented fields, determinism, and the topology/orphan guards. The drift proof
 * against the REAL registries lives in the server-side d6 test (the integration seam).
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as compiler from '@liteship/compiler';
import { compileMcpAppManifest } from '@liteship/compiler';
import type { CapsuleCommandDescriptor } from '@liteship/core';
import type { CompileMcpAppManifestInput } from '@liteship/compiler';

const SRC = resolve(import.meta.dirname, '..', '..', '..', 'packages', 'compiler', 'src');

const linkedDescriptor: CapsuleCommandDescriptor = {
  name: 'capsule.inspect',
  summary: 'Inspect a capsule manifest entry.',
  inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
  outputSchema: { type: 'object', required: ['capsule'], properties: { capsule: { type: 'object' } } },
  annotations: { mcpExposed: true },
  executionKind: 'handler',
  ui: { resourceUri: 'ui://liteship/app/capsule-inspect' },
};
const plainDescriptor: CapsuleCommandDescriptor = {
  name: 'asset.analyze',
  summary: 'Analyze an asset.',
  inputSchema: { type: 'object', properties: {} },
  outputSchema: { type: 'object', properties: {} },
  annotations: { mcpExposed: true },
  executionKind: 'handler',
};

const input: CompileMcpAppManifestInput = {
  serverInfo: { name: 'LiteShip', version: '9.9.9' },
  protocolVersion: '2025-11-25',
  capabilities: { tools: { listChanged: false } },
  toolDescriptors: [linkedDescriptor, plainDescriptor],
  resources: [{ uri: 'liteship://registry/commands', name: 'registry/commands', description: 'd', mimeType: 'application/json' }],
  uiResources: [
    { uri: 'ui://liteship/glossary', name: 'glossary (UI)', description: 'd', mimeType: 'text/html;profile=mcp-app',
      _meta: { ui: { csp: { connectDomains: [], resourceDomains: [], frameDomains: [], baseUriDomains: [] } } } },
  ],
  appResources: [
    { uri: 'ui://liteship/app/capsule-inspect', name: 'app/capsule-inspect', description: 'd', mimeType: 'text/html;profile=mcp-app',
      _meta: { ui: { csp: { connectDomains: [], resourceDomains: [], frameDomains: [], baseUriDomains: [] } } } },
  ],
  prompts: [{ name: 'liteship.command.inspect', description: 'd', arguments: [{ name: 'command', description: 'd', required: true }] }],
};

describe('D6 compiler — tool projection mirrors listTools()', () => {
  it('projects name←name, description←summary, inputSchema, conditional outputSchema + _meta.ui', () => {
    const m = compileMcpAppManifest(input);
    expect(m.tools[0]).toEqual({
      name: 'capsule.inspect',
      description: 'Inspect a capsule manifest entry.',
      inputSchema: linkedDescriptor.inputSchema,
      outputSchema: linkedDescriptor.outputSchema,
      _meta: { ui: { resourceUri: 'ui://liteship/app/capsule-inspect' } },
    });
  });

  it('a descriptor without a ui link projects no _meta', () => {
    const m = compileMcpAppManifest(input);
    expect('_meta' in m.tools[1]!).toBe(false);
  });
});

describe('D6 compiler — passthrough fidelity + separate classes', () => {
  it('resources/prompts/uiResources/appResources pass through verbatim', () => {
    const m = compileMcpAppManifest(input);
    expect(m.resources).toEqual(input.resources);
    expect(m.prompts).toEqual(input.prompts);
    expect(m.uiResources).toEqual(input.uiResources);
    expect(m.appResources).toEqual(input.appResources);
  });

  it('uiResources (D4 static) and appResources (D5 live) stay separate fields', () => {
    const m = compileMcpAppManifest(input);
    expect(m.uiResources.map((r) => r.uri)).toEqual(['ui://liteship/glossary']);
    expect(m.appResources.map((r) => r.uri)).toEqual(['ui://liteship/app/capsule-inspect']);
  });

  it('serverInfo / protocolVersion / capabilities pass through', () => {
    const m = compileMcpAppManifest(input);
    expect(m.serverInfo).toEqual({ name: 'LiteShip', version: '9.9.9' });
    expect(m.protocolVersion).toBe('2025-11-25');
    expect(m.capabilities).toEqual({ tools: { listChanged: false } });
  });
});

describe('D6 compiler — no invented fields, constants, determinism', () => {
  it('the manifest has exactly the expected top-level keys (no returns/title/capsules)', () => {
    const m = compileMcpAppManifest(input);
    expect(Object.keys(m).sort()).toEqual(
      ['appResources', 'capabilities', 'namespacePolicy', 'prompts', 'protocolVersion', 'resources', 'resultEnvelope', 'serverInfo', 'tools', 'uiResources'].sort(),
    );
    expect('returns' in m.tools[0]!).toBe(false);
  });

  it('resultEnvelope + namespacePolicy are the fixed product constants', () => {
    const m = compileMcpAppManifest(input);
    expect(m.resultEnvelope).toEqual({ receiptMetaKey: 'liteship/result', structuredContentIsPayload: true });
    expect(m.namespacePolicy).toEqual({
      resourcePrefix: 'liteship://',
      uiPrefix: 'ui://liteship/',
      appPrefix: 'ui://liteship/app/',
    });
  });

  it('is deterministic (same input → deep-equal output)', () => {
    expect(compileMcpAppManifest(input)).toEqual(compileMcpAppManifest(input));
  });
});

describe('D6 compiler — topology + orphan removal', () => {
  it('the projector source IMPORTS neither @liteship/mcp-server nor @liteship/command (pure projector)', () => {
    const src = readFileSync(resolve(SRC, 'mcp-app-manifest.ts'), 'utf8');
    // Check actual import statements, not prose mentions in the module doc.
    expect(src).not.toMatch(/from ['"]@liteship\/mcp-server['"]/);
    expect(src).not.toMatch(/from ['"]@liteship\/command['"]/);
    expect(src).not.toContain('heyoub');
  });

  it('the orphaned compileAIManifest fantasy surface is gone; compileMcpAppManifest is exported', () => {
    expect('compileAIManifest' in compiler).toBe(false);
    expect(typeof (compiler as { compileMcpAppManifest?: unknown }).compileMcpAppManifest).toBe('function');
    // the real AIManifest authoring DSL is untouched
    expect('AIManifestCompiler' in compiler).toBe(true);
  });
});

describe('D6 compiler — optional collection surfaces default to empty', () => {
  it('omitted resources/uiResources/appResources/prompts project as []', () => {
    const m = compileMcpAppManifest({
      serverInfo: { name: 'LiteShip', version: '9.9.9' },
      protocolVersion: '2025-11-25',
      capabilities: {},
      toolDescriptors: [plainDescriptor],
    });
    expect(m.resources).toEqual([]);
    expect(m.uiResources).toEqual([]);
    expect(m.appResources).toEqual([]);
    expect(m.prompts).toEqual([]);
    expect(m.tools).toHaveLength(1);
  });
});
