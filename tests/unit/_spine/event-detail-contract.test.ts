import type {
  DetectReadyDetail as SpineDetectReadyDetail,
  GraphMutationResponse as SpineGraphMutationResponse,
  UIFrame as SpineUIFrame,
} from '@liteship/_spine';
import type { GraphMutationResponse, UIFrame } from '@liteship/core';
import type { DetectReadyDetail } from '@liteship/detect';
import type { EventDetail, LiteShipEventMap } from '@liteship/_spine/events';
import { describe, expectTypeOf, it } from 'vitest';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? (<Value>() => Value extends Right ? 1 : 2) extends <Value>() => Value extends Left ? 1 : 2
      ? true
      : false
    : false;
type Assignable<Source, Target> = Source extends Target ? true : false;

describe('fleet event detail type closure', () => {
  it('keeps the Detect settle payload exact across owner, spine, and event map', () => {
    expectTypeOf<Equal<SpineDetectReadyDetail, DetectReadyDetail>>().toEqualTypeOf<true>();
    expectTypeOf<Equal<EventDetail<'liteship:detect-ready'>, DetectReadyDetail>>().toEqualTypeOf<true>();
  });

  it('keeps generated UI frames exact across owner, spine, and event map', () => {
    expectTypeOf<Equal<SpineUIFrame, UIFrame>>().toEqualTypeOf<true>();
    expectTypeOf<Equal<EventDetail<'liteship:llm-frame'>, UIFrame>>().toEqualTypeOf<true>();
  });

  it('keeps graph mutation results exact across owner, spine, and event map', () => {
    expectTypeOf<Equal<SpineGraphMutationResponse, GraphMutationResponse>>().toEqualTypeOf<true>();
    expectTypeOf<Equal<EventDetail<'liteship:mutation'>, GraphMutationResponse>>().toEqualTypeOf<true>();
  });

  it('retains owner provenance while projecting the payload type', () => {
    expectTypeOf<LiteShipEventMap['liteship:detect-ready']['owner']>().toEqualTypeOf<'detect'>();
    expectTypeOf<LiteShipEventMap['liteship:llm-frame']['owner']>().toEqualTypeOf<'astro'>();
    expectTypeOf<LiteShipEventMap['liteship:mutation']['owner']>().toEqualTypeOf<'web'>();
  });

  it('retains the DOM transport classification for all three public payloads', () => {
    expectTypeOf<LiteShipEventMap['liteship:detect-ready']['channel']>().toEqualTypeOf<'dom'>();
    expectTypeOf<LiteShipEventMap['liteship:llm-frame']['channel']>().toEqualTypeOf<'dom'>();
    expectTypeOf<LiteShipEventMap['liteship:mutation']['channel']>().toEqualTypeOf<'dom'>();
  });

  it('does not admit incomplete Detect success or failure payloads', () => {
    expectTypeOf<
      Assignable<{ readonly tier: 'static'; readonly gpuTier: 0; readonly webgpu: false }, DetectReadyDetail>
    >().toEqualTypeOf<false>();
    expectTypeOf<Assignable<{ readonly error: false }, DetectReadyDetail>>().toEqualTypeOf<false>();
    expectTypeOf<Assignable<{ readonly error: true }, DetectReadyDetail>>().toEqualTypeOf<true>();
  });

  it('does not admit incomplete generated UI frames', () => {
    expectTypeOf<Assignable<{ readonly type: 'keyframe' }, UIFrame>>().toEqualTypeOf<false>();
    expectTypeOf<
      Assignable<
        {
          readonly type: 'keyframe';
          readonly tokens: readonly string[];
          readonly qualityTier: 'rich';
          readonly morphStrategy: 'replace';
          readonly timestamp: number;
          readonly receiptId: UIFrame['receiptId'];
          readonly bufferPosition: number;
        },
        UIFrame
      >
    >().toEqualTypeOf<true>();
  });

  it('preserves the graph mutation discriminant and branch-specific fields', () => {
    expectTypeOf<Assignable<{ readonly status: 'applied' }, GraphMutationResponse>>().toEqualTypeOf<false>();
    expectTypeOf<
      Assignable<{ readonly status: 'refused'; readonly errors: readonly string[] }, GraphMutationResponse>
    >().toEqualTypeOf<true>();
    expectTypeOf<
      Assignable<{ readonly status: 'error'; readonly message: string }, GraphMutationResponse>
    >().toEqualTypeOf<true>();
    expectTypeOf<Assignable<{ readonly status: 'error' }, GraphMutationResponse>>().toEqualTypeOf<false>();
  });
});
