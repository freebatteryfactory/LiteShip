/**
 * Spacing design tokens.
 *
 * Tokens are named design values that can vary across axes (theme, density,
 * contrast, etc.). liteship compiles them to CSS custom properties so they
 * participate in the cascade naturally.
 *
 * Each token below defines a single axis ("density") with two variants:
 *   - "default"  -- standard spacing for desktop
 *   - "compact"  -- tighter spacing for mobile / dense layouts
 *
 * The `fallback` is used when no axis value matches.
 *
 * In CSS, these become:
 *   --liteship-gap-sm: <resolved value>;
 *   --liteship-gap-md: <resolved value>;
 *   --liteship-gap-lg: <resolved value>;
 */

import { defineToken } from '@liteship/core';

export const gapSm = defineToken({
  name: 'gap-sm',
  category: 'spacing',
  axes: ['density'],
  values: {
    default: '0.5rem',
    compact: '0.25rem',
  },
  fallback: '0.5rem',
});

export const gapMd = defineToken({
  name: 'gap-md',
  category: 'spacing',
  axes: ['density'],
  values: {
    default: '1rem',
    compact: '0.5rem',
  },
  fallback: '1rem',
});

export const gapLg = defineToken({
  name: 'gap-lg',
  category: 'spacing',
  axes: ['density'],
  values: {
    default: '2rem',
    compact: '1rem',
  },
  fallback: '2rem',
});
