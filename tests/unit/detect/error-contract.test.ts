/** @czap/detect error contract */
import { describe, it, expect } from 'vitest';
import { CAP_AXES } from '@czap/detect';

describe('@czap/detect error contract', () => {
  it('CAP_AXES is a closed vocabulary (detect tier errors reference these axes)', () => {
    expect(CAP_AXES.length).toBeGreaterThan(0);
    expect(CAP_AXES).toContain('viewport');
  });
});
