/**
 * Form binding for the graph-mutation channel.
 *
 * LiteShip owns the binding from form submit → host-projected ops → mutation
 * channel → structured outcome event. The host owns the form markup, the
 * domain projection, sealed node construction, and any UI that renders errors.
 * This is a rig primitive, not a data-grid, component kit, or future auto-form DSL.
 *
 * @module
 */

import { Diagnostics } from '@czap/core';
import type { DocumentGraph, GraphMutationClient, GraphMutationResponse, PatchOp } from '@czap/core';

export interface BindGraphFormOptions {
  readonly client: GraphMutationClient;
  /** Project the submitted form into patch ops. Host-owned domain logic (nodes must be sealed by the host via sealNode). */
  readonly toOps: (data: FormData, base: DocumentGraph) => readonly PatchOp[];
  /** Optional imperative hook; the `czap:mutation` event fires regardless. */
  readonly onOutcome?: (response: GraphMutationResponse) => void;
}

/** Bind a form's submit to the mutation channel. Returns an unbind function. */
export function bindGraphForm(form: HTMLFormElement, options: BindGraphFormOptions): () => void {
  let inFlight = 0;

  const settleState = (response: GraphMutationResponse): void => {
    inFlight -= 1;
    if (inFlight === 0) {
      form.setAttribute('data-czap-mutation-state', response.status);
    }
  };

  const onSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    const data = new FormData(form);
    inFlight += 1;
    form.setAttribute('data-czap-mutation-state', 'pending');

    void options.client
      .submit((base) => options.toOps(data, base))
      .then((response) => {
        if (response.status === 'error' && response.message.startsWith('ops builder threw')) {
          Diagnostics.warn({
            source: 'czap/web.graphForm',
            code: 'to-ops-threw',
            message:
              'Graph form toOps threw while projecting submitted FormData. Fix: keep toOps pure and return valid GraphPatch ops for the submitted form data.',
            detail: { message: response.message },
          });
        }
        settleState(response);
        options.onOutcome?.(response);
        form.dispatchEvent(new CustomEvent('czap:mutation', { detail: response, bubbles: true }));
      });
  };

  form.addEventListener('submit', onSubmit);
  return () => {
    form.removeEventListener('submit', onSubmit);
  };
}
