// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { bindGraphForm } from '@liteship/web';
import { Diagnostics, type DocumentGraph, type GraphMutationClient } from '@liteship/core';
import type { GraphMutationResponse, PatchOp, SignalNode } from '@liteship/core';
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
    expect(form.getAttribute('data-liteship-mutation-state')).toBe('pending');

    responses[0]!(applied('first'));
    await flush();
    expect(form.getAttribute('data-liteship-mutation-state')).toBe('pending');

    responses[1]!({ status: 'refused', errors: ['invalid'] });
    await flush();
    expect(form.getAttribute('data-liteship-mutation-state')).toBe('refused');
  });

  test('dispatches liteship:mutation with the exact response object and calls onOutcome', async () => {
    const form = fixtureForm();
    const exact = applied('exact');
    const seen: GraphMutationResponse[] = [];
    const onOutcome = vi.fn();
    const client: GraphMutationClient = {
      base: () => base,
      adopt: () => {},
      submit: () => Promise.resolve(exact),
    };
    document.getElementById('host')!.addEventListener('liteship:mutation', (event) => {
      seen.push((event as CustomEvent<GraphMutationResponse>).detail);
    });
    bindGraphForm(form, { client, toOps: () => [], onOutcome });

    dispatchSubmit(form);
    await flush();

    expect(seen).toEqual([exact]);
    expect(onOutcome).toHaveBeenCalledWith(exact);
    expect(form.getAttribute('data-liteship-mutation-state')).toBe('applied');
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

    expect(form.getAttribute('data-liteship-mutation-state')).toBe('error');
    expect(events).toHaveLength(1);
    expect(events[0]!.source).toBe('liteship/web.graphForm');
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
    expect(form.getAttribute('data-liteship-mutation-state')).toBe('applied');

    unbind();
    dispatchSubmit(form);
    await flush();

    expect(submits).toBe(1);
    expect(form.getAttribute('data-liteship-mutation-state')).toBe('applied');
  });

  test('a throwing onOutcome is contained loudly and the liteship:mutation event still fires', async () => {
    const form = fixtureForm();
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);
    const client: GraphMutationClient = {
      base: () => base,
      adopt: () => {},
      submit: () => Promise.resolve(applied()),
    };
    let eventFired = false;
    form.addEventListener('liteship:mutation', () => {
      eventFired = true;
    });
    bindGraphForm(form, {
      client,
      toOps: () => [],
      onOutcome: () => {
        throw new Error('host hook exploded');
      },
    });

    dispatchSubmit(form);
    await flush();

    expect(eventFired).toBe(true);
    expect(form.getAttribute('data-liteship-mutation-state')).toBe('applied');
    expect(events).toHaveLength(1);
    expect(events[0]!.code).toBe('on-outcome-threw');
    expect(events[0]!.message).toContain('Fix:');
  });

  test('the clicked submitter lands in the FormData, matching native submission', async () => {
    document.body.innerHTML =
      '<form><input name="axis" value="viewport.height">' +
      '<button name="action" value="save">Save</button>' +
      '<button name="action" value="delete">Delete</button></form>';
    const form = document.querySelector('form')!;
    const deleteButton = form.querySelectorAll('button')[1]!;

    let seen: FormData | null = null;
    const client: GraphMutationClient = {
      base: () => base,
      adopt: () => {},
      submit: (ops) => {
        void (typeof ops === 'function' ? ops(base) : ops);
        return Promise.resolve(applied());
      },
    };
    bindGraphForm(form, {
      client,
      toOps: (data) => {
        seen = data;
        return [];
      },
    });

    form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true, submitter: deleteButton }));
    await flush();

    expect(seen).not.toBeNull();
    expect(seen!.get('axis')).toBe('viewport.height');
    // A Save-vs-Delete form must project the intent the user actually chose.
    expect(seen!.get('action')).toBe('delete');
  });
});
