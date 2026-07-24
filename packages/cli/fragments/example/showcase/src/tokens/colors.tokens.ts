import { defineToken } from '@liteship/core';

export const primary = defineToken({
  name: 'primary',
  category: 'color',
  axes: ['theme'],
  values: { light: '#4f46e5', dark: '#818cf8' },
  fallback: '#4f46e5',
});

export const secondary = defineToken({
  name: 'secondary',
  category: 'color',
  axes: ['theme'],
  values: { light: '#0d9488', dark: '#2dd4bf' },
  fallback: '#0d9488',
});

export const surface = defineToken({
  name: 'surface',
  category: 'color',
  axes: ['theme'],
  values: { light: '#ffffff', dark: '#0f172a' },
  fallback: '#ffffff',
});

export const text = defineToken({
  name: 'text',
  category: 'color',
  axes: ['theme'],
  values: { light: '#1e293b', dark: '#e2e8f0' },
  fallback: '#1e293b',
});

export const muted = defineToken({
  name: 'muted',
  category: 'color',
  axes: ['theme'],
  values: { light: '#64748b', dark: '#94a3b8' },
  fallback: '#64748b',
});

export const border = defineToken({
  name: 'border',
  category: 'color',
  axes: ['theme'],
  values: { light: '#e2e8f0', dark: '#334155' },
  fallback: '#e2e8f0',
});
