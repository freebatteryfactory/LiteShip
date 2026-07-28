import { posix } from 'node:path';
import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import {
  relativePhysicalPath,
  type PhysicalPathSemantics,
} from '../../packages/cli/src/internal/physical-path.js';

describe('physical path identity properties', () => {
  test('alias spelling cannot change containment or the relative physical path', () => {
    fc.assert(
      fc.property(
        fc.array(fc.stringMatching(/^[A-Za-z0-9 _-]{1,12}$/), { minLength: 1, maxLength: 5 }),
        (segments) => {
          const logicalRoot = '/var/folders/liteship';
          const physicalRoot = '/private/var/folders/liteship';
          const suffix = segments.join('/');
          const logicalCandidate = `${logicalRoot}/${suffix}`;
          const physicalCandidate = `${physicalRoot}/${suffix}`;
          const aliases: Record<string, string> = {
            [logicalRoot]: physicalRoot,
            [logicalCandidate]: physicalCandidate,
          };
          const semantics: PhysicalPathSemantics = {
            path: posix,
            realpath: (value) => aliases[value] ?? value,
          };
          expect(relativePhysicalPath(logicalRoot, logicalCandidate, semantics)).toBe(suffix);
          expect(relativePhysicalPath(physicalRoot, physicalCandidate, semantics)).toBe(suffix);
        },
      ),
      { seed: 0x51a5c0de, numRuns: 120 },
    );
  });
});
