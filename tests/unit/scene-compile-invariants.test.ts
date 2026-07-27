/**
 * compileScene invariant evaluation — SceneContract.invariants is
 * documented as "evaluated against the contract at compile time"
 * (packages/scene/src/contract.ts). These tests pin that behavior:
 * passing invariants compile, any failing/throwing check raises a
 * ValidationError, and ALL violations are reported in one error.
 */
import { describe, it, expect } from 'vitest';
import { Track, compileScene } from '@liteship/scene';
import type { SceneContract, SceneInvariant } from '@liteship/scene';
import { hasTag } from '@liteship/error';
import type { ValidationError } from '@liteship/error';
import { introContract } from '../../examples/scenes/intro.js';

const hero = Track.videoId('hero');

function sceneWith(invariants: readonly SceneInvariant[]): SceneContract {
  return {
    name: 'invariant-demo',
    duration: 60,
    fps: 60,
    bpm: 120,
    tracks: [Track.video('hero', { from: 0, to: 60, source: {} })],
    invariants,
    budgets: { p95FrameMs: 16 },
    site: ['node'],
  };
}

describe('compileScene invariant evaluation', () => {
  it('compiles cleanly when every declared invariant passes', () => {
    const compiled = compileScene(
      sceneWith([
        {
          name: 'has-tracks',
          check: (s) => s.tracks.length > 0,
          message: 'a scene must declare at least one track',
        },
        {
          name: 'positive-duration',
          check: (s) => s.duration > 0,
          message: 'scene duration must be positive',
        },
      ]),
    );
    expect(compiled.name).toBe('invariant-demo');
    expect(compiled.trackSpawns.length).toBe(1);
  });

  it('empty invariants array remains a no-op', () => {
    const compiled = compileScene(sceneWith([]));
    expect(compiled.trackSpawns.length).toBe(1);
  });

  it('a false check throws ValidationError with module, invariant name, and message', () => {
    const scene = sceneWith([
      {
        name: 'never-holds',
        check: () => false,
        message: 'this invariant is unsatisfiable by design',
      },
    ]);
    let caught: unknown;
    try {
      compileScene(scene);
    } catch (error) {
      caught = error;
    }
    expect(hasTag(caught, 'ValidationError')).toBe(true);
    const err = caught as ValidationError;
    expect(err.module).toBe('compileScene');
    expect(err.detail).toContain('scene "invariant-demo"');
    expect(err.detail).toContain('never-holds');
    expect(err.detail).toContain('this invariant is unsatisfiable by design');
  });

  it('a throwing check counts as a violation carrying the thrown message', () => {
    const scene = sceneWith([
      {
        name: 'explosive-check',
        check: () => {
          throw new Error('boom from inside the check');
        },
        message: 'check must not explode',
      },
    ]);
    let caught: unknown;
    try {
      compileScene(scene);
    } catch (error) {
      caught = error;
    }
    expect(hasTag(caught, 'ValidationError')).toBe(true);
    const err = caught as ValidationError;
    expect(err.detail).toContain('explosive-check');
    expect(err.detail).toContain('check must not explode');
    expect(err.detail).toContain('boom from inside the check');
  });

  it('multiple failing invariants are ALL reported in one error', () => {
    const scene = sceneWith([
      {
        name: 'passes-fine',
        check: () => true,
        message: 'should never appear in the error',
      },
      {
        name: 'first-failure',
        check: () => false,
        message: 'first declared violation',
      },
      {
        name: 'second-failure',
        check: () => false,
        message: 'second declared violation',
      },
    ]);
    let caught: unknown;
    try {
      compileScene(scene);
    } catch (error) {
      caught = error;
    }
    expect(hasTag(caught, 'ValidationError')).toBe(true);
    const err = caught as ValidationError;
    expect(err.detail).toContain('2 invariants');
    expect(err.detail).toContain('first-failure');
    expect(err.detail).toContain('first declared violation');
    expect(err.detail).toContain('second-failure');
    expect(err.detail).toContain('second declared violation');
    expect(err.detail).not.toContain('passes-fine');
  });

  it('the invariant check receives the scene contract itself', () => {
    const scene = sceneWith([
      {
        name: 'track-id-present',
        check: (s) => s.tracks.some((t) => t.id === hero),
        message: 'expected the hero track to be declared',
      },
    ]);
    expect(() => compileScene(scene)).not.toThrow();
  });

  it('examples introContract compiles without throwing (its declared invariant holds)', () => {
    expect(introContract.invariants.length).toBeGreaterThan(0);
    const compiled = compileScene(introContract);
    expect(compiled.name).toBe('intro');
  });
});
