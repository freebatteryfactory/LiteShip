// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { bindGraphForm } from '@czap/web';
import { Diagnostics, type DocumentGraph, type GraphMutationClient } from '@czap/core';
import type { GraphMutationResponse, PatchOp } from '@czap/core';
import { node, graph } from '../../helpers/graph-fixtures.js';

const base = graph([node('base')]);
const applied = (input = 'applied'): GraphMutationResponse => ({ status: 'applied', graph: graph([node(input)]) });
const flush = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

function fixtureForm(): HTMLFormElement {
  document.body.innerHTML = '<section id="host"><form><input name="axis" value="viewport.height"><button>Save</button></form></section>';
  return document.querySelector('form')!;
}

function dispatchSubmit(form: HTMLFormElement): boolean {
  return form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
}

afterEach(() => {
  Diagnostics.reset();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('bindGraphForm', () => {
  test('prevents default and captures FormData at submit time before any await', () => {
    const form = fixtureForm();
    let builder: ((base: DocumentGraph) => readonly PatchOp[]) | null = null;
    const client: GraphMutationClient = {
      base: () => base,
      adopt: () => {},
      submit: (ops) => {
        builder = ops as (base: DocumentGraph) => readonly PatchOp[];
        return Promise.resolve(applied());
      },
    };
    bindGraphForm(form, {
      client,
      toOps: (data) => [{ op: 'add', family: 'signal', node: node(String(data.get('axis'))) }],
    });

    const notCanceled = dispatchSubmit(form);
    (form.elements.namedItem('axis') as HTMLInputElement).value = 'changed-after-submit';
    const ops = builder!(base);

    expect(notCanceled).toBe(false);
    expect((ops[0] as { node: SignalNode }).node.input).toBe('viewport.height');
  });

  test('keeps pending across overlapping submits until the last response settles', async () => {
    const form = fixtureForm();
    const responses: Array<(response: GraphMutationResponse) => void> = [];
    const client: GraphMutationClient = {
      base: () => base,
      adopt: () => {},
      submit: () => new Promise<GraphMutationResponse>((resolve) => responses.push(resolve)),
    };
    bindGraphForm(form, { client, toOps: () => [] });

    dispatchSubmit(form);
    dispatchSubmit(form);
    expect(form.getAttribute('data-czap-mutation-state')).toBe('pending');

    responses[0]!(applied('first'));
    await flush();
    expect(form.getAttribute('data-czap-mutation-state')).toBe('pending');

    responses[1]!({ status: 'refused', errors: ['invalid'] });
    await flush();
    expect(form.getAttribute('data-czap-mutation-state')).toBe('refused');
  });

  test('dispatches czap:mutation with the exact response object and calls onOutcome', async () => {
    const form = fixtureForm();
    const exact = applied('exact');
    const seen: GraphMutationResponse[] = [];
    const onOutcome = vi.fn();
    const client: GraphMutationClient = {
      base: () => base,
      adopt: () => {},
      submit: () => Promise.resolve(exact),
    };
    document.getElementById('host')!.addEventListener('czap:mutation', (event) => {
      seen.push((event as CustomEvent<GraphMutationResponse>).detail);
    });
    bindGraphForm(form, { client, toOps: () => [], onOutcome });

    dispatchSubmit(form);
    await flush();

    expect(seen).toEqual([exact]);
    expect(onOutcome).toHaveBeenCalledWith(exact);
    expect(form.getAttribute('data-czap-mutation-state')).toBe('applied');
  });

  test('warns loudly when toOps throws through the client submit builder', async () => {
    const form = fixtureForm();
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);
    const client: GraphMutationClient = {
      base: () => base,
      adopt: () => {},
      submit: async (ops) => {
        try {
          if (typeof ops === 'function') ops(base);
          return applied();
        } catch (error) {
          return { status: 'error', message: `ops builder threw: ${error instanceof Error ? error.message : String(error)}` };
        }
      },
    };
    bindGraphForm(form, {
      client,
      toOps: () => {
        throw new Error('projection failed');
      },
    });

    dispatchSubmit(form);
    await flush();

    expect(form.getAttribute('data-czap-mutation-state')).toBe('error');
    expect(events).toHaveLength(1);
    expect(events[0]!.source).toBe('czap/web.graphForm');
    expect(events[0]!.code).toBe('to-ops-threw');
    expect(events[0]!.message).toContain('Fix:');
  });

  test('unbind removes the submit listener and leaves the current state attribute untouched', async () => {
    const form = fixtureForm();
    let submits = 0;
    const client: GraphMutationClient = {
      base: () => base,
      adopt: () => {},
      submit: () => {
        submits += 1;
        return Promise.resolve(applied());
      },
    };
    const unbind = bindGraphForm(form, { client, toOps: () => [] });

    dispatchSubmit(form);
    await flush();
    expect(submits).toBe(1);
    expect(form.getAttribute('data-czap-mutation-state')).toBe('applied');

    unbind();
    dispatchSubmit(form);
    await flush();

    expect(submits).toBe(1);
    expect(form.getAttribute('data-czap-mutation-state')).toBe('applied');
  });
});
