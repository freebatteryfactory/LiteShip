import { Token } from '@liteship/core';

export const fontSizeSm = Token.make({
  name: 'font-size-sm',
  category: 'typography',
  value: '0.875rem',
});

export const fontSizeMd = Token.make({
  name: 'font-size-md',
  category: 'typography',
  value: '1rem',
});

export const fontSizeLg = Token.make({
  name: 'font-size-lg',
  category: 'typography',
  value: '1.25rem',
});

export const spacingSm = Token.make({
  name: 'spacing-sm',
  category: 'spacing',
  value: '0.5rem',
});

export const spacingMd = Token.make({
  name: 'spacing-md',
  category: 'spacing',
  value: '1rem',
});

export const spacingLg = Token.make({
  name: 'spacing-lg',
  category: 'spacing',
  value: '2rem',
});

export const colorText = Token.make({
  name: 'color-text',
  category: 'color',
  axes: ['theme'],
  values: { light: '#1a1a2e', dark: '#e8e8f0' },
  fallback: '#1a1a2e',
});

export const colorSurface = Token.make({
  name: 'color-surface',
  category: 'color',
  axes: ['theme'],
  values: { light: '#ffffff', dark: '#1a1a2e' },
  fallback: '#ffffff',
});
