/** Exact public-facade failure witness projected to LiteShip operators. */
import { describe, expect, it } from 'vitest';
import { defineBoundary } from '../../../packages/liteship/src/index.js';
import { CSSCompiler } from '../../../packages/liteship/src/compiler.js';
import { captureDiagnostics } from '../../helpers/diagnostics.js';

describe('liteship/compiler failure contract', () => {
  it('CSSCompiler.compile omits an unknown state and emits its registered diagnostic', () => {
    const boundary = defineBoundary({
      input: 'viewport.width',
      at: [
        [0, 'compact'],
        [768, 'expanded'],
      ],
    });

    captureDiagnostics(({ events }) => {
      const result = CSSCompiler.compile(boundary, {
        compact: { display: 'block' },
        typo: { display: 'none' },
      } as Record<string, Record<string, string>>);

      expect(result.raw).not.toContain('display: none');
      expect(events).toEqual([
        expect.objectContaining({
          source: 'liteship/compiler.css',
          code: 'compiler/css/unknown-state-key',
          message: expect.stringContaining('its CSS was skipped'),
        }),
      ]);
    });
  });
});
