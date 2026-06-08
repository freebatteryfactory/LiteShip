import { describe, it, expect } from 'vitest';
import { dispatch } from '@czap/mcp-server';
import { renderCapsuleInspectWidget } from '../../../packages/mcp-server/src/app-render.js';
import { SERVER_CAPABILITIES } from '../../../packages/mcp-server/src/capabilities.js';

describe('D10 interactive widgets', () => {
  it('SERVER_CAPABILITIES advertises ui.callServerTool', () => {
    expect(SERVER_CAPABILITIES.ui).toEqual({ callServerTool: true });
  });

  it('capsule inspect widget bridge exposes callServerTool + refresh control', () => {
    const html = renderCapsuleInspectWidget();
    expect(html).toContain('callServerTool');
    expect(html).toContain('ui/call-tool');
    expect(html).toContain('refresh-btn');
  });

  it('dispatch handles ui/call-tool by routing to tools/call', async () => {
    const response = await dispatch({
      jsonrpc: '2.0',
      id: 9,
      method: 'ui/call-tool',
      params: { name: 'capsule.list', arguments: {} },
    });
    expect(response).not.toBeNull();
    expect(response && 'result' in response).toBe(true);
  });
});
