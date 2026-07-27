/** @liteship/cloudflare error contract */
import { describe, it, expect } from 'vitest';
import { resolveKvBinding } from '@liteship/cloudflare';

describe('@liteship/cloudflare error contract', () => {
  it('resolveKvBinding returns null when the binding is absent (caller must handle)', () => {
    expect(resolveKvBinding({}, 'BOUNDARY_CACHE')).toBeNull();
  });
});
