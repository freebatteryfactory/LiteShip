import { describe, expect, test, vi } from 'vitest';
import { Boundary, BoundarySpec, Diagnostics, defineBoundary } from '@liteship/core';

describe('defineBoundary', () => {
  test('creates a content-addressed boundary from ascending thresholds', () => {
    const boundary = defineBoundary({
      input: 'viewport.width',
      at: [
        [0, 'mobile'],
        [768, 'tablet'],
        [1280, 'desktop'],
      ] as const,
      hysteresis: 24,
    });

    expect(boundary._tag).toBe('BoundaryDef');
    expect(boundary._version).toBe(1);
    expect(boundary.id).toMatch(/^fnv1a:/);
    expect(boundary.hysteresis).toBe(24);
  });

  test('changes content address when spec changes', () => {
    const base = defineBoundary({
      input: 'viewport.width',
      at: [
        [0, 'mobile'],
        [768, 'tablet'],
      ] as const,
    });

    const withSpec = defineBoundary({
      input: 'viewport.width',
      at: [
        [0, 'mobile'],
        [768, 'tablet'],
      ] as const,
      spec: {
        experimentId: 'exp-a',
      },
    });

    expect(withSpec.id).not.toBe(base.id);
  });

  test('rejects non-ascending thresholds', () => {
    expect(() =>
      defineBoundary({
        input: 'viewport.width',
        at: [
          [0, 'mobile'],
          [768, 'tablet'],
          [768, 'desktop'],
        ] as const,
      }),
    ).toThrow(/strictly ascending/);
  });

  test('non-ascending threshold error includes a copy-pasteable reorder of the user pairs', () => {
    expect(() =>
      defineBoundary({
        input: 'viewport.width',
        at: [
          [768, 'lg'],
          [0, 'sm'],
        ] as const,
      }),
    ).toThrow(
      "Got 768 before 0 at index 1. Reorder your `at:` pairs so thresholds increase: at: [[0, 'sm'], [768, 'lg']].",
    );
  });

  test('rejects duplicate state names', () => {
    expect(() =>
      defineBoundary({
        input: 'viewport.width',
        at: [
          [0, 'mobile'],
          [768, 'mobile'],
        ] as const,
      }),
    ).toThrow(/duplicate state name/);
  });

  test('duplicate state error names the state, the rename fix, and the hoist hint', () => {
    expect(() =>
      defineBoundary({
        input: 'viewport.width',
        at: [
          [0, 'small'],
          [768, 'small'],
        ] as const,
      }),
    ).toThrow(
      "defineBoundary: duplicate state name \"small\" (used by two thresholds). Each threshold needs its own state — rename one, e.g. at: [[0, 'small'], [768, 'medium']]. If this throws mid-render, the boundary was constructed inside a render function; hoist it to module scope.",
    );
  });

  test('warnOnce when scroll.progress thresholds exceed 1 (#104)', () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);
    try {
      defineBoundary({
        input: 'scroll.progress',
        at: [
          [0, 'a'],
          [1.2, 'b'],
        ] as const,
      });
      const warns = events.filter((e) => e.code === 'core/boundary/scroll-progress-threshold-scale');
      expect(warns).toHaveLength(1);
      expect(warns[0]?.message).toMatch(/0\.\.1/);
    } finally {
      Diagnostics.reset();
    }
  });

  test('warnOnce when audio thresholds exceed the normalized 0..1 domain', () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);
    try {
      defineBoundary({
        input: 'audio.amplitude',
        at: [
          [0, 'quiet'],
          [2, 'loud'],
        ] as const,
      });
      const warns = events.filter((event) => event.code === 'core/boundary/audio-threshold-scale');
      expect(warns).toHaveLength(1);
      expect(warns[0]?.message).toMatch(/normalize to 0\.\.1/);
    } finally {
      Diagnostics.reset();
    }
  });
});

describe('Boundary.evaluate', () => {
  const boundary = defineBoundary({
    input: 'viewport.width',
    at: [
      [0, 'mobile'],
      [768, 'tablet'],
      [1280, 'desktop'],
    ] as const,
  });

  test('returns the first state below the first threshold crossing', () => {
    expect(Boundary.evaluate(boundary, 320)).toBe('mobile');
  });

  test('returns the matching middle and upper states', () => {
    expect(Boundary.evaluate(boundary, 900)).toBe('tablet');
    expect(Boundary.evaluate(boundary, 1600)).toBe('desktop');
  });
});

describe('Boundary.evaluateWithHysteresis', () => {
  const boundary = defineBoundary({
    input: 'viewport.width',
    at: [
      [0, 'mobile'],
      [768, 'tablet'],
      [1280, 'desktop'],
    ] as const,
    hysteresis: 40,
  });

  test('falls back to raw evaluation when hysteresis is disabled or previous state is unknown', () => {
    const noHysteresis = defineBoundary({
      input: 'viewport.width',
      at: [
        [0, 'mobile'],
        [768, 'tablet'],
      ] as const,
    });

    expect(Boundary.evaluateWithHysteresis(noHysteresis, 900, 'mobile')).toBe('tablet');
    expect(Boundary.evaluateWithHysteresis(boundary, 900, 'unknown' as never)).toBe('tablet');
  });

  test('suppresses upward crossings inside the dead zone', () => {
    expect(Boundary.evaluateWithHysteresis(boundary, 780, 'mobile')).toBe('mobile');
    expect(Boundary.evaluateWithHysteresis(boundary, 789, 'mobile')).toBe('tablet');
  });

  test('suppresses downward crossings inside the dead zone', () => {
    expect(Boundary.evaluateWithHysteresis(boundary, 1265, 'desktop')).toBe('desktop');
    expect(Boundary.evaluateWithHysteresis(boundary, 1200, 'desktop')).toBe('tablet');
  });
});

describe('Boundary.isActive / BoundarySpec.isActive', () => {
  test('defineBoundary retains a host-only deviceFilter without encoding the function into its portable id', () => {
    const deviceFilter = (capabilities: Record<string, unknown>) => capabilities['gpu'] === true;
    const withFilter = defineBoundary({
      input: 'viewport.width',
      at: [[0, 'ready']],
      spec: { deviceFilter, experimentId: 'gpu-test' },
    });
    const portableTwin = defineBoundary({
      input: 'viewport.width',
      at: [[0, 'ready']],
      spec: { experimentId: 'gpu-test' },
    });

    expect(withFilter.spec?.deviceFilter).toBe(deviceFilter);
    expect(withFilter.id).toBe(portableTwin.id);
    expect(Boundary.isActive(withFilter, { capabilities: { gpu: false }, activeExperiments: ['gpu-test'] })).toBe(
      false,
    );
  });

  test('snapshots and recursively freezes authored arrays and portable activation fields', () => {
    const at: [number, 'off' | 'on'][] = [
      [0, 'off'],
      [800, 'on'],
    ];
    const timeRange = { from: 100, until: 200 };
    const spec = {
      timeRange,
      experimentId: 'gpu-test',
      deviceFilter: (capabilities: Record<string, unknown>) => capabilities['gpu'] === true,
    };
    const boundary = defineBoundary({ input: 'device.width', at, spec });
    const id = boundary.id;

    at[1]![0] = 1200;
    timeRange.from = 999;
    spec.experimentId = 'poisoned';

    expect(boundary.id).toBe(id);
    expect(boundary.thresholds).toEqual([0, 800]);
    expect(boundary.spec?.timeRange).toEqual({ from: 100, until: 200 });
    expect(boundary.spec?.experimentId).toBe('gpu-test');
    expect(Object.isFrozen(boundary)).toBe(true);
    expect(Object.isFrozen(boundary.thresholds)).toBe(true);
    expect(Object.isFrozen(boundary.states)).toBe(true);
    expect(Object.isFrozen(boundary.spec)).toBe(true);
    expect(Object.isFrozen(boundary.spec?.timeRange)).toBe(true);
    expect(() => ((boundary.thresholds as number[])[1] = 1200)).toThrow();
    expect(() => ((boundary.spec!.timeRange as { from: number }).from = 999)).toThrow();
  });

  test('returns true when no spec is present', () => {
    const boundary = defineBoundary({
      input: 'viewport.width',
      at: [
        [0, 'mobile'],
        [768, 'tablet'],
      ] as const,
    });

    expect(Boundary.isActive(boundary)).toBe(true);
  });

  test('respects device, time-range, and experiment filters', () => {
    const spec = {
      deviceFilter: (capabilities: Record<string, unknown>) => capabilities['gpu'] === true,
      timeRange: { from: 100, until: 200 },
      experimentId: 'exp-a',
    };

    expect(
      BoundarySpec.isActive(spec, {
        capabilities: { gpu: true },
        nowMs: 150,
        activeExperiments: ['exp-a'],
      }),
    ).toBe(true);

    expect(
      BoundarySpec.isActive(spec, {
        capabilities: { gpu: false },
        nowMs: 150,
        activeExperiments: ['exp-a'],
      }),
    ).toBe(false);

    expect(
      BoundarySpec.isActive(spec, {
        capabilities: { gpu: true },
        nowMs: 250,
        activeExperiments: ['exp-a'],
      }),
    ).toBe(false);

    expect(
      BoundarySpec.isActive(spec, {
        capabilities: { gpu: true },
        nowMs: 150,
        activeExperiments: ['exp-b'],
      }),
    ).toBe(false);
  });

  test('treats missing time windows as open-ended and rejects values before the start time', () => {
    expect(
      BoundarySpec.isActive(
        {
          timeRange: { from: 100 },
        },
        {
          nowMs: 99,
        },
      ),
    ).toBe(false);

    expect(
      BoundarySpec.isActive(
        {
          experimentId: 'exp-b',
        },
        {
          activeExperiments: ['exp-b'],
        },
      ),
    ).toBe(true);
  });

  test('treats missing context as non-blocking except for time ranges and uses Date.now fallback', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(150);
    const spec = {
      deviceFilter: () => false,
      timeRange: { from: 100, until: 200 },
      experimentId: 'exp-a',
    } satisfies BoundarySpec;

    expect(BoundarySpec.isActive(spec)).toBe(true);
    expect(BoundarySpec.isActive({ timeRange: { until: 125 } })).toBe(false);

    nowSpy.mockRestore();
  });
});
