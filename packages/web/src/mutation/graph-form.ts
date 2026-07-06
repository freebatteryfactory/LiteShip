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
import { dispatchCzapEvent } from '../wire/dispatch.js';

/** Wiring for {@link bindGraphForm}: the channel client, the host's ops projection, and an optional outcome hook. */
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
    // Pass the submitter so the clicked button's name/value lands in the FormData,
    // matching native submission — a Save-vs-Delete form must project the intent
    // the user actually chose. `submitter` is null for form.submit()/Enter paths.
    const data = new FormData(form, event.submitter);
    inFlight += 1;
    form.setAttribute('data-czap-mutation-state', 'pending');

    void options.client
      .submit((base) => {
        // Detect a throwing toOps HERE, at the boundary that owns it, instead of
        // string-matching the client's error message after the fact. The rethrow keeps
        // the client's contract: it maps the throw to its `{ status: 'error' }` shape.
        try {
          return options.toOps(data, base);
        } catch (error) {
          Diagnostics.warn({
            source: 'czap/web.graphForm',
            code: 'to-ops-threw',
            message:
              'Graph form toOps threw while projecting submitted FormData. Fix: keep toOps pure and return valid GraphPatch ops for the submitted form data.',
            detail: { message: error instanceof Error ? error.message : String(error) },
          });
          throw error;
        }
      })
      .then((response) => {
        settleState(response);
        // Contain a throwing host hook: the chain is deliberately un-awaited (`void`),
        // so an escaping throw here would surface as an unhandled rejection instead of
        // a contained, loud failure — and the `czap:mutation` event must still fire.
        try {
          options.onOutcome?.(response);
        } catch (error) {
          Diagnostics.warn({
            source: 'czap/web.graphForm',
            code: 'on-outcome-threw',
            message:
              'Graph form onOutcome threw while handling a mutation response. Fix: keep onOutcome non-throwing; the czap:mutation event still fired.',
            detail: { message: error instanceof Error ? error.message : String(error) },
          });
        }
        dispatchCzapEvent(form, 'czap:mutation', response);
      });
  };

  form.addEventListener('submit', onSubmit);
  return () => {
    form.removeEventListener('submit', onSubmit);
  };
}
