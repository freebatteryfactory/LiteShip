import { bench } from 'vitest';

bench('generated benchmark failure canary', () => {
  throw new Error('generated benchmark failure canary fired');
});
