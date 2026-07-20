import { defineToken } from '@liteship/core';

export const fontSizeSm = defineToken({
  name: 'font-size-sm',
  category: 'typography',
  value: '0.875rem',
});

export const fontSizeMd = defineToken({
  name: 'font-size-md',
  category: 'typography',
  value: '1rem',
});

export const fontSizeLg = defineToken({
  name: 'font-size-lg',
  category: 'typography',
  value: '1.25rem',
});

export const spacingSm = defineToken({
  name: 'spacing-sm',
  category: 'spacing',
  value: '0.5rem',
});

export const spacingMd = defineToken({
  name: 'spacing-md',
  category: 'spacing',
  value: '1rem',
});

export const spacingLg = defineToken({
  name: 'spacing-lg',
  category: 'spacing',
  value: '2rem',
});

export const colorText = defineToken({
  name: 'color-text',
  category: 'color',
  axes: ['theme'],
  values: { light: '#1a1a2e', dark: '#e8e8f0' },
  fallback: '#1a1a2e',
});

export const colorSurface = defineToken({
  name: 'color-surface',
  category: 'color',
  axes: ['theme'],
  values: { light: '#ffffff', dark: '#1a1a2e' },
  fallback: '#ffffff',
});
