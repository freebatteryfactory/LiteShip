/** Property laws for the cold-CI workflow output and evidence-ingress contract. */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  deliveryEvidenceDownloadFindings,
  scanDeliveryEvidenceDownloads,
  scanWorkflowOutputHeredocs,
} from '../../scripts/lib/workflow-output-contract.js';

const yamlScalar = (value: string, quote: 'bare' | 'single' | 'double'): string => {
  if (quote === 'single') return `'${value}'`;
  if (quote === 'double') return `"${value}"`;
  return value;
};

function downloadStep(options: {
  readonly path: string;
  readonly nameFirst: boolean;
  readonly quote: 'bare' | 'single' | 'double';
  readonly indent: number;
}): string {
  const prefix = ' '.repeat(options.indent);
  const fields = [
    `${prefix}    name: ${yamlScalar('delivery-evidence-candidates', options.quote)}`,
    `${prefix}    path: ${yamlScalar(options.path, options.quote)}`,
  ];
  if (!options.nameFirst) fields.reverse();
  return [`${prefix}- uses: actions/download-artifact@pinned`, `${prefix}  with:`, ...fields].join('\n');
}

describe('workflow evidence-ingress properties', () => {
  it('admits reports independent of YAML indentation, field order, and scalar quoting', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.constantFrom('bare' as const, 'single' as const, 'double' as const),
        fc.integer({ min: 2, max: 12 }),
        (nameFirst, quote, indent) => {
          const subjects = scanDeliveryEvidenceDownloads(
            'fixture.yml',
            downloadStep({ path: 'reports', nameFirst, quote, indent }),
          );
          expect(subjects).toHaveLength(1);
          expect(subjects[0]!.path).toBe('reports');
          expect(deliveryEvidenceDownloadFindings(subjects)).toEqual([]);
        },
      ),
      { seed: 0xd311e7, numRuns: 100 },
    );
  });

  it('refuses every non-reports restoration path under the same YAML variations', () => {
    const hostilePath = fc
      .string({ minLength: 1, maxLength: 24, unit: fc.constantFrom('.', '/', 'a', 'z', '-', '_') })
      .filter((path) => path !== 'reports');
    fc.assert(
      fc.property(
        hostilePath,
        fc.boolean(),
        fc.constantFrom('bare' as const, 'single' as const, 'double' as const),
        (path, nameFirst, quote) => {
          const subjects = scanDeliveryEvidenceDownloads(
            'fixture.yml',
            downloadStep({ path, nameFirst, quote, indent: 6 }),
          );
          expect(deliveryEvidenceDownloadFindings(subjects)).toContainEqual(
            expect.objectContaining({ kind: 'delivery-evidence-outside-reports' }),
          );
        },
      ),
      { seed: 0xbad1e55, numRuns: 150 },
    );
  });

  it('refuses duplicate candidate downloads even when both paths are otherwise valid', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 8 }), (count) => {
        const workflow = Array.from({ length: count }, () =>
          downloadStep({ path: 'reports', nameFirst: true, quote: 'bare', indent: 6 }),
        ).join('\n');
        const findings = deliveryEvidenceDownloadFindings(scanDeliveryEvidenceDownloads('fixture.yml', workflow));
        expect(findings).toContainEqual(expect.objectContaining({ kind: 'duplicate-delivery-evidence-download' }));
      }),
      { seed: 0xd0b1e, numRuns: 50 },
    );
  });
});

describe('workflow heredoc shell-form properties', () => {
  it('rejects every executable shell form inside an otherwise emitting heredoc', () => {
    const form = fc.constantFrom(
      'echo "$(false)"',
      'echo `false`',
      'echo "$value" && false',
      'echo "$value" || false',
      'echo "$value"; false',
      'echo "$value" | false',
      'echo <(false)',
      'echo >(false)',
    );
    fc.assert(
      fc.property(form, (interior) => {
        const workflow = ['echo "value<<SAFE_EOF"', interior, 'echo "SAFE_EOF"'].join('\n');
        expect(scanWorkflowOutputHeredocs('fixture.yml', workflow).findings).toContainEqual(
          expect.objectContaining({ kind: 'fallible-interior-command', text: interior }),
        );
      }),
      { seed: 0xfa11ab1e, numRuns: 80 },
    );
  });

  it('does not mistake inert shell punctuation in a single-quoted payload for execution', () => {
    fc.assert(
      fc.property(fc.constantFrom('$(', '`', '&&', '||', ';', '|', '<(', '>('), (punctuation) => {
        const workflow = ['echo "value<<SAFE_EOF"', `printf '%s\\n' '${punctuation}'`, 'echo "SAFE_EOF"'].join('\n');
        expect(scanWorkflowOutputHeredocs('fixture.yml', workflow).findings).toEqual([]);
      }),
      { seed: 0x51afe, numRuns: 80 },
    );
  });
});
