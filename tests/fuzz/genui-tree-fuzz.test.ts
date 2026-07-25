import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { tryParseGeneratedUIChunk, type GeneratedUINode } from '@liteship/genui';

function structurallyValid(node: GeneratedUINode): boolean {
  if (
    typeof node.name !== 'string' ||
    typeof node.props !== 'object' ||
    node.props === null ||
    Array.isArray(node.props)
  ) {
    return false;
  }
  if (node.children !== undefined && !node.children.every(structurallyValid)) return false;
  if (node.slots !== undefined) {
    for (const value of Object.values(node.slots)) {
      const nodes = Array.isArray(value) ? value : [value];
      if (!nodes.every(structurallyValid)) return false;
    }
  }
  return true;
}

describe('generated UI parser fuzz boundary', () => {
  it('arbitrary UTF-8 chunks never throw or escape the typed-success validator', () => {
    fc.assert(
      fc.property(fc.uint8Array({ maxLength: 2048 }), (bytes) => {
        const parsed = tryParseGeneratedUIChunk(new TextDecoder().decode(bytes));
        if (parsed !== null) expect(structurallyValid(parsed)).toBe(true);
      }),
      { numRuns: 600 },
    );
  });

  it('JSON values with a forged marker are either structurally admitted or refused', () => {
    fc.assert(
      fc.property(fc.jsonValue({ maxDepth: 6 }), (value) => {
        const content = JSON.stringify({ _genui: true, value });
        const parsed = tryParseGeneratedUIChunk(content);
        expect(parsed === null || structurallyValid(parsed)).toBe(true);
      }),
      { numRuns: 400 },
    );
  });
});
