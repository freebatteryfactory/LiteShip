import { describe, it, expect, vi } from 'vitest';
import { registerWebMcpTools, createBrowserCommandContext, browserSafeCommandNames } from '@czap/command/host-browser';

describe('WebMCP projection', () => {
  it('browserSafeCommandNames lists capsule + glossary tools', () => {
    const names = browserSafeCommandNames();
    expect(names).toContain('capsule.inspect');
    expect(names).toContain('capsule.list');
    expect(names).toContain('glossary');
  });

  it('registerWebMcpTools no-ops when navigator.modelContext is absent', () => {
    expect(registerWebMcpTools()).toBe(0);
  });

  it('registerWebMcpTools registers browser-safe tools when modelContext is present', () => {
    const tools: Array<{ name: string }> = [];
    const modelContext = {
      registerTool: (tool: { name: string }) => {
        tools.push({ name: tool.name });
      },
    };
    vi.stubGlobal('navigator', { modelContext });
    const count = registerWebMcpTools({
      context: createBrowserCommandContext({ manifestSource: () => '{"capsules":[]}' }),
    });
    expect(count).toBeGreaterThan(0);
    expect(tools.map((t) => t.name)).toContain('capsule.inspect');
    vi.unstubAllGlobals();
  });
});
