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
  export function start(opts?: { http?: string }): Promise<void>;
}
