/** @czap/vite error contract */
import { describe, it, expect } from 'vitest';
import { fileExists } from '@czap/vite';

describe('@czap/vite error contract', () => {
  it('fileExists rejects non-string paths with TypeError', () => {
    expect(() => fileExists(42 as unknown as string, 'czap/vite.test')).toThrow(TypeError);
  });
});
