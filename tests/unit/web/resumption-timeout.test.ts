import { describe, expect, test, vi, afterEach } from 'vitest';
import { Millis } from '@liteship/core';
import { Resumption } from '../../../packages/web/src/stream/resumption.js';

describe('ResumptionConfig.timeout (#122)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('threads timeout to recovery fetch AbortSignal', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.signal).toBeDefined();
      return new Response(JSON.stringify({ html: '<p/>', signals: {}, lastEventId: 'evt-1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    await Resumption.fetchSnapshot('art-1', { snapshotUrl: '/liteship/snapshot', timeout: Millis(50) });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
