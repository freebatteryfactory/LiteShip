import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { escapeMarkdownTableCell } from '../../../scripts/audit/report.js';

describe('audit Markdown table-cell escaping', () => {
  test('escapes every pipe and backslash and normalizes line endings', () => {
    expect(escapeMarkdownTableCell('a\\b|c\r\nd\ne\rf')).toBe('a\\\\b\\|c<br>d<br>e<br>f');
  });

  test('is deterministic and leaves no raw line break', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 512 }), (value) => {
        const escaped = escapeMarkdownTableCell(value);
        expect(escapeMarkdownTableCell(value)).toBe(escaped);
        expect(escaped).not.toContain('\n');
        expect(escaped).not.toContain('\r');
      }),
      { seed: 0xa0d17, numRuns: 128 },
    );
  });
});
