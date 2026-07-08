// @vitest-environment jsdom
/**
 * DPU watch-and-prepare (#120) — stamped verifiable-patch envelope, feature detection,
 * permanent floor-morph apply path.
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  watchAndPrepare,
  detectDpuCapability,
  stampVerifiablePatch,
  verifyVerifiablePatch,
  applyVerifiablePatch,
  digestHtmlFragment,
  DPU_MARKER_ATTR,
  DPU_BASE_ATTR,
  DPU_RESULT_ATTR,
  DPU_DIGEST_ATTR,
} from '@czap/web';
import { nodeLogicalKey, nodeFromParts } from '@czap/core';
import type { ContentAddress } from '@czap/core';
import { META } from '../../helpers/graph-fixtures.js';

const baseId = 'czap:base' as ContentAddress;
const nextId = 'czap:next' as ContentAddress;
const staleId = 'czap:stale' as ContentAddress;

function signalMarker(input: string): string {
  return nodeLogicalKey(
    nodeFromParts({ _tag: 'DocGraphSignalNode', _version: 1, family: 'signal', meta: META, input }),
  );
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('detectDpuCapability (#120)', () => {
  it('always reports a rung — native when setHTML exists, otherwise floor-morph', () => {
    const cap = detectDpuCapability();
    if (cap.available) {
      expect(cap.rung).toBe('native-sethtml');
    } else {
      expect(cap.rung).toBe('floor-morph');
    }
  });
});

describe('stampVerifiablePatch + verifyVerifiablePatch', () => {
  it('stamps marker from logicalKey with sha256 digest over HTML bytes', () => {
    const marker = signalMarker('viewport.width');
    const html = '<p class="hero">Hello</p>';
    const envelope = stampVerifiablePatch({ marker, baseGraphId: baseId, resultGraphId: nextId, html });
    expect(envelope.marker).toBe(marker);
    expect(envelope.digest.integrity_digest).toBe(digestHtmlFragment(html).integrity_digest);
    expect(verifyVerifiablePatch(envelope, baseId)._tag).toBe('verified');
  });

  it('refuses staleBase when the live base graph id diverged', () => {
    const envelope = stampVerifiablePatch({
      marker: 'signal viewport.width',
      baseGraphId: staleId,
      resultGraphId: nextId,
      html: '<span>stale</span>',
    });
    const result = verifyVerifiablePatch(envelope, baseId);
    expect(result._tag).toBe('staleBase');
    if (result._tag === 'staleBase') {
      expect(result.expected).toBe(baseId);
      expect(result.received).toBe(staleId);
    }
  });

  it('refuses digestMismatch when HTML bytes were tampered after stamping', () => {
    const envelope = stampVerifiablePatch({
      marker: 'signal viewport.width',
      baseGraphId: baseId,
      resultGraphId: nextId,
      html: '<span>original</span>',
    });
    const tampered = { ...envelope, html: '<span>tampered</span>' };
    expect(verifyVerifiablePatch(tampered, baseId)._tag).toBe('digestMismatch');
  });
});

describe('watchAndPrepare apply floor (#120)', () => {
  it('applies sanitized HTML via floor-morph and stamps CAS attrs on the target', () => {
    const target = document.createElement('section');
    document.body.appendChild(target);
    const marker = signalMarker('viewport.width');
    const handle = watchAndPrepare(marker, target);
    expect(handle.capability.rung).toBe('floor-morph');
    expect(target.getAttribute(DPU_MARKER_ATTR)).toBe(marker);

    const html = '<p data-test="slot">Patched</p>';
    const envelope = handle.stamp({ baseGraphId: baseId, resultGraphId: nextId, html });
    const forcedFloor = { available: false as const, rung: 'floor-morph' as const };
    const result = applyVerifiablePatch(target, envelope, baseId, forcedFloor);

    expect(result._tag).toBe('applied');
    if (result._tag === 'applied') {
      expect(result.rung).toBe('floor-morph');
    }
    expect(target.querySelector('[data-test="slot"]')?.textContent).toBe('Patched');
    expect(target.getAttribute(DPU_BASE_ATTR)).toBe(baseId);
    expect(target.getAttribute(DPU_RESULT_ATTR)).toBe(nextId);
    expect(target.getAttribute(DPU_DIGEST_ATTR)).toBe(envelope.digest.integrity_digest);
  });

  it('refuses apply on staleBase without mutating the target', () => {
    const target = document.createElement('div');
    target.innerHTML = '<p id="keep">before</p>';
    document.body.appendChild(target);
    const handle = watchAndPrepare('signal viewport.width', target);
    const envelope = handle.stamp({ baseGraphId: staleId, resultGraphId: nextId, html: '<p>after</p>' });
    const result = handle.apply(envelope, baseId);
    expect(result._tag).toBe('refused');
    expect(target.querySelector('#keep')?.textContent).toBe('before');
    expect(target.getAttribute(DPU_BASE_ATTR)).toBeNull();
  });

  it('uses native setHTML when capability is available', () => {
    const target = document.createElement('article');
    document.body.appendChild(target);
    const setHTML = (html: string) => {
      target.innerHTML = html;
    };
    (target as Element & { setHTML: typeof setHTML }).setHTML = setHTML;

    const envelope = stampVerifiablePatch({
      marker: 'signal viewport.width',
      baseGraphId: baseId,
      resultGraphId: nextId,
      html: '<em>native</em>',
    });
    const nativeCap = { available: true as const, rung: 'native-sethtml' as const };
    const result = applyVerifiablePatch(target, envelope, baseId, nativeCap);
    expect(result._tag).toBe('applied');
    if (result._tag === 'applied') expect(result.rung).toBe('native-sethtml');
    expect(target.querySelector('em')?.textContent).toBe('native');
  });
});

describe('sanitizedEmpty + applied-DOM digest (adversarial QA)', () => {
  it('refuses a fragment sanitization strips entirely — no applied over stale content', () => {
    const target = document.createElement('div');
    target.innerHTML = '<p id="stale">stale</p>';
    document.body.appendChild(target);
    const envelope = stampVerifiablePatch({
      marker: 'signal viewport.width',
      baseGraphId: baseId,
      resultGraphId: nextId,
      html: '<script>alert(1)</script>',
    });
    const forcedFloor = { available: false as const, rung: 'floor-morph' as const };
    const result = applyVerifiablePatch(target, envelope, baseId, forcedFloor);

    expect(result._tag).toBe('sanitizedEmpty');
    // DOM untouched — no verified-patch attrs over unchanged content.
    expect(target.querySelector('#stale')?.textContent).toBe('stale');
    expect(target.getAttribute(DPU_BASE_ATTR)).toBeNull();
    expect(target.getAttribute(DPU_DIGEST_ATTR)).toBeNull();
  });

  it('stamps the digest of the APPLIED DOM serialization, not the envelope input bytes', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    // Sanitization strips the onclick attribute, so applied DOM ≠ input bytes.
    const html = '<p onclick="alert(1)">safe text</p>';
    const envelope = stampVerifiablePatch({
      marker: 'signal viewport.width',
      baseGraphId: baseId,
      resultGraphId: nextId,
      html,
    });
    const forcedFloor = { available: false as const, rung: 'floor-morph' as const };
    const result = applyVerifiablePatch(target, envelope, baseId, forcedFloor);

    expect(result._tag).toBe('applied');
    if (result._tag === 'applied') {
      const domDigest = digestHtmlFragment(target.innerHTML).integrity_digest;
      expect(result.appliedDigest.integrity_digest).toBe(domDigest);
      expect(target.getAttribute(DPU_DIGEST_ATTR)).toBe(domDigest);
      // The attestation must NOT be the pre-sanitization envelope digest.
      expect(target.getAttribute(DPU_DIGEST_ATTR)).not.toBe(envelope.digest.integrity_digest);
    }
    expect(target.querySelector('p')?.getAttribute('onclick')).toBeNull();
  });
});

describe('marker dedup registry (adversarial QA)', () => {
  it('refuses an envelope stamped for a different marker than the target slot', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    watchAndPrepare('signal slot.a', target);

    const envelope = stampVerifiablePatch({
      marker: 'signal slot.b',
      baseGraphId: baseId,
      resultGraphId: nextId,
      html: '<p>wrong slot</p>',
    });
    const result = applyVerifiablePatch(target, envelope, baseId, { available: false, rung: 'floor-morph' });
    expect(result._tag).toBe('refused');
    if (result._tag === 'refused') {
      expect(result.verification._tag).toBe('markerMismatch');
    }
    expect(target.innerHTML).toBe('');
  });

  it('throws when a marker is re-watched on a DIFFERENT connected element', () => {
    const first = document.createElement('div');
    const second = document.createElement('div');
    document.body.append(first, second);

    const handle = watchAndPrepare('signal dup.marker', first);
    expect(() => watchAndPrepare('signal dup.marker', second)).toThrow(/already watched/);

    handle.dispose();
    // After dispose the name is free again.
    const rebound = watchAndPrepare('signal dup.marker', second);
    expect(rebound.target).toBe(second);
    rebound.dispose();
  });

  it('a registration for a DISCONNECTED element is stale and silently superseded', () => {
    const detached = document.createElement('div');
    watchAndPrepare('signal vt.swap', detached);

    const live = document.createElement('div');
    document.body.appendChild(live);
    const handle = watchAndPrepare('signal vt.swap', live);
    expect(handle.target).toBe(live);
    handle.dispose();
  });
});

describe('marker names use logicalKey not content addresses', () => {
  it('two different node ids with the same logical cell share one marker', () => {
    const a = nodeFromParts({
      _tag: 'DocGraphSignalNode',
      _version: 1,
      family: 'signal',
      meta: META,
      input: 'viewport.width',
    });
    const b = nodeFromParts({
      _tag: 'DocGraphSignalNode',
      _version: 1,
      family: 'signal',
      meta: META,
      input: 'viewport.width',
    });
    expect(a.id).toBe(b.id);
    expect(nodeLogicalKey(a)).toBe('signal viewport.width');
    expect(nodeLogicalKey(a)).not.toBe(a.id);
  });
});
