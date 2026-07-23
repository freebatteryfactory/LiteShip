#!/usr/bin/env node
/**
 * Public LiteShip executable. The facade owns the command name while the
 * implementation remains in its declared @liteship/cli dependency.
 */
import { run } from '@liteship/cli';

const exitCode = await run(process.argv.slice(2), {
  // The public facade owns both dependencies. Supplying the importer here makes
  // `liteship mcp` / `liteship lsp` resolve through the facade's graph under
  // isolated installs while the standalone CLI keeps its optional-sibling
  // diagnostic when @liteship/mcp-server is genuinely absent.
  importMcpServer: () => import('@liteship/mcp-server'),
});
process.exit(exitCode);
