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

  it('returns null for malformed JSON without throwing', () => {
    expect(tryParseGeneratedUIChunk('{not json')).toBeNull();
  });

  it('returns null when children is not an array', () => {
    expect(
      tryParseGeneratedUIChunk(JSON.stringify({ _genui: true, name: 'Text', props: {}, children: 'nope' })),
    ).toBeNull();
  });

  it('returns null when slots is not a plain object', () => {
    expect(
      tryParseGeneratedUIChunk(JSON.stringify({ _genui: true, name: 'Text', props: {}, slots: [] })),
    ).toBeNull();
  });

  it('returns null when name is not a string', () => {
    expect(
      tryParseGeneratedUIChunk(JSON.stringify({ _genui: true, name: 42, props: {} })),
    ).toBeNull();
  });

  it('returns null when props is not a plain object', () => {
    expect(
      tryParseGeneratedUIChunk(JSON.stringify({ _genui: true, name: 'Text', props: 'nope' })),
    ).toBeNull();
  });

  it('returns null for content that does not start with {', () => {
    expect(tryParseGeneratedUIChunk('  [1,2,3]')).toBeNull();
  });

  it('accepts a valid nested children array', () => {
    const node = tryParseGeneratedUIChunk(
      JSON.stringify({
        _genui: true,
        name: 'Card',
        props: { title: 'x' },
        children: [{ name: 'Text', props: { text: 'hi' } }],
      }),
    );
    expect(node).not.toBeNull();
    expect(node?.children?.[0]?.name).toBe('Text');
  });

  it('returns null when a child node is malformed', () => {
    expect(
      tryParseGeneratedUIChunk(
        JSON.stringify({ _genui: true, name: 'Card', props: {}, children: [{ name: 'Text' }] }),
      ),
    ).toBeNull();
  });

  it('accepts a valid single-node slot value', () => {
    const node = tryParseGeneratedUIChunk(
      JSON.stringify({
        _genui: true,
        name: 'Panel',
        props: {},
        slots: { header: { name: 'Text', props: { text: 'h' } } },
      }),
    );
    expect(node).not.toBeNull();
  });

  it('returns null when a single-node slot value is malformed', () => {
    expect(
      tryParseGeneratedUIChunk(
        JSON.stringify({ _genui: true, name: 'Panel', props: {}, slots: { header: { name: 'Text' } } }),
      ),
    ).toBeNull();
  });

  it('accepts a valid array slot value', () => {
    const node = tryParseGeneratedUIChunk(
      JSON.stringify({
        _genui: true,
        name: 'Panel',
        props: {},
        slots: { body: [{ name: 'Text', props: { text: 'a' } }] },
      }),
    );
    expect(node).not.toBeNull();
  });

  it('returns null when an array slot contains a malformed node', () => {
    expect(
      tryParseGeneratedUIChunk(
        JSON.stringify({ _genui: true, name: 'Panel', props: {}, slots: { body: [{ name: 'Text' }] } }),
      ),
    ).toBeNull();
  });
});
