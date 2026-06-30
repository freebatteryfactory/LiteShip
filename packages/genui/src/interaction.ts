/**
 * genui's single interaction contract.
 *
 * genui serves exactly ONE interaction: `onClick` carrying an opaque string
 * action-id, dispatched as a `genui:interaction` CustomEvent the host resolves.
 * The handler-shaped `on*` namespace is RESERVED — any handler-shaped prop other
 * than `onClick` is rejected at validation (loud), never silently dropped at
 * render. The `on[A-Z]` shape (not a bare `on` prefix) keeps data props such as
 * `online` / `once` / `onboarding` OUT of the interaction namespace, so they are
 * not escalated from a silent drop into a hard reject.
 *
 * Lives in its own leaf module so both the renderer and the validator can share
 * the predicate without a render↔validate import cycle.
 *
 * @module
 */

/** True for handler-shaped props (`onClick`, `onHover`) — NOT data props like `online`. */
export const isInteractionProp = (key: string): boolean => /^on[A-Z]/.test(key);
