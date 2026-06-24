/**
 * THE LITESHIP-LOCAL CAPABILITY-GATE POLICY — the host-injected knowledge the generic
 * `@czap/audit` capability-link oracle needs (the ADR-0012 / D7b boundary; the audit engine names no
 * LiteShip capability). It supplies (a) the canonical capability symbol-table module SET the linker
 * reads, and (b) the resolved sanctioned skip sites (file + line + declared capability) to prove.
 *
 * The capability ids themselves come from `@czap/gauntlet`'s `SKIP_CAPABILITIES` (the closed set the
 * allowlist already uses); the export NAME of each canonical-module probe IS its capability id
 * (camelCase ↔ kebab), so the registry self-assembles from the repo — add a capability ⇒ add an
 * export to one of these modules. See `tests/helpers/capabilities.ts` for the symbol table.
 *
 * @module
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { detectSkipsAST, type CapabilitySkipSite } from '@czap/audit';
import { SANCTIONED_SKIPS, normalizeSiteLine, SKIP_CAPABILITIES } from '@czap/gauntlet';

/**
 * The canonical capability symbol-table modules (repo-relative) — the SET the linker reads as ONE
 * symbol table. Per-runtime: the node fs/env probes, the browser-safe SAB probe, and `ffmpeg.ts`
 * (which self-describes its `ffmpegAbsent` export so the ffmpeg spawn stays out of the other tests).
 */
export const LITESHIP_CAPABILITY_MODULES: readonly string[] = [
  'tests/helpers/capabilities.ts',
  'tests/helpers/capabilities.browser.ts',
  'tests/helpers/ffmpeg.ts',
];

/** The known capability ids (the closed allowlist set) — only module exports matching these are probes. */
export const LITESHIP_CAPABILITY_IDS: readonly string[] = [...SKIP_CAPABILITIES];

/**
 * Resolve every enumerated `SANCTIONED_SKIPS` entry to a {@link CapabilitySkipSite} — its file, the
 * 1-based line of the skip (matched by the normalized site text via the sound AST detector), and the
 * capability it declares. A site whose text cannot be located in its file resolves `line: -1` and is
 * dropped (the realrepo-skip-proof independently guards that every sanctioned site IS locatable).
 */
export function resolveCapabilitySites(repoRoot: string): CapabilitySkipSite[] {
  const out: CapabilitySkipSite[] = [];
  for (const s of SANCTIONED_SKIPS) {
    const lines = readFileSync(resolve(repoRoot, s.file), 'utf8').split('\n');
    let line = -1;
    for (const m of detectSkipsAST(lines.join('\n'))) {
      if (normalizeSiteLine(lines[m.line - 1] ?? '') === normalizeSiteLine(s.site)) {
        line = m.line;
        break;
      }
    }
    if (line > 0) out.push({ file: s.file, line, declaredCapability: s.capability });
  }
  return out;
}
