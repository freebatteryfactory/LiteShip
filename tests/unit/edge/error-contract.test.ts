/** @liteship/edge error contract */
import { describe, it, expect } from 'vitest';
import { resolveOutputsByTier } from '@liteship/edge';

describe('@liteship/edge error contract', () => {
  it('resolveOutputsByTier rejects legacy manifest shapes with _version: 2 teaching', () => {
    const legacy = {
      outputs: [],
      outputsByTier: {
        'transitions:standard': { css: 'x', propertyRegistrations: '', containerQueries: 'x' },
      },
    } as unknown as Parameters<typeof resolveOutputsByTier>[0];

    expect(() => resolveOutputsByTier(legacy)).toThrow(/_version: 2/);
  });
});
