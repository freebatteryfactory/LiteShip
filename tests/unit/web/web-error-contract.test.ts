// @vitest-environment jsdom
/**
 * Wave-2 error-contract tests for @czap/web: every rewritten message must
 * say what happened, name its subject, and state the literal next step.
 *
 * Codes are unchanged; only message texts are pinned here.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { Effect } from 'effect';
import { Diagnostics } from '@czap/core';
import { Morph, SlotAddressing, SSE } from '@czap/web';
import { resolveHtmlString } from '../../../packages/web/src/security/html-trust.js';
import { restoreFocusState } from '../../../packages/web/src/physical/restore.js';

beforeEach(() => {
  Diagnostics.reset();
  document.body.innerHTML = '';
  if (!globalThis.CSS) {
    vi.stubGlobal('CSS', {
      escape(value: string) {
        return value.replace(/"/g, '\\"');
      },
    });
  }
});

afterEach(() => {
  Diagnostics.reset();
  vi.unstubAllGlobals();
});

const captureDiagnostics = () => {
  const { sink, events } = Diagnostics.createBufferSink();
  Diagnostics.setSink(sink);
  return events;
};

// ---------------------------------------------------------------------------
// Item 66: artifactId validation enumerates the allowed characters
// ---------------------------------------------------------------------------

describe('artifactId validation message', () => {
  test('names the allowed characters and gives literal examples', () => {
    expect(() => SSE.buildUrl('/stream', 'a/b')).toThrow(
      `Invalid artifactId "a/b". Allowed characters: letters, digits, ':', '_', '-' (it becomes a URL path segment), e.g. 'doc-123' or 'page:home'.`,
    );
  });
});

// ---------------------------------------------------------------------------
// Item 67: slot path validation carries a literal example
// ---------------------------------------------------------------------------

describe('slot path validation message', () => {
  test('parse error includes example paths', () => {
    expect(() => SlotAddressing.parse('nope')).toThrow(/e\.g\. "\/hero" or "\/sidebar\/nav"/);
  });
});

// ---------------------------------------------------------------------------
// Item 64: preserve-id-missing warning teaches the matching rule
// ---------------------------------------------------------------------------

describe('preserve-id-missing warning', () => {
  test('names the matching attribute and the literal fix', async () => {
    const events = captureDiagnostics();

    const root = document.createElement('div');
    root.innerHTML = '<span data-czap-id="kept">x</span>';
    document.body.append(root);

    await Effect.runPromise(
      Morph.morphWithState(root, '<div><span data-czap-id="kept">y</span></div>', undefined, {
        preserveIds: ['kept', 'cart'],
      }),
    );

    const warning = events.find((e) => e.code === 'preserve-id-missing');
    expect(warning).toBeDefined();
    expect(warning!.message).toContain('Preserve ID "cart" was not found in the old DOM tree before morphing.');
    expect(warning!.message).toContain('data-czap-id="cart"');
  });
});

// ---------------------------------------------------------------------------
// Item 65: morph rejection reason names the cause and both fixes
// ---------------------------------------------------------------------------

describe('morph rejection contract', () => {
  test('rejection reason names the missing ids and both remedies; event detail carries recovery', async () => {
    const root = document.createElement('div');
    root.innerHTML = '<span data-czap-id="cart">x</span>';
    document.body.append(root);

    let rejectedDetail: { reason: string; recovery?: string } | null = null;
    root.addEventListener('czap:morph-rejected', (event) => {
      rejectedDetail = (event as CustomEvent<{ reason: string; recovery?: string }>).detail;
    });

    const result = await Effect.runPromise(
      Morph.morphWithState(root, '<div><span>no ids here</span></div>', undefined, {
        preserveIds: ['cart'],
      }),
    );

    expect(result.type).toBe('rejected');
    if (result.type === 'rejected') {
      expect(result.rejection.reason).toBe(
        'Morph rejected: elements [cart] were required by a preserve hint but are missing from the new HTML.',
      );
      // The remedies moved to the structured hint field in the merged
      // contract (reason = what happened, hint = the literal next step).
      expect(result.rejection.hint).toContain('drop them from the preserve hint');
    }

    expect(rejectedDetail).not.toBeNull();
    expect(rejectedDetail!.recovery).toContain('czap:request-snapshot');
  });
});

// ---------------------------------------------------------------------------
// Item 70: restore warnings identify the element
// ---------------------------------------------------------------------------

describe('physical restore warnings', () => {
  test('focus selection failure names the element it was restoring', async () => {
    const events = captureDiagnostics();

    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'email';
    input.value = 'hello';
    document.body.append(input);

    // Force a non-DOMException failure so the warn path (not the silent
    // unsupported-range path) fires.
    input.setSelectionRange = () => {
      throw new TypeError('boom');
    };

    await expect(
      Effect.runPromise(
        restoreFocusState({
          elementId: 'input',
          cursorPosition: 1,
          selectionStart: 0,
          selectionEnd: 1,
          selectionDirection: 'forward',
        }),
      ),
    ).rejects.toThrow('boom');

    const warning = events.find((e) => e.code === 'restore-focus-selection-failed');
    expect(warning).toBeDefined();
    expect(warning!.message).toContain('#email');
    expect(warning!.message).toContain('selection APIs only apply to text-like inputs');
  });
});

// ---------------------------------------------------------------------------
// Item 71: trusted-html downgrade is observable
// ---------------------------------------------------------------------------

describe('trusted-html downgrade diagnostic', () => {
  test('requesting trusted-html without allowTrustedHtml warns once with the literal fix', () => {
    const events = captureDiagnostics();

    resolveHtmlString('<b>hi</b>', { policy: 'trusted-html' });
    resolveHtmlString('<b>hi again</b>', { policy: 'trusted-html' });

    const downgrades = events.filter((e) => e.code === 'trusted-html-downgraded');
    expect(downgrades).toHaveLength(1);
    expect(downgrades[0]!.message).toContain('{ policy: "trusted-html", allowTrustedHtml: true }');

    // The downgrade behavior itself is unchanged: output is sanitized.
    const out = resolveHtmlString('<script>alert(1)</script><b>safe</b>', { policy: 'trusted-html' });
    expect(out).not.toContain('<script>');
  });
});
