import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import {
  collectEventProtocol,
  renderEventProtocolDts,
  renderEventProtocolHostProjection,
  renderWebEventProjection,
  validateEventProtocolRecords,
} from '../../../scripts/lib/event-protocol-contract.js';

const root = process.cwd();

describe('fleet event protocol projection', () => {
  test('the committed projections are fresh and cover every owned identity exactly once', () => {
    const records = collectEventProtocol(root);
    expect(records).toHaveLength(32);
    expect(new Set(records.map((record) => record.name)).size).toBe(records.length);
    expect(records.every((record) => record.producers.length > 0)).toBe(true);
    expect(readFileSync('packages/_spine/events.generated.d.ts', 'utf8')).toBe(renderEventProtocolDts(records));
    const spineProjection = renderEventProtocolDts(records);
    for (const declaration of [
      'LiteShipEventOwner',
      'LiteShipEventChannel',
      'ProtocolEvent',
      'LiteShipEventMap',
      'LiteShipEventName',
      'EventDetail',
      'EventsOwnedBy',
      'EventsInChannel',
    ]) {
      const match = new RegExp(`export (?:type|interface) ${declaration}(?:[ <]|$)`).exec(spineProjection);
      expect(match, `${declaration} missing from generated projection`).not.toBeNull();
      const before = spineProjection.slice(0, match!.index).trimEnd();
      expect(before.endsWith('*/'), `${declaration} requires an adjacent JSDoc summary`).toBe(true);
      expect(before.lastIndexOf('/**')).toBeGreaterThan(before.lastIndexOf('export '));
    }
    expect(readFileSync('packages/web/src/wire/liteship-events.generated.ts', 'utf8')).toBe(
      renderWebEventProjection(records),
    );
    expect(renderWebEventProjection(records).match(/\/\/ prettier-ignore/gu)).toHaveLength(2);
    expect(readFileSync('packages/cli/src/internal/fleet-event-protocol.generated.ts', 'utf8')).toBe(
      renderEventProtocolHostProjection(records),
    );
    expect(renderEventProtocolHostProjection(records).match(/\/\/ prettier-ignore/gu)).toHaveLength(1);
  });

  test('owner/detail/channel projection is deterministic under source-order permutations', () => {
    const records = collectEventProtocol(root);
    fc.assert(
      fc.property(
        fc.shuffledSubarray(records, { minLength: records.length, maxLength: records.length }),
        (permutation) => {
          expect(renderEventProtocolDts(permutation)).toBe(renderEventProtocolDts(records));
          expect(renderWebEventProjection(permutation)).toBe(renderWebEventProjection(records));
          expect(renderEventProtocolHostProjection(permutation)).toBe(renderEventProtocolHostProjection(records));
        },
      ),
      { numRuns: 32 },
    );
  });

  test('duplicate ownership and producer-less declarations are rejected before projection', () => {
    const [first] = collectEventProtocol(root);
    expect(first).toBeDefined();
    expect(() => validateEventProtocolRecords([first!, { ...first!, owner: 'web' }])).toThrow(/duplicate/);
    expect(() => validateEventProtocolRecords([{ ...first!, producers: [] }])).toThrow(/no real producer/);
  });
});
