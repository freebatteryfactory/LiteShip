/**
 * Property laws for domain-directory graduation: a module stays a top-level `src/` file until a
 * SECOND module about the same subject appears — the second module earns the directory, not the first.
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { evaluateDomainDirectory } from '../../scripts/lib/source-layout-contract.js';

describe('source-layout graduation laws', () => {
  it('counts only real content modules across arbitrary facade/noise combinations', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 8 }),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        (contentCount, nestedFacade, declaration, windowsSeparators, hasFacade) => {
          const slash = windowsSeparators ? '\\' : '/';
          const content = Array.from({ length: contentCount }, (_, index) => `owner-${index}.ts`);
          const paths = [
            'index.ts',
            ...(nestedFacade ? [`nested${slash}index.ts`] : []),
            ...(declaration ? ['protocol.d.ts'] : []),
            ...content,
          ];
          const finding = evaluateDomainDirectory({
            directory: `packages${slash}faux${slash}src${slash}domain`,
            facade: hasFacade ? `packages${slash}faux${slash}src${slash}domain${slash}index.ts` : null,
            contentModules: paths,
          });

          if (contentCount >= 2) {
            expect(finding).toBeUndefined();
          } else {
            expect(finding?.contentModules).toEqual(content);
            expect(finding?.directory).toBe('packages/faux/src/domain');
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
