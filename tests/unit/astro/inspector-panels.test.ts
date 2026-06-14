/**
 * Pure helpers for the inspector's "full" panels (0.2.0): active casts,
 * escalation, and the read-only DocumentGraph peek. All deterministic — no DOM,
 * no live event subscription — so they pin the LAWS the panels render.
 */

import { describe, expect, test } from 'vitest';
import type { BoundaryStateDetail, SerializedBoundary } from '../../../packages/astro/src/runtime/boundary.js';
import {
  authoredTargetsFromPayload,
  buildGraphPeek,
  castValueRows,
  deriveActiveTargets,
  escalationViewForTargets,
  formatCastValueRow,
  formatGraphNodeRow,
  readBoundaryPayload,
  readInjectedPayload,
  requiredRungForTargets,
  shortContentAddress,
  type CastTarget,
  type ElementCastSnapshot,
} from '../../../packages/astro/src/runtime/inspector-panels.js';

const emptyDetail = (): BoundaryStateDetail => ({ discrete: {}, css: {}, glsl: {}, wgsl: {}, aria: {} });

const snapshot = (over: Partial<ElementCastSnapshot> = {}): ElementCastSnapshot => ({
  shaderType: null,
  authoredTargets: new Set<CastTarget>(),
  cssCustomProps: [],
  ariaAttrs: [],
  detail: null,
  ...over,
});

describe('readBoundaryPayload', () => {
  test('parses a valid payload and returns null on malformed JSON', () => {
    expect(readBoundaryPayload('{"input":"viewport.width"}')?.input).toBe('viewport.width');
    expect(readBoundaryPayload('{not json')).toBeNull();
    expect(readBoundaryPayload(null)).toBeNull();
    expect(readBoundaryPayload('"a string"')).toBeNull();
  });
});

describe('authoredTargetsFromPayload', () => {
  test('reports a target only when its authored map has entries', () => {
    const payload: Partial<SerializedBoundary> = {
      input: 'viewport.width',
      stateAttributes: { mobile: { 'aria-expanded': 'false' } },
      glslStateUniforms: { mobile: { u_blur: 1 } },
      stateWgsl: {},
    };
    const targets = authoredTargetsFromPayload(payload);
    expect(targets.has('aria')).toBe(true);
    expect(targets.has('glsl')).toBe(true);
    expect(targets.has('wgsl')).toBe(false); // empty map → not active
    expect(authoredTargetsFromPayload(null).size).toBe(0);
  });
});

describe('deriveActiveTargets', () => {
  test('derives nothing for a bare boundary with no casts', () => {
    expect(deriveActiveTargets(snapshot())).toEqual([]);
  });

  test('css from a live custom prop; glsl from shader-type; aria from a live attr', () => {
    const active = deriveActiveTargets(
      snapshot({
        shaderType: 'glsl',
        cssCustomProps: ['--czap-blur'],
        ariaAttrs: ['aria-expanded'],
      }),
    );
    const byTarget = Object.fromEntries(active.map((a) => [a.target, a.evidence]));
    expect(byTarget.css).toContain('custom prop');
    expect(byTarget.glsl).toContain('shader-type');
    expect(byTarget.aria).toContain('aria/role');
  });

  test('wgsl from an emitted detail map; svg only from shader-type', () => {
    const detail = { ...emptyDetail(), wgsl: { blur_radius: 2 } };
    const active = deriveActiveTargets(snapshot({ detail }));
    expect(active.map((a) => a.target)).toContain('wgsl');

    const svg = deriveActiveTargets(snapshot({ shaderType: 'svg' }));
    expect(svg.map((a) => a.target)).toEqual(['svg']);
  });
});

describe('formatCastValueRow / castValueRows', () => {
  test('rounds numeric uniforms to 3 decimals and passes strings through', () => {
    expect(formatCastValueRow('u_blur', 1.23456)).toBe('u_blur = 1.235');
    expect(formatCastValueRow('role', 'button')).toBe('role = button');
  });

  test('castValueRows reads the per-target map and sorts keys', () => {
    const detail: BoundaryStateDetail = {
      ...emptyDetail(),
      glsl: { u_zed: 1, u_alpha: 2 },
    };
    expect(castValueRows('glsl', detail)).toEqual(['u_alpha = 2', 'u_zed = 1']);
    expect(castValueRows('glsl', null)).toEqual([]);
    expect(castValueRows('css', detail)).toEqual([]);
  });
});

describe('requiredRungForTargets', () => {
  test('maps targets to the minimal admitting rung (monotone ladder)', () => {
    expect(requiredRungForTargets([])).toBe('static');
    expect(requiredRungForTargets(['aria'])).toBe('static');
    expect(requiredRungForTargets(['css'])).toBe('styled');
    expect(requiredRungForTargets(['svg'])).toBe('styled');
    expect(requiredRungForTargets(['glsl'])).toBe('animated');
    expect(requiredRungForTargets(['wgsl'])).toBe('gpu');
    // The required rung is the MAX over targets.
    expect(requiredRungForTargets(['aria', 'css', 'wgsl'])).toBe('gpu');
  });
});

describe('escalationViewForTargets (real chooseRung)', () => {
  test('a glsl boundary chooses the animated rung and admits glsl', () => {
    const view = escalationViewForTargets(['glsl'], 'browser');
    expect(view.requiredRung).toBe('animated');
    expect(view.chosenRung).toBe('animated');
    expect(view.admittedTargets).toContain('glsl');
    expect(view.admittedTargets).toContain('css');
    expect(view.reason).toContain("admits rung 'animated'");
  });

  test('an aria-only boundary chooses static and admits aria', () => {
    const view = escalationViewForTargets(['aria'], 'browser');
    expect(view.chosenRung).toBe('static');
    expect(view.admittedTargets).toEqual(['aria']);
  });
});

describe('shortContentAddress', () => {
  test('truncates the fnv1a body while preserving the prefix', () => {
    expect(shortContentAddress('fnv1a:0123456789abcdef')).toBe('fnv1a:01234567…');
    expect(shortContentAddress('fnv1a:short')).toBe('fnv1a:short');
  });
});

describe('formatGraphNodeRow', () => {
  test('labels each node family and exposes a short id', () => {
    const peek = buildGraphPeek([
      {
        payload: { id: 'hero', input: 'viewport.width', thresholds: [0, 768], states: ['compact', 'wide'] },
        targets: ['css', 'aria'],
      },
    ]);
    const families = peek.nodes.map((n) => n.family).sort();
    expect(families).toEqual(['component', 'projection', 'projection', 'signal']);
    const signal = peek.nodes.find((n) => n.family === 'signal')!;
    expect(signal.label).toContain('viewport.width');
    expect(signal.shortId.startsWith('fnv1a:')).toBe(true);
    const component = peek.nodes.find((n) => n.family === 'component')!;
    expect(formatGraphNodeRow).toBeTypeOf('function');
    expect(component.label).toContain('hero');
  });
});

describe('buildGraphPeek (real content addressing)', () => {
  test('structurally-equal boundaries dedup by content address', () => {
    const entry = {
      payload: { id: 'hero', input: 'viewport.width', thresholds: [0, 768], states: ['compact', 'wide'] },
      targets: ['css'] as CastTarget[],
    };
    const peek = buildGraphPeek([entry, { ...entry }]);
    // Two identical boundaries collapse to one signal + one component + one css projection.
    expect(peek.nodes.filter((n) => n.family === 'signal')).toHaveLength(1);
    expect(peek.nodes.filter((n) => n.family === 'component')).toHaveLength(1);
    expect(peek.nodes.filter((n) => n.family === 'projection')).toHaveLength(1);
    // signal→component + component→projection, deduped.
    expect(peek.edges).toHaveLength(2);
  });

  test('skips boundaries without a string input and svg targets', () => {
    const peek = buildGraphPeek([
      { payload: { states: ['a'] }, targets: ['css'] },
      { payload: { input: 'viewport.width', states: ['a'] }, targets: ['svg'] },
    ]);
    // First entry skipped (no input); second yields signal + component, no projection (svg not an IR target).
    expect(peek.nodes.map((n) => n.family).sort()).toEqual(['component', 'signal']);
  });

  test('is deterministic: same input → same content addresses', () => {
    const make = () =>
      buildGraphPeek([{ payload: { id: 'x', input: 'scroll.y', states: ['a', 'b'] }, targets: ['glsl'] } as const]);
    expect(make().nodes.map((n) => n.id)).toEqual(make().nodes.map((n) => n.id));
  });
});

describe('readInjectedPayload', () => {
  test('reads a provided payload and returns null otherwise', () => {
    expect(readInjectedPayload({})).toBeNull();
    expect(readInjectedPayload({ __CZAP_INSPECTOR__: undefined })).toBeNull();
    const payload = { graph: { nodes: [], edges: [] } };
    expect(readInjectedPayload({ __CZAP_INSPECTOR__: payload })).toBe(payload);
  });
});
