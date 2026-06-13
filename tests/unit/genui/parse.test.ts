/**
 * Generated UI chunk parsing tests.
 */

import { describe, expect, it } from 'vitest';
import { tryParseGeneratedUIChunk } from '@czap/genui';

describe('tryParseGeneratedUIChunk', () => {
  it('parses discriminated JSON trees', () => {
    const node = tryParseGeneratedUIChunk(
      JSON.stringify({ _genui: true, name: 'Text', props: { text: 'hi' } }),
    );
    expect(node).toEqual({ name: 'Text', props: { text: 'hi' } });
  });

  it('returns null for legacy token text', () => {
    expect(tryParseGeneratedUIChunk('hello world')).toBeNull();
  });

  it('returns null when discriminator is absent', () => {
    expect(tryParseGeneratedUIChunk(JSON.stringify({ name: 'Text', props: {} }))).toBeNull();
  });
});
