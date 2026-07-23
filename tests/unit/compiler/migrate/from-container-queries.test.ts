/**
 * `fromContainerQueries` preserves container identity only through an explicit
 * host mapping. It never substitutes viewport dimensions for container facts.
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { Boundary } from '@liteship/core';
import { fromContainerQueries, MIGRATE_CODES } from '@liteship/compiler/migrate';

const migrate = (css: string, options?: { readonly statePrefix?: string }): ReturnType<typeof fromContainerQueries> =>
  fromContainerQueries(css, {
    ...options,
    resolveInput: ({ name, axis }) => `custom:container.${name ?? 'nearest'}.${axis}`,
  });

describe('fromContainerQueries — explicit input ownership', () => {
  it('lowers ascending lower bounds onto the caller-resolved anonymous input', () => {
    const result = migrate(`
      @container (min-width: 0px) { .card { grid-template-columns: 1fr; } }
      @container (min-width: 768px) { .card { grid-template-columns: repeat(2, 1fr); } }
      @container (width >= 1024px) { .card { grid-template-columns: repeat(3, 1fr); } }
    `);

    expect(result.diagnostics).toEqual([]);
    expect(result.boundaries).toHaveLength(1);
    expect(result.boundaries[0]!.input).toBe('custom:container.nearest.width');
    expect([...result.boundaries[0]!.thresholds]).toEqual([0, 768, 1024]);
    expect([...result.boundaries[0]!.states]).toEqual(['bp-0', 'bp-768', 'bp-1024']);
    expect(String(result.boundaries[0]!.id)).toMatch(/^fnv1a:/);
  });

  it('preserves named-container and axis identity through the resolver', () => {
    const result = migrate(`
      @container sidebar (min-width: 0px) { .x {} }
      @container sidebar (min-width: 400px) { .x {} }
      @container main (min-height: 800px) { .y {} }
    `);

    expect(result.diagnostics).toEqual([]);
    expect(result.boundaries.map((boundary) => boundary.input)).toEqual([
      'custom:container.sidebar.width',
      'custom:container.main.height',
    ]);
  });

  it('passes the authored unit to the resolver and keeps the threshold in that unit', () => {
    const requests: unknown[] = [];
    const result = fromContainerQueries(`@container sidebar (min-width: 40rem) { .x {} }`, {
      resolveInput: (request) => {
        requests.push(request);
        return `custom:container.${request.name}.${request.axis}.${request.unit}`;
      },
    });

    expect(requests).toEqual([{ name: 'sidebar', axis: 'width', unit: 'rem' }]);
    expect(result.diagnostics).toEqual([]);
    expect(result.boundaries[0]!.input).toBe('custom:container.sidebar.width.rem');
    expect([...result.boundaries[0]!.thresholds]).toEqual([0, 40]);
  });

  it('refuses a relative threshold when the host does not map that authored unit', () => {
    const result = fromContainerQueries(`@container (min-width: 40em) { .x {} }`, {
      resolveInput: ({ unit }) => (unit === 'px' ? 'custom:container.nearest.width.px' : undefined),
    });
    expect(result.boundaries).toEqual([]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: MIGRATE_CODES.unsupportedAtRule, severity: 'error' }),
    );
  });

  it('lets differently scaled containers select distinct host inputs', () => {
    const result = fromContainerQueries(
      `
      @container compact (min-width: 40em) { .x {} }
      @container spacious (min-width: 40em) { .y {} }
    `,
      {
        resolveInput: ({ name, axis, unit }) => `custom:container.${name}.${axis}.${unit}`,
      },
    );
    expect(result.boundaries.map((boundary) => boundary.input)).toEqual([
      'custom:container.compact.width.em',
      'custom:container.spacious.width.em',
    ]);
    expect(result.boundaries.every((boundary) => boundary.thresholds[1] === 40)).toBe(true);
  });

  it('refuses one container state chain when its authored units resolve to different signals', () => {
    const result = fromContainerQueries(
      `
      @container sidebar (min-width: 400px) { .x {} }
      @container sidebar (min-width: 40em) { .y {} }
    `,
      {
        resolveInput: ({ name, axis, unit }) => `custom:container.${name}.${axis}.${unit}`,
      },
    );
    expect(result.boundaries).toEqual([]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: MIGRATE_CODES.unsupportedAtRule, severity: 'error' }),
    );
  });

  it('refuses every container group when the host supplies no mapping', () => {
    const result = fromContainerQueries(`
      @container (width >= 400px) { .x {} }
      @container sidebar (height >= 800px) { .y {} }
    `);
    expect(result.boundaries).toEqual([]);
    expect(result.diagnostics).toHaveLength(2);
    expect(result.diagnostics.every((d) => d.severity === 'error' && d.message.includes('no explicit'))).toBe(true);
  });

  it('honours statePrefix without changing the resolved input', () => {
    const result = migrate(`@container (min-width: 500px) { .x {} }`, { statePrefix: 'cq' });
    expect(result.boundaries[0]!.input).toBe('custom:container.nearest.width');
    expect([...result.boundaries[0]!.states]).toEqual(['cq-inactive', 'cq-500']);
  });

  it('models the false region below the first positive minimum without shifting active edges', () => {
    const result = migrate(`
      @container (min-width: 500px) { .x {} }
      @container (min-width: 800px) { .x {} }
    `);
    const boundary = result.boundaries[0]!;

    expect([...boundary.thresholds]).toEqual([0, 500, 800]);
    expect([...boundary.states]).toEqual(['bp-inactive', 'bp-500', 'bp-800']);
    expect(Boundary.evaluate(boundary, 499)).toBe('bp-inactive');
    expect(Boundary.evaluate(boundary, 500)).toBe('bp-500');
    expect(Boundary.evaluate(boundary, 799)).toBe('bp-500');
    expect(Boundary.evaluate(boundary, 800)).toBe('bp-800');
    expect(Boundary.evaluate(boundary, 5000)).toBe('bp-800');
  });

  it('does not synthesize an inactive state when the first source threshold is zero', () => {
    const result = migrate(`
      @container (min-width: 0px) { .x {} }
      @container (min-width: 500px) { .x {} }
    `);
    const boundary = result.boundaries[0]!;

    expect([...boundary.thresholds]).toEqual([0, 500]);
    expect([...boundary.states]).toEqual(['bp-0', 'bp-500']);
    expect(boundary.states).not.toContain('bp-inactive');
  });
});

describe('fromContainerQueries — refusal and diagnostic teeth', () => {
  it.each([
    'width < 400px',
    'width > 400px',
    'width = 400px',
    'width: 400px',
    'width <= 400px',
    '100px <= width <= 400px',
  ])('refuses strict/exact condition %s rather than changing its edge semantics', (condition) => {
    const result = migrate(`@container (${condition}) { .x {} }`);
    expect(result.boundaries).toEqual([]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: MIGRATE_CODES.unsupportedAtRule, severity: 'error' }),
    );
  });

  it('refuses a unitless nonzero length while accepting unitless zero', () => {
    const refused = migrate(`@container (min-width: 400) { .x {} }`);
    expect(refused.boundaries).toEqual([]);
    expect(refused.diagnostics[0]).toEqual(
      expect.objectContaining({ code: MIGRATE_CODES.unsupportedAtRule, severity: 'error' }),
    );

    const zero = migrate(`@container (min-width: 0) { .x {} }`);
    expect(zero.diagnostics).toEqual([]);
    expect([...zero.boundaries[0]!.thresholds]).toEqual([0]);
  });

  it.each([
    'not (width >= 400px)',
    '(width >= 200px) or (width >= 800px)',
    '(width >= 400px) and (height >= 400px)',
    '(width >= 400px) banana (width >= 800px)',
    '(orientation: landscape)',
  ])('refuses unsupported condition %s', (condition) => {
    const result = migrate(`@container ${condition} { .x {} }`);
    expect(result.boundaries).toEqual([]);
    expect(result.diagnostics.some((d) => d.code === MIGRATE_CODES.unsupportedAtRule)).toBe(true);
  });

  it('refuses non-ascending lower bounds instead of reordering CSS cascade', () => {
    const result = migrate(`
      @container (min-width: 768px) { .x {} }
      @container (min-width: 500px) { .x {} }
    `);
    expect(result.diagnostics.some((d) => d.code === MIGRATE_CODES.nonAscendingThresholds)).toBe(true);
    expect(result.boundaries).toEqual([]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: MIGRATE_CODES.nonAscendingThresholds, severity: 'error' }),
    );
  });

  it('refuses duplicate inclusive thresholds instead of collapsing their cascade identity', () => {
    const result = migrate(`
      @container (min-width: 500px) { .x {} }
      @container (min-width: 500px) { .y {} }
    `);
    expect(result.boundaries).toEqual([]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: MIGRATE_CODES.ambiguousBreakpoint, severity: 'error' }),
    );
  });

  it('refuses a finite max cutoff instead of emitting an unbounded threshold', () => {
    const result = migrate(`@container (max-width: 768px) { .x {} }`);
    expect(result.boundaries).toEqual([]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: MIGRATE_CODES.unsupportedAtRule, severity: 'error' }),
    );
  });

  it('refuses synthesized state-name collisions before construction', () => {
    const result = migrate(`
      @container (min-width: 100.2px) { .x {} }
      @container (min-width: 100.4px) { .x {} }
    `);
    expect(result.boundaries).toEqual([]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: MIGRATE_CODES.ambiguousBreakpoint, severity: 'error' }),
    );
  });

  it('refuses nested container queries atomically', () => {
    const result = migrate(`
      @container (min-width: 300px) {
        @container (min-width: 600px) { .x {} }
      }
    `);
    expect(result.boundaries).toEqual([]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: MIGRATE_CODES.unsupportedAtRule, severity: 'error' }),
    );
  });

  it('diagnoses a container query nested under another at-rule', () => {
    const result = migrate(`@supports (display: grid) { @container (min-width: 300px) { .x {} } }`);
    expect(result.boundaries).toEqual([]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: MIGRATE_CODES.unsupportedAtRule, severity: 'error' }),
    );
  });

  it('ignores markers inside comments and strings', () => {
    const result = migrate(`
      /* @container (min-width: 9999px) { .ghost {} } */
      .note::before { content: "@container (min-width: 8888px) {"; }
      @container (min-width: 300px) { .real {} }
    `);
    expect(result.diagnostics).toEqual([]);
    expect([...result.boundaries[0]!.thresholds]).toEqual([0, 300]);
  });
});

describe('fromContainerQueries — property', () => {
  it('reconstructs ascending lower-bound thresholds under an explicit mapping', () => {
    fc.assert(
      fc.property(
        fc
          .uniqueArray(fc.integer({ min: 0, max: 5000 }), { minLength: 1, maxLength: 6 })
          .map((values) => [...values].sort((a, b) => a - b)),
        (thresholds) => {
          const css = thresholds.map((value) => `@container (min-width: ${value}px) { .x {} }`).join('\n');
          const result = migrate(css);
          expect(result.diagnostics).toEqual([]);
          const expected = thresholds[0] === 0 ? thresholds : [0, ...thresholds];
          expect([...result.boundaries[0]!.thresholds]).toEqual(expected);
          const expectedStates =
            thresholds[0] === 0
              ? thresholds.map((value) => `bp-${value}`)
              : ['bp-inactive', ...thresholds.map((value) => `bp-${value}`)];
          expect([...result.boundaries[0]!.states]).toEqual(expectedStates);
        },
      ),
      { numRuns: 100 },
    );
  });
});
