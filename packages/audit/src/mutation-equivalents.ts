/**
 * The EQUIVALENT-MUTANT REGISTRY — the justified, content-addressed record of RUNTIME
 * mutants that are provably behaviour-identical to the original (Slice C, the avionics
 * tier — the anti-laundering half of mutation-as-divergence).
 *
 * THE PROBLEM. The deterministic engine skips ERASED type syntax at the source
 * ({@link isInTypeOnlyPosition} in `mutation-engine.ts`), so a type-level mutation
 * never even mints a mutant. But a small set of RUNTIME mutants are genuinely
 * EQUIVALENT — the mutation compiles and runs, yet no observable behaviour changes, so
 * no test could ever kill it:
 *   - a comparator boundary on always-DISTINCT keys (`left < right` vs `left <=
 *     right` over `Object.entries` keys, which are never equal → the boundary is
 *     unreachable);
 *   - a default-value rewrite that routes to the SAME branch (`algo = 'sha256'` →
 *     `algo = ''`, where `''` is not `'blake3'` so both fall to the sha256 branch);
 *   - a string-literal rewrite whose value round-trips identically (`typeof x ===
 *     'string'` → `''`, where the string then falls through to `String(x)` — the
 *     identical string).
 *
 * THE CARDINAL RULE (the sin this whole system exists to prevent). The ONLY honest way
 * to mark such a mutant is a JUSTIFIED, REVIEWABLE registry entry — NEVER a fake or
 * contrived test that "kills" it (that would be laundering: a green test asserting
 * nothing real). A registered mutant gets a distinct `equivalent` verdict: excluded
 * from the survivor work-list AND the score denominator, yet RECORDED with its
 * justification so a reviewer can audit (and redline) every exclusion.
 *
 * THE ANTI-DRIFT KEYSTONE. Every entry is keyed by the mutant's CONTENT ADDRESS — the
 * blake3 of `{file, operator, line, column, originalText, mutatedText}` the engine
 * mints. If the underlying code changes, the mutant's id changes, the registry entry
 * NO LONGER MATCHES, and the mutant is re-surfaced as a normal survivor (never
 * silently ignored). A justification therefore can NEVER drift to silently cover a
 * different — possibly real — mutant. The committed artifact carries the `file:line`,
 * the operator, and the `original → mutated` rewrite ALONGSIDE the id purely for human
 * review; the MATCH is on the id alone (the file:line are advisory, not load-bearing,
 * so a whitespace-only edit that shifts a line but not the mutant identity does not
 * spuriously re-surface it).
 *
 * Composition over inheritance: the registry is a function over an open contract
 * ({@link EquivalentMutantRegistry}), built from a frozen entry list — no class.
 *
 * @module
 */
import { ParseError } from '@czap/error';
import type { EquivalentMutantRegistry } from './mutation-verdict.js';

/**
 * One committed equivalent-mutant entry — the mutant's content-address `id` (the
 * load-bearing match key) plus the human-review fields (`file`/`line`/`operator`/the
 * rewrite) and the `justification`. The non-id fields are advisory provenance: a
 * reviewer reads them, but the verdict matches on `id` alone (the anti-drift property).
 */
export interface EquivalentMutantEntry {
  /** The mutant's stable content address (blake3) — the load-bearing match key. */
  readonly mutantId: string;
  /** The repo-relative file (human review). */
  readonly file: string;
  /** 1-based line (human review). */
  readonly line: number;
  /** 1-based column (human review). */
  readonly column: number;
  /** The operator id (human review). */
  readonly operator: string;
  /** The original span text (human review). */
  readonly originalText: string;
  /** The mutated span text (human review). */
  readonly mutatedText: string;
  /** Why this mutation changes no observable behaviour — the justification. */
  readonly justification: string;
}

/**
 * Build an {@link EquivalentMutantRegistry} from a committed entry list. The lookup
 * is by `mutantId` (the content address — the anti-drift key). De-duplication is by
 * id: two entries with the same id are an authoring error (a tagged throw), never a
 * silent last-wins. Pure + deterministic.
 */
export function makeEquivalentMutantRegistry(entries: readonly EquivalentMutantEntry[]): EquivalentMutantRegistry {
  const byId = new Map<string, string>();
  for (const entry of entries) {
    if (byId.has(entry.mutantId)) {
      throw ParseError(
        'mutation-equivalents',
        `duplicate equivalent-mutant entry for id "${entry.mutantId}" (${entry.file}:${entry.line}:${entry.column}) — each mutant id may appear once`,
        { code: 'duplicate-entry' },
      );
    }
    byId.set(entry.mutantId, entry.justification);
  }
  return {
    justification(mutantId: string): string | null {
      return byId.get(mutantId) ?? null;
    },
  };
}

/**
 * Parse a committed equivalent-mutant registry document (the shape of
 * `benchmarks/mutation-equivalents.json`) into a validated entry list. The document is
 * `{ "entries": EquivalentMutantEntry[] }`. Every field is validated (a corrupt
 * registry artifact must be visible, never silently treated as "no equivalents"); a
 * malformed entry is a tagged {@link ParseError}, never a coercion.
 */
export function parseEquivalentMutants(raw: unknown): readonly EquivalentMutantEntry[] {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw ParseError(
      'mutation-equivalents',
      'the equivalent-mutant registry must be a JSON object with an "entries" array — refusing to run with a corrupt artifact',
      { code: 'malformed' },
    );
  }
  const entriesValue = (raw as { readonly entries?: unknown }).entries;
  if (!Array.isArray(entriesValue)) {
    throw ParseError('mutation-equivalents', 'the equivalent-mutant registry "entries" field must be an array', {
      code: 'malformed',
    });
  }
  return entriesValue.map((entry, index) => parseEntry(entry, index));
}

/** A required string field of an entry, or a tagged throw naming the field + index. */
function requireString(value: unknown, field: string, index: number): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw ParseError(
      'mutation-equivalents',
      `equivalent-mutant entry #${index} field "${field}" must be a non-empty string (got ${typeof value})`,
      { code: 'malformed' },
    );
  }
  return value;
}

/** A required positive-integer field of an entry, or a tagged throw. */
function requireInt(value: unknown, field: string, index: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw ParseError(
      'mutation-equivalents',
      `equivalent-mutant entry #${index} field "${field}" must be a 1-based integer (got ${String(value)})`,
      { code: 'malformed' },
    );
  }
  return value;
}

/** Validate one raw entry into an {@link EquivalentMutantEntry}. */
function parseEntry(raw: unknown, index: number): EquivalentMutantEntry {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw ParseError('mutation-equivalents', `equivalent-mutant entry #${index} must be an object`, {
      code: 'malformed',
    });
  }
  const r = raw as Record<string, unknown>;
  return {
    mutantId: requireString(r['mutantId'], 'mutantId', index),
    file: requireString(r['file'], 'file', index),
    line: requireInt(r['line'], 'line', index),
    column: requireInt(r['column'], 'column', index),
    operator: requireString(r['operator'], 'operator', index),
    originalText: requireString(r['originalText'], 'originalText', index),
    // mutatedText is the ONLY field allowed empty (the empty-string mutant `'' `).
    mutatedText: typeof r['mutatedText'] === 'string' ? r['mutatedText'] : missingMutated(index),
    justification: requireString(r['justification'], 'justification', index),
  };
}

/** A tagged throw for a missing `mutatedText` (the one field allowed empty but not absent). */
function missingMutated(index: number): never {
  throw ParseError('mutation-equivalents', `equivalent-mutant entry #${index} field "mutatedText" must be a string`, {
    code: 'malformed',
  });
}
