/** @liteship/vite error contract */
import { describe, it, expect } from 'vitest';
import { fileExists } from '@liteship/vite';

describe('@liteship/vite error contract', () => {
  it('fileExists rejects non-string paths with TypeError', () => {
    expect(() => fileExists(42 as unknown as string, 'liteship/vite.test')).toThrow(TypeError);
  });
});
