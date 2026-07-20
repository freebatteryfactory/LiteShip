import { defineToken } from '@liteship/core';

export const fontSizeSm = defineToken({
  name: 'font-size-sm',
  category: 'typography',
  axes: ['theme'] as const,
  values: { light: '0.875rem', dark: '0.875rem' },
  fallback: '0.875rem',
});

export const fontSizeMd = defineToken({
  name: 'font-size-md',
  category: 'typography',
  axes: ['theme'] as const,
  values: { light: '1rem', dark: '1rem' },
  fallback: '1rem',
});

export const fontSizeLg = defineToken({
  name: 'font-size-lg',
  category: 'typography',
  axes: ['theme'] as const,
  values: { light: '1.25rem', dark: '1.25rem' },
  fallback: '1.25rem',
});

export const spacingSm = defineToken({
  name: 'spacing-sm',
  category: 'spacing',
  axes: ['theme'] as const,
  values: { light: '0.5rem', dark: '0.5rem' },
  fallback: '0.5rem',
});

export const spacingMd = defineToken({
  name: 'spacing-md',
  category: 'spacing',
  axes: ['theme'] as const,
  values: { light: '1rem', dark: '1rem' },
  fallback: '1rem',
});

export const spacingLg = defineToken({
  name: 'spacing-lg',
  category: 'spacing',
  axes: ['theme'] as const,
  values: { light: '2rem', dark: '2rem' },
  fallback: '2rem',
});

export const colorText = defineToken({
  name: 'color-text',
  category: 'color',
  axes: ['theme'] as const,
  values: { light: '#1a1a2e', dark: '#e8e8f0' },
  fallback: '#1a1a2e',
});

export const colorSurface = defineToken({
  name: 'color-surface',
  category: 'color',
  axes: ['theme'] as const,
  values: { light: '#ffffff', dark: '#1a1a2e' },
  fallback: '#ffffff',
});
