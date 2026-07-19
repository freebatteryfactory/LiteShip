/** @liteship/astro error contract — stream recovery uses core signal validation at the astro boundary. */
import { describe, it, expect } from 'vitest';
import { validateSnapshotSignalsField } from '@liteship/core';

describe('@liteship/astro error contract', () => {
  it('validateSnapshotSignalsField rejects null signals with a teachable message', () => {
    expect(validateSnapshotSignalsField(null)).toMatch(/signals/i);
  });
});
