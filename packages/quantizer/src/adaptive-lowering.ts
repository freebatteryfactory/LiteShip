/**
 * Adaptive lowering registration — the load-time seam that lets
 * `@liteship/core`'s `defineAdaptive` LOWER through THIS package's memoized
 * `defineQuantizer`.
 *
 * `@liteship/quantizer` depends on `@liteship/core`, so core cannot import the
 * quantizer back (a runtime edge would close a project-reference build cycle and
 * crash core's module init — the cycle discipline `core/evidence/escalation.ts`
 * documents). Instead this module — imported for side effect by the package
 * barrel — registers the REAL `defineQuantizer` with core. Because it is the same
 * module instance a consumer imports, the quantizer configCache is shared: an
 * adaptive's quantizer member is referentially identical to the hand-lowered
 * `defineQuantizer(boundary, options)`, which is the P15 lowering thesis.
 *
 * @module
 */

import { _registerAdaptiveQuantizerLowering } from '@liteship/core/authoring';
import type { AdaptiveQuantizerLowering } from '@liteship/core/authoring';
import { defineQuantizer } from './quantizer.js';

// `defineQuantizer` is generic over the boundary and its output tables; the seam
// types it against core's structural twins (core cannot import the quantizer's
// own generic config type). The cast is the one place the concrete generic
// constructor meets the twin contract — same function, same configCache, so the
// registered lowering IS the memoized `defineQuantizer`.
_registerAdaptiveQuantizerLowering(defineQuantizer as unknown as AdaptiveQuantizerLowering);
