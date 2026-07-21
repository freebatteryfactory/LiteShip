/**
 * Adaptive lowering registration — the load-time seam that lets
 * `@liteship/core`'s `defineAdaptive` compile its `plan().css` through THIS
 * package's `StyleCSSCompiler`.
 *
 * `@liteship/compiler` depends on `@liteship/core`, so core cannot import the
 * compiler back (a runtime edge would close a project-reference build cycle and
 * crash core's module init). Instead this module — imported for side effect by
 * the package barrel — registers `StyleCSSCompiler.compile(style).layers` with
 * core, so `AdaptivePlan.css` is the exact compiler output, never a
 * reimplementation.
 *
 * @module
 */

import { _registerAdaptiveStyleLayerCompiler } from '@liteship/core/authoring';
import type { Style } from '@liteship/core';
import { StyleCSSCompiler } from './style-css.js';

_registerAdaptiveStyleLayerCompiler((style: Style) => StyleCSSCompiler.compile(style).layers);
