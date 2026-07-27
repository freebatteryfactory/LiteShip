/** Host adapters are transitive facade dependencies, so their host peers must not warn in host-free installs. */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface Manifest {
  readonly peerDependencies?: Readonly<Record<string, string>>;
  readonly peerDependenciesMeta?: Readonly<Record<string, { readonly optional?: boolean }>>;
}

function manifest(packageName: 'liteship' | 'astro' | 'vite'): Manifest {
  return JSON.parse(readFileSync(resolve(`packages/${packageName}/package.json`), 'utf8')) as Manifest;
}

describe('optional host peer closure', () => {
  it.each([
    ['liteship', 'astro'],
    ['liteship', 'vite'],
    ['astro', 'astro'],
    ['vite', 'vite'],
  ] as const)('%s declares transitive host %s as a versioned optional peer', (owner, peer) => {
    const pkg = manifest(owner);
    expect(pkg.peerDependencies?.[peer]).toBeDefined();
    expect(pkg.peerDependenciesMeta?.[peer]?.optional).toBe(true);
  });
});
