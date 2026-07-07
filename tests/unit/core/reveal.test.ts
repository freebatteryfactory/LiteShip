/**
 * Reveal vertical slice — intent → graph → CSS + runtime floor (#124).
 *
 * @module
 */

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  Reveal,
  lowerRevealIntent,
  resolveRevealInitialState,
  ssrRevealPaint,
  motionPropToBinding,
  interpretTransition,
} from '@czap/core';
import { compileReveal } from '@czap/compiler';

const REPO_ROOT = resolve(import.meta.dirname, '..', '..', '..');

function heroIntent() {
  return Reveal.intent({
    target: 'hero',
    trigger: { type: 'view', range: ['entry 0%', 'cover 60%'] },
    from: { opacity: 0, translateY: '24px' },
    to: { opacity: 1, translateY: '0px' },
    transition: { durationMs: 420, easing: 'spring' },
    policy: { reducedMotion: 'settle', motionTier: 'transitions' },
  });
}

describe('Reveal.intent → graph', () => {
  test('lowers to Signal / Entity / Component / Pose×2 / Transition / Policy / Projection', () => {
    const lowered = lowerRevealIntent(heroIntent());
    const families = lowered.graph.nodes.map((n) => n.family).sort();
    expect(families).toEqual(['component', 'entity', 'policy', 'pose', 'pose', 'projection', 'signal', 'transition']);

    const signal = lowered.graph.nodes.find((n) => n.family === 'signal');
    expect(signal?.family === 'signal' && signal.input).toBe('scroll.progress');

    const transition = lowered.graph.nodes.find((n) => n.id === lowered.transitionId);
    expect(transition?.family).toBe('transition');
    if (transition?.family === 'transition') {
      expect(transition.routing).toBe('seq');
      expect(transition.durationMs).toBe(420);
    }

    const policy = lowered.graph.nodes.find((n) => n.id === lowered.policyId);
    expect(policy?.family).toBe('policy');
    if (policy?.family === 'policy') {
      expect(policy.appliesTo).toContain(lowered.componentId);
      expect(policy.requires).toBe('styled');
    }

    const projection = lowered.graph.nodes.find((n) => n.id === lowered.projectionId);
    expect(projection?.family).toBe('projection');
    if (projection?.family === 'projection') {
      expect(projection.target).toBe('css');
      expect(projection.sourceRef).toBe(lowered.transitionId);
    }
  });

  test('maps translateY to --czap-{target}-y bindings on poses', () => {
    const lowered = lowerRevealIntent(heroIntent());
    const fromPose = lowered.graph.nodes.find((n) => n.family === 'pose' && n.state === 'before');
    expect(fromPose?.family).toBe('pose');
    if (fromPose?.family === 'pose') {
      expect(fromPose.bindings).toEqual({ opacity: 0, '--czap-hero-y': '24px' });
    }
    const toPose = lowered.graph.nodes.find((n) => n.family === 'pose' && n.state === 'after');
    expect(toPose?.family).toBe('pose');
    if (toPose?.family === 'pose') {
      expect(toPose.bindings).toEqual({ opacity: 1, '--czap-hero-y': '0px' });
    }
  });

  test('motionPropToBinding preserves opacity and maps motion axes', () => {
    expect(motionPropToBinding('hero', 'opacity')).toBe('opacity');
    expect(motionPropToBinding('hero', 'translateY')).toBe('--czap-hero-y');
    expect(motionPropToBinding('hero', 'translateX')).toBe('--czap-hero-x');
    expect(motionPropToBinding('hero', 'translateZ')).toBe('--czap-hero-z');
    expect(motionPropToBinding('hero', '--czap-custom')).toBe('--czap-custom');
  });
});

describe('Reveal graph → CSS equivalence', () => {
  test('compileReveal emits @property, @keyframes, @starting-style, and view timeline', () => {
    const intent = heroIntent();
    const lowered = lowerRevealIntent(intent);
    const compiled = compileReveal(lowered.graph, lowered.transitionId, intent);

    expect(compiled.css.raw).toContain('@property --czap-hero-y');
    expect(compiled.css.raw).toContain('transform: translate3d(var(--czap-hero-x,0px),var(--czap-hero-y,0px),var(--czap-hero-z,0px))');
    expect(compiled.css.keyframes).toContain('@keyframes czap-motion-hero-before-after');
    expect(compiled.css.startingStyle).toContain('@starting-style');
    expect(compiled.css.startingStyle).toContain('[data-czap-boundary="hero"]');
    expect(compiled.css.transition).toContain('420ms');
    expect(compiled.css.scrollTimeline).toContain('animation-timeline: view()');
    expect(compiled.css.scrollTimeline).toContain('entry 0% cover 60%');

    const interpreted = interpretTransition(lowered.graph, lowered.transitionId);
    expect(compiled.motion.css?.durationMs).toBe(interpreted.css?.durationMs);
    expect(compiled.motion.css?.routing).toBe(interpreted.css?.routing);
    expect(compiled.resultDigest.integrity_digest.length).toBeGreaterThan(0);

    const projection = compiled.graph.nodes.find(
      (n) => n.family === 'projection' && n.sourceRef === lowered.transitionId,
    );
    expect(projection?.family).toBe('projection');
    if (projection?.family === 'projection') {
      expect(projection.id).not.toBe(lowered.projectionId);
      expect(projection.resultDigest.integrity_digest).toBe(compiled.resultDigest.integrity_digest);
      expect(projection.resultDigest.integrity_digest.length).toBeGreaterThan(0);
    }

    const staleEdge = compiled.graph.edges.some((edge) => edge.to === lowered.projectionId);
    expect(staleEdge).toBe(false);
    expect(compiled.graph.edges.some((edge) => edge.to === compiled.projectionId)).toBe(true);
    expect(compiled.graph.edges.some((edge) => edge.from === lowered.componentId && edge.to === compiled.projectionId)).toBe(
      true,
    );
  });

  test('spring easing compiles to linear() timing function', () => {
    const intent = heroIntent();
    const lowered = lowerRevealIntent(intent);
    const compiled = compileReveal(lowered.graph, lowered.transitionId, intent);
    expect(compiled.css.transition).toMatch(/linear\(/);
  });

  test('hyphenated targets emit a translate3d consumer on their custom axes', () => {
    const intent = Reveal.intent({
      target: 'hero-card',
      trigger: { type: 'view', range: ['entry 0%', 'cover 60%'] },
      from: { opacity: 0, translateY: '12px' },
      to: { opacity: 1, translateY: '0px' },
      transition: { durationMs: 300, easing: 'ease' },
      policy: { reducedMotion: 'settle', motionTier: 'transitions' },
    });
    const lowered = lowerRevealIntent(intent);
    const compiled = compileReveal(lowered.graph, lowered.transitionId, intent);
    expect(compiled.css.raw).toContain('@property --czap-hero-card-y');
    expect(compiled.css.raw).toContain(
      'transform: translate3d(var(--czap-hero-card-x,0px),var(--czap-hero-card-y,0px),var(--czap-hero-card-z,0px))',
    );
  });
});

describe('Reveal reduced-motion settle', () => {
  test('resolves to after pose when prefers-reduced-motion and policy is settle', () => {
    const intent = heroIntent();
    expect(resolveRevealInitialState(intent, { prefersReducedMotion: true })).toBe('after');
    expect(resolveRevealInitialState(intent, { prefersReducedMotion: false })).toBe('before');
  });

  test('SSR first paint uses settled after values under reduced motion', () => {
    const intent = heroIntent();
    const paint = ssrRevealPaint(intent, { prefersReducedMotion: true });
    expect(paint.state).toBe('after');
    expect(paint.cssVars['--czap-opacity']).toBe('1');
    expect(paint.cssVars['--czap-hero-y']).toBe('0px');
    expect(paint.boundaryAttr).toBe('hero');
  });

  test('SSR first paint uses before values when motion is allowed', () => {
    const intent = heroIntent();
    const paint = ssrRevealPaint(intent, { prefersReducedMotion: false });
    expect(paint.state).toBe('before');
    expect(paint.cssVars['--czap-opacity']).toBe('0');
    expect(paint.cssVars['--czap-hero-y']).toBe('24px');
  });
});

describe('Reveal continuous-write law', () => {
  test('writeContinuousMap source never imports GraphPatch (no per-frame patch)', () => {
    const src = readFileSync(resolve(REPO_ROOT, 'packages/astro/src/runtime/write-continuous-map.ts'), 'utf8');
    expect(src).not.toContain('GraphPatch');
    expect(src).not.toContain('graph-patch');
    expect(src).toContain('writeContinuousMap');
    expect(src).toContain('czap:uniform-update');
  });
});

describe('Reveal #132 gate — TransitionNode fields read', () => {
  test('interpretTransition reads routing and durationMs from lowered reveal graph', () => {
    const lowered = lowerRevealIntent(heroIntent());
    const plan = interpretTransition(lowered.graph, lowered.transitionId);
    expect(plan.css?.routing).toBe('seq');
    expect(plan.css?.durationMs).toBe(420);
    expect(plan.runtime?.routing).toBe('seq');
    expect(plan.runtime?.durationMs).toBe(420);
    expect(plan.diagnostics).toHaveLength(0);
  });
});
