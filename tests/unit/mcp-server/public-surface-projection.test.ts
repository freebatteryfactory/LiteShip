import { describe, expect, it } from 'vitest';
import { mcpExposedDescriptors } from '@liteship/command';
import {
  dispatch,
  listMcpResources,
  listTools,
  projectMcpResources,
  projectMcpTools,
} from '../../../packages/mcp-server/src/dispatch.js';
import { listResources } from '../../../packages/mcp-server/src/resources.js';
import { listUiResources } from '../../../packages/mcp-server/src/ui-resources.js';
import { listAppResources } from '../../../packages/mcp-server/src/app-resources.js';
import { listManifestResources } from '../../../packages/mcp-server/src/manifest-resource.js';
import {
  handle,
  initialLspState,
  LSP_METHOD_CATALOG,
  LSP_SERVER_CAPABILITIES,
  projectLspCapabilities,
  type LspMethodDescriptor,
  type LspServerState,
} from '../../../packages/mcp-server/src/lsp/server.js';
import type { JsonRpcErrorResponse } from '../../../packages/mcp-server/src/jsonrpc.js';

const runner = async (): Promise<{ readonly findings: readonly []; readonly blocked: false }> => ({
  findings: [],
  blocked: false,
});

function request(method: string, params?: unknown, id: string | number = 1): string {
  return JSON.stringify({ jsonrpc: '2.0', id, method, ...(params === undefined ? {} : { params }) });
}

function notification(method: string, params?: unknown): string {
  return JSON.stringify({ jsonrpc: '2.0', method, ...(params === undefined ? {} : { params }) });
}

async function activeState(): Promise<LspServerState> {
  return (await handle(request('initialize', { capabilities: {} }), initialLspState(), runner)).state;
}

describe('MCP public surface projections', () => {
  it('projects tools/list exactly from the canonical command descriptors', async () => {
    const expected = projectMcpTools(mcpExposedDescriptors());
    expect(listTools()).toEqual(expected);
    const response = (await dispatch({ jsonrpc: '2.0', id: 1, method: 'tools/list' })) as {
      result: { tools: unknown };
    };
    expect(response.result.tools).toEqual(expected);
  });

  it('a deleted command-catalog row changes the tool projection', () => {
    const descriptors = mcpExposedDescriptors();
    expect(descriptors.length).toBeGreaterThan(0);
    const mutant = projectMcpTools(descriptors.slice(0, -1));
    expect(mutant).not.toEqual(listTools());
  });

  it('projects resources/list exactly from every resource registry', async () => {
    const expected = projectMcpResources([
      listResources(),
      listUiResources(),
      listAppResources(),
      listManifestResources(),
    ]);
    expect(listMcpResources()).toEqual(expected);
    const response = (await dispatch({ jsonrpc: '2.0', id: 1, method: 'resources/list' })) as {
      result: { resources: unknown };
    };
    expect(response.result.resources).toEqual(expected);
  });

  it('a deleted resource-registry row changes the combined projection', () => {
    const jsonResources = listResources();
    expect(jsonResources.length).toBeGreaterThan(0);
    const mutant = projectMcpResources([
      jsonResources.slice(0, -1),
      listUiResources(),
      listAppResources(),
      listManifestResources(),
    ]);
    expect(mutant).not.toEqual(listMcpResources());
  });
});

describe('LSP method and capability projection', () => {
  it('derives advertised capabilities from the live method catalog', () => {
    expect(projectLspCapabilities(LSP_METHOD_CATALOG)).toEqual(LSP_SERVER_CAPABILITIES);
  });

  it.each(['textDocument/codeAction', 'textDocument/diagnostic', 'workspace/diagnostic'] as const)(
    'a missing %s handler makes capability construction fail closed',
    (method) => {
      const mutant = LSP_METHOD_CATALOG.filter((entry) => entry.method !== method);
      expect(() => projectLspCapabilities(mutant)).toThrow(`capability has no registered handler: ${method}`);
    },
  );

  it('routes every catalogued client method rather than advertising an orphan', async () => {
    for (const descriptor of LSP_METHOD_CATALOG.filter(
      (entry): entry is LspMethodDescriptor => entry.direction === 'client-to-server',
    )) {
      let state = descriptor.phase === 'initial' ? initialLspState() : await activeState();
      if (descriptor.phase === 'shutdown') state = { ...state, shuttingDown: true };
      const params =
        descriptor.method === 'initialize'
          ? { capabilities: {} }
          : descriptor.method === 'textDocument/codeAction'
            ? {
                textDocument: { uri: 'file:///repo/file.ts' },
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
              }
            : descriptor.method === 'textDocument/diagnostic'
              ? { textDocument: { uri: 'file:///repo/file.ts' } }
              : undefined;
      const raw =
        descriptor.messageKind === 'notification'
          ? notification(descriptor.method, params)
          : request(descriptor.method, params);
      const { result } = await handle(raw, state, runner);
      const errorCode = (result.response as JsonRpcErrorResponse | null)?.error?.code;
      expect(errorCode, `${descriptor.method} was catalogued but not routed`).not.toBe(-32601);
    }
  });
});
