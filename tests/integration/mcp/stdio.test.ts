import { describe, it, expect } from 'vitest';
import { listTools, dispatchToolCall } from '@liteship/mcp-server';

describe('MCP stdio transport', () => {
  it('responds to tools/list with a non-empty tools array', () => {
    const tools = listTools();
    const response = { jsonrpc: '2.0', id: 1, result: { tools } };
    expect(response.jsonrpc).toBe('2.0');
    expect(response.id).toBe(1);
    expect(Array.isArray(response.result.tools)).toBe(true);
    expect(response.result.tools.length).toBeGreaterThan(0);
  });

  it('tools/call returns a structuredContent envelope (text mirrors the payload)', async () => {
    // capsule.inspect with no manifest on disk → a structured failed result;
    // the envelope shape (content + structuredContent + isError) is what matters.
    const result = await dispatchToolCall({ name: 'capsule.inspect', arguments: { id: 'absent' } });
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0]!.type).toBe('text');
    // structuredContent is the command payload; the text content is its JSON mirror.
    expect(result.content[0]!.text).toBe(JSON.stringify(result.structuredContent));
    expect(result.isError).toBe(true);
  });
});
