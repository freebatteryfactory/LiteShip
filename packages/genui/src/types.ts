/**
 * Re-anchor spine genui types for `@liteship/genui` runtime.
 *
 * @module
 */

import type {
  ComponentCatalog as _ComponentCatalog,
  ComponentDef as _ComponentDef,
  ComponentPropDef as _ComponentPropDef,
  GeneratedUINode as _GeneratedUINode,
  GeneratedUIValidationError as _GeneratedUIValidationError,
} from '@liteship/_spine';

/** Untrusted generated UI node accepted only after catalog validation. */
export type GeneratedUINode = _GeneratedUINode;
/** Declarative primitive-property rule in a component definition. */
export type ComponentPropDef = _ComponentPropDef;
/** Trusted component name, property grammar, and child policy. */
export type ComponentDef = _ComponentDef;
/** Closed catalog of components a generated tree may reference. */
export type ComponentCatalog = _ComponentCatalog;
/** Stable refusal emitted while validating a generated UI tree. */
export type GeneratedUIValidationError = _GeneratedUIValidationError;
