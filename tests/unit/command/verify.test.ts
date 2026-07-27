import { describe, it, expect } from 'vitest';
import { verifyCommand } from '@liteship/command';
import type { ContentAddress } from '@liteship/core';

const ID = 'fnv1a:abcd1234' as unknown as ContentAddress;
const okDecode = {
  ok: true as const,
  id: ID,
  tarballManifestAddress: { display_id: 'd1', integrity_digest: 'i1' },
};

describe('@liteship/command verify', () => {
  it('no capsule → Unknown verdict, exit 4', async () => {
    const r = await verifyCommand.handler({ name: 'verify', args: { tarball: 'x.tgz' } }, {});
    expect(r.verdict).toBe('Unknown');
    expect(r.exitCode).toBe(4);
    expect(r.status).toBe('failed');
  });

  it('inputSchema requires only the tarball — capsule defaults from the ship sibling convention', () => {
    expect(verifyCommand.descriptor.inputSchema.required).toEqual(['tarball']);
  });

  it('no --capsule but the .shipcapsule.cbor sibling exists → derived capsule verifies', async () => {
    const read: string[] = [];
    const r = await verifyCommand.handler(
      { name: 'verify', args: { tarball: 'pkg/liteship-command-0.1.4.tgz' } },
      {
        fileExists: () => true,
        readFileBytes: (path) => {
          read.push(path);
          return new Uint8Array([1]);
        },
        decodeShipCapsule: async () => okDecode,
        recomputeTarballAddress: async () => ({ ok: true, display_id: 'd1', integrity_digest: 'i1' }),
      },
    );
    expect(read).toContain('pkg/liteship-command-0.1.4.shipcapsule.cbor');
    expect(r.verdict).toBe('Verified');
    expect(r.exitCode).toBe(0);
  });

  it('no --capsule and the sibling is absent → Unknown verdict, exit 4', async () => {
    const r = await verifyCommand.handler(
      { name: 'verify', args: { tarball: 'pkg/liteship-command-0.1.4.tgz' } },
      { fileExists: (path) => path === 'pkg/liteship-command-0.1.4.tgz' },
    );
    expect(r.verdict).toBe('Unknown');
    expect(r.exitCode).toBe(4);
  });

  it('no args at all → Unknown verdict, exit 4 (ADR-0011: honest cannot-tell)', async () => {
    const r = await verifyCommand.handler({ name: 'verify', args: {} }, {});
    expect(r.verdict).toBe('Unknown');
    expect(r.exitCode).toBe(4);
  });

  it('capsule given but no tarball → plain error, exit 1, no verdict', async () => {
    const r = await verifyCommand.handler({ name: 'verify', args: { capsule: 'c.cbor' } }, {});
    expect(r.verdict).toBeUndefined();
    expect(r.exitCode).toBe(1);
  });

  it('tarball not found → exit 1, no verdict', async () => {
    const r = await verifyCommand.handler(
      { name: 'verify', args: { tarball: 'x.tgz', capsule: 'c.cbor' } },
      { fileExists: () => false },
    );
    expect(r.exitCode).toBe(1);
    expect(r.verdict).toBeUndefined();
  });

  it('capsule decode failure → Incomplete, exit 3', async () => {
    const r = await verifyCommand.handler(
      { name: 'verify', args: { tarball: 'x.tgz', capsule: 'c.cbor' } },
      {
        fileExists: () => true,
        readFileBytes: () => new Uint8Array([1]),
        decodeShipCapsule: async () => ({ ok: false, error: 'bad cbor' }),
      },
    );
    expect(r.verdict).toBe('Incomplete');
    expect(r.exitCode).toBe(3);
  });

  it('tarball recompute disagrees → Mismatch, exit 2', async () => {
    const r = await verifyCommand.handler(
      { name: 'verify', args: { tarball: 'x.tgz', capsule: 'c.cbor' } },
      {
        fileExists: () => true,
        readFileBytes: () => new Uint8Array([1]),
        decodeShipCapsule: async () => okDecode,
        recomputeTarballAddress: async () => ({ ok: true, display_id: 'd2', integrity_digest: 'i1' }),
      },
    );
    expect(r.verdict).toBe('Mismatch');
    expect(r.exitCode).toBe(2);
    expect((r.payload as { mismatches: string[] }).mismatches).toContain('tarball_manifest_address.display_id');
  });

  it('everything matches → Verified, exit 0, ok, capsule_id surfaced', async () => {
    const r = await verifyCommand.handler(
      { name: 'verify', args: { tarball: 'x.tgz', capsule: 'c.cbor' } },
      {
        fileExists: () => true,
        readFileBytes: () => new Uint8Array([1]),
        decodeShipCapsule: async () => okDecode,
        recomputeTarballAddress: async () => ({ ok: true, display_id: 'd1', integrity_digest: 'i1' }),
      },
    );
    expect(r.verdict).toBe('Verified');
    expect(r.exitCode).toBe(0);
    expect(r.status).toBe('ok');
    expect((r.payload as { capsule_id: string }).capsule_id).toBe('fnv1a:abcd1234');
  });
});
