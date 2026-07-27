// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from 'vitest';
import { handleHMR, isHMRPayload } from '@liteship/vite';

const previousId = 'fnv1a:11111111';
const nextId = 'fnv1a:22222222';

function identity(id: string) {
  return { id, input: 'viewport.width', thresholds: [0, 768], states: ['compact', 'wide'] };
}

function payload(overrides: Record<string, unknown> = {}) {
  return {
    type: 'liteship:update',
    boundaryName: 'hero',
    previousBoundaryId: previousId,
    boundary: identity(nextId),
    manifest: {
      id: nextId,
      outputs: [
        {
          css: '.hero { color: red; }',
          propertyRegistrations: '',
          containerQueries: '',
          glsl: { declarations: '', uniformValues: { u_progress: 0.75 } },
        },
      ],
      outputsByTier: { 'transitions:standard': 0 },
    },
    ...overrides,
  };
}

function appendHost(id = previousId): HTMLElement {
  const host = document.createElement('div');
  host.setAttribute('data-liteship-boundary', JSON.stringify({ ...identity(id), component: 'hero-card' }));
  document.body.appendChild(host);
  return host;
}

beforeEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  document.documentElement.setAttribute('data-liteship-motion', 'transitions');
  document.documentElement.setAttribute('data-liteship-design', 'standard');
});

describe('@liteship/vite canonical boundary HMR', () => {
  test('applies producer-shaped payloads by content address and preserves host extras', () => {
    const host = appendHost();
    const uniformDetails: unknown[] = [];
    let reinitializations = 0;
    host.addEventListener('liteship:uniform-update', ((event: CustomEvent) =>
      uniformDetails.push(event.detail)) as EventListener);
    host.addEventListener('liteship:reinit', () => reinitializations++);

    expect(handleHMR(payload())).toBe(1);

    const parsed = JSON.parse(host.getAttribute('data-liteship-boundary')!) as Record<string, unknown>;
    expect(parsed).toMatchObject({ id: nextId, component: 'hero-card' });
    expect(document.querySelector(`style[data-liteship-hmr-boundary="${nextId}"]`)?.textContent).toContain(
      'color: red',
    );
    expect(uniformDetails).toEqual([{ glsl: { u_progress: 0.75 } }]);
    expect(reinitializations).toBe(1);
  });

  test('uses canonical identity rather than selector-sensitive export names', () => {
    const host = appendHost();
    expect(handleHMR(payload({ boundaryName: 'hero\"] * { color: hotpink } /*' }))).toBe(1);
    expect(JSON.parse(host.getAttribute('data-liteship-boundary')!).id).toBe(nextId);
  });

  test.each([
    ['foreign event', { ...payload(), type: 'foreign:update' }],
    ['stale identity', { ...payload(), previousBoundaryId: 'fnv1a:99999999' }],
    ['foreign manifest identity', { ...payload(), manifest: { ...payload().manifest, id: 'fnv1a:99999999' } }],
    ['malformed output', { ...payload(), manifest: { ...payload().manifest, outputs: [{}] } }],
    [
      'out-of-range tier projection',
      { ...payload(), manifest: { ...payload().manifest, outputsByTier: { 'transitions:standard': 8 } } },
    ],
  ])('keeps the DOM inert for %s', (_label, candidate) => {
    const host = appendHost();
    const before = host.outerHTML;
    expect(handleHMR(candidate)).toBe(0);
    expect(host.outerHTML).toBe(before);
    expect(document.querySelector('style[data-liteship-hmr-boundary]')).toBeNull();
  });

  test('fails closed when the rendered tier has no compiled output', () => {
    const host = appendHost();
    document.documentElement.setAttribute('data-liteship-design', 'expressive');
    expect(handleHMR(payload())).toBe(0);
    expect(JSON.parse(host.getAttribute('data-liteship-boundary')!).id).toBe(previousId);
  });

  test('admits the exact wire shape only', () => {
    expect(isHMRPayload(payload())).toBe(true);
    expect(isHMRPayload({ ...payload(), previousBoundaryId: 42 })).toBe(false);
  });
});
