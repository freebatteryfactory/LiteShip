/**
 * Re-anchor spine genui types for `@czap/genui` runtime.
 *
 * @module
 */

import type { ContentAddress as _ContentAddress } from '@czap/_spine/core';
import type {
  ComponentCatalog as _ComponentCatalog,
  ComponentDef as _ComponentDef,
  ComponentPropDef as _ComponentPropDef,
  GeneratedUINode as _GeneratedUINode,
  GeneratedUIValidationError as _GeneratedUIValidationError,
} from '@czap/_spine/genui';

export type ContentAddress = _ContentAddress;

export type GeneratedUINode = _GeneratedUINode;
export type ComponentPropDef = _ComponentPropDef;
export type ComponentDef = _ComponentDef;
export type ComponentCatalog = _ComponentCatalog;
export type GeneratedUIValidationError = _GeneratedUIValidationError;
