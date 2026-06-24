// Ambient declaration for @czap/mcp-server, used only by the ONE-WAY dynamic
// import in dispatch.ts (the `mcp` subcommand launches the server).
//
// CUT A1 capstone: the cli↔mcp CYCLE is gone — `@czap/mcp-server` no longer
// imports `@czap/cli` (it dispatches through @czap/command). This is the lone
// remaining edge, cli→mcp, and it's a deliberately-exempt dynamic import (the
// A1-T3 detector allows it). `@czap/cli` does not project-reference mcp-server,
// so `tsc --build` stays acyclic; this minimal subset keeps cli cold-compilable.
// At runtime the real module resolves through the pnpm workspace symlink.
declare module '@czap/mcp-server' {
  export function start(opts?: { http?: number | string }): Promise<void>;

  // The LSP rigor skin (Slice B/B3): `czap lsp` launches this over stdio with a
  // CLI-host-built gauntlet runner injected. The engine + @czap/audit stay in the
  // CLI host; mcp-server projects the returned Findings to LSP Diagnostics +
  // CodeActions. Subset mirrors the real export shape (lean cold-compile).
  export type LspGauntletRunner = (globs?: readonly string[]) => Promise<{
    readonly findings: ReadonlyArray<{
      readonly ruleId: string;
      readonly severity: 'advisory' | 'warning' | 'error';
      readonly level: 'L0' | 'L1' | 'L2' | 'L3' | 'L4';
      readonly title: string;
      readonly detail: string;
      readonly location?: { readonly file: string; readonly line?: number; readonly column?: number };
      readonly remediation?:
        | { readonly kind: 'patch'; readonly description: string; readonly diff: string }
        | { readonly kind: 'instruction'; readonly description: string; readonly steps: readonly string[] };
    }>;
    readonly blocked: boolean;
  }>;

  export function runLspStdio(runGauntlet: LspGauntletRunner): Promise<void>;
}
