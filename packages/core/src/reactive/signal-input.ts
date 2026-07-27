/**
 * The sanctioned bidirectional bridge between the two Signal vocabularies:
 *
 * - {@link SignalSource} — the typed discriminated union ({@link signal.ts}),
 *   the SOURCE OF TRUTH for what a signal reads from.
 * - {@link SignalInput} — the branded dot-string ({@link brands.ts}) carried on
 *   the wire (`data-liteship-boundary`, the serialized boundary `input` field).
 *
 * Before this module the two were structurally unrelated: the runtime hot path
 * (`@liteship/astro` boundary/inspector, `@liteship/vite` css-quantize) re-parsed the
 * dot-string with hand-rolled `input.startsWith('scroll.')` forks, each free to
 * drift from the union's vocabulary AND from each other. This module is the
 * single place that knows the grammar, so every reader derives its axis from
 * the SAME parse — the input vocabulary's evaluator-consolidation.
 *
 * LAW: `sourceToInput` and `inputToSource` round-trip on every recognized
 * `SignalSource` (after normalization of omitted discriminants). The drift
 * guard in `tests/property/signal-input-roundtrip.prop.test.ts` pins it.
 *
 * `inputToSource` is intentionally LENIENT: the `SignalInput` brand is an
 * unvalidated free-form dot-string (tests author `'b'`, `'brightness'`,
 * `'scroll.depth'`). Unrecognized inputs map to `undefined`, and the runtime
 * readers treat that exactly as the pre-existing "no built-in reader → frozen"
 * semantics — never a throw.
 *
 * @module
 */

import { SignalInput } from '../schema/brands.js';
import type { SignalSource } from './signal.js';

/** Canonical dot-string prefix per source family, used by both directions. */
const VIEWPORT = 'viewport';
const SCROLL = 'scroll';
const POINTER = 'pointer';
const TIME = 'time';
const AUDIO = 'audio';
const MEDIA = 'media';
const CUSTOM = 'custom';

/**
 * Project a {@link SignalSource} onto its canonical {@link SignalInput}
 * dot-string. The forward half of the sanctioned bridge — the one place that
 * decides what string a typed source serializes to. Omitted discriminants are
 * treated as their documented defaults so the projection is total.
 *
 * @example
 * ```ts
 * sourceToInput({ type: 'scroll', axis: 'progress' }); // 'scroll.progress'
 * sourceToInput({ type: 'viewport' });                 // 'viewport.width'
 * sourceToInput({ type: 'audio', mode: 'amplitude' }); // 'audio.amplitude'
 * ```
 */
export function sourceToInput(source: SignalSource): SignalInput {
  switch (source.type) {
    case 'viewport':
      return SignalInput(`${VIEWPORT}.${source.axis ?? 'width'}`);
    case 'scroll':
      return SignalInput(`${SCROLL}.${source.axis ?? 'y'}`);
    case 'pointer':
      return SignalInput(`${POINTER}.${source.axis ?? 'x'}`);
    case 'time':
      return SignalInput(`${TIME}.${source.mode ?? 'elapsed'}`);
    case 'audio':
      return SignalInput(`${AUDIO}.${source.mode ?? 'sample'}`);
    case 'media':
      return SignalInput(`${MEDIA}:${source.query}`);
    case 'custom':
      return SignalInput(`${CUSTOM}:${source.id}`);
  }
}

/**
 * Parse a {@link SignalInput} dot-string back into its typed
 * {@link SignalSource}, or `undefined` when the string is not a recognized
 * member of the vocabulary. The inverse half of the bridge and the SINGLE
 * place the runtime parses an input string — `boundary.ts`, `inspector.ts`,
 * and `css-quantize.ts` all derive their axis from this, never a re-parse.
 *
 * Bare family names (`'viewport'`, `'scroll'`, `'time'`, `'audio'`) resolve to
 * the family's default discriminant, matching {@link sourceToInput}'s defaults.
 *
 * @example
 * ```ts
 * inputToSource('scroll.progress'); // { type: 'scroll', axis: 'progress' }
 * inputToSource('viewport');        // { type: 'viewport', axis: 'width' }
 * inputToSource('audio.amplitude'); // { type: 'audio', mode: 'amplitude' }
 * inputToSource('brightness');      // undefined (not in the vocabulary)
 * ```
 */
export function inputToSource(input: string): SignalSource | undefined {
  // media:<query> / custom:<id> — colon-delimited free-form payloads.
  if (input.startsWith(`${MEDIA}:`)) {
    return { type: 'media', query: input.slice(MEDIA.length + 1) };
  }
  if (input.startsWith(`${CUSTOM}:`)) {
    return { type: 'custom', id: input.slice(CUSTOM.length + 1) };
  }

  const dot = input.indexOf('.');
  const head = dot === -1 ? input : input.slice(0, dot);
  const tail = dot === -1 ? '' : input.slice(dot + 1);

  switch (head) {
    case VIEWPORT: {
      if (tail === '' || tail === 'width') return { type: 'viewport', axis: 'width' };
      if (tail === 'height') return { type: 'viewport', axis: 'height' };
      return undefined;
    }
    case SCROLL: {
      if (tail === '' || tail === 'y') return { type: 'scroll', axis: 'y' };
      if (tail === 'x') return { type: 'scroll', axis: 'x' };
      if (tail === 'progress') return { type: 'scroll', axis: 'progress' };
      return undefined;
    }
    case POINTER: {
      if (tail === '' || tail === 'x') return { type: 'pointer', axis: 'x' };
      if (tail === 'y') return { type: 'pointer', axis: 'y' };
      if (tail === 'pressure') return { type: 'pointer', axis: 'pressure' };
      return undefined;
    }
    case TIME: {
      if (tail === '' || tail === 'elapsed') return { type: 'time', mode: 'elapsed' };
      if (tail === 'absolute') return { type: 'time', mode: 'absolute' };
      if (tail === 'scheduled') return { type: 'time', mode: 'scheduled' };
      return undefined;
    }
    case AUDIO: {
      if (tail === '' || tail === 'sample') return { type: 'audio', mode: 'sample' };
      if (tail === 'normalized') return { type: 'audio', mode: 'normalized' };
      if (tail === 'amplitude') return { type: 'audio', mode: 'amplitude' };
      if (tail === 'beat') return { type: 'audio', mode: 'beat' };
      return undefined;
    }
    default:
      return undefined;
  }
}

/** The {@link SignalSourceType} family of an input string, or `undefined`. */
export function inputSourceType(input: string): SignalSource['type'] | undefined {
  return inputToSource(input)?.type;
}
