/**
 * LiteShip's production host projection for feature-edge facts.
 *
 * Audit owns the generic enumerators; runtime packages own their catalogs. This
 * CLI host is the one place those owners are composed into fleet policy. The
 * optional MCP sibling is injected so @liteship/cli keeps no package edge on it.
 *
 * @module
 */

import {
  buildCatalogFeatureEdgeFamily,
  buildTypedEcsFeatureEdgeFacts,
  combineFeatureEdgeFamilies,
  enumerateSwitchSubjects,
  type CatalogFeatureEdgeSite,
} from '@liteship/audit';
import { ASSEMBLY_KINDS } from '@liteship/core';
import {
  COMMAND_CAPABILITIES,
  COMMAND_CAPABILITY_DISPOSITIONS,
  COMMAND_CATALOG,
  commandRegistry,
} from '@liteship/command';
import {
  AudioSystem,
  EffectSystem,
  MotionSampleSystem,
  PassThroughMixer,
  SceneParts,
  SceneSeedParts,
  SVGSystem,
  SyncSystem,
  TransitionSystem,
  VideoSystem,
} from '@liteship/scene';
import type { FeatureEdgeFacts, FeatureEdgeFamilyFacts } from '@liteship/gauntlet';
import { cliExecutorNames } from '../dispatch.js';
import { buildFleetEventFeatureEdgeFamily } from './fleet-event-feature-edge.js';

interface NamedMcpResource {
  readonly uri: string;
}

interface NamedMcpPrompt {
  readonly name: string;
}

interface McpMethodDescriptor {
  readonly method: string;
  readonly capability?: string;
}

/** Optional-sibling MCP projections required by the repository host census. */
export interface McpFeatureEdgeOwners {
  readonly LSP_METHOD_CATALOG: readonly { readonly method: string }[];
  readonly MCP_METHOD_CATALOG: readonly McpMethodDescriptor[];
  readonly listMcpResources: () => readonly NamedMcpResource[];
  readonly mcpResourceReaderUris: () => readonly string[];
  readonly listPrompts: () => readonly NamedMcpPrompt[];
  readonly promptResolverNames: () => readonly string[];
  readonly lspNotificationProducerMethods: () => readonly string[];
}

function rows(
  subjects: readonly string[],
  mechanism: CatalogFeatureEdgeSite['mechanism'],
  file: string,
): readonly CatalogFeatureEdgeSite[] {
  return subjects.map((subject) => ({ subject, mechanism, file, line: 1 }));
}

function buildSceneEcsFamily(): FeatureEdgeFamilyFacts {
  const systems = [
    VideoSystem(0),
    AudioSystem(0, 60, 48_000),
    TransitionSystem(0),
    EffectSystem(0),
    SyncSystem(0, 60),
    PassThroughMixer(0, () => undefined),
    MotionSampleSystem(0),
    SVGSystem(0),
  ];
  return buildTypedEcsFeatureEdgeFacts({
    declarationOwner: 'packages/scene/src/parts.ts',
    seedOwner: 'packages/scene/src/compile.ts',
    systemOwner: 'packages/scene/src/systems',
    parts: SceneParts,
    seedParts: SceneSeedParts,
    systems,
  });
}

/** Build the exact live feature-edge fact pack used by the IR gauntlet. */
export function buildLiteShipFeatureEdgeFacts(repoRoot: string, mcp: McpFeatureEdgeOwners): FeatureEdgeFacts {
  const lspRoutes = enumerateSwitchSubjects(repoRoot, 'packages/mcp-server/src/lsp/server.ts', 'route');
  const lsp = buildCatalogFeatureEdgeFamily({
    family: 'lsp-method',
    declarations: mcp.LSP_METHOD_CATALOG.map((descriptor) => ({
      subject: descriptor.method,
      mechanism: 'protocol-declaration',
      file: 'packages/mcp-server/src/lsp/server.ts',
      line: 1,
    })),
    producers: [
      ...lspRoutes.map((route) => ({
        subject: route.subject,
        mechanism: 'request-route' as const,
        file: 'packages/mcp-server/src/lsp/server.ts',
        line: route.line,
      })),
      ...rows(mcp.lspNotificationProducerMethods(), 'notification-emitter', 'packages/mcp-server/src/lsp/server.ts'),
    ],
    sourceImage: [{ owner: 'LSP_METHOD_CATALOG', value: mcp.LSP_METHOD_CATALOG }],
  });

  const mcpRoutes = enumerateSwitchSubjects(repoRoot, 'packages/mcp-server/src/dispatch.ts', 'invoke');
  const mcpMethods = buildCatalogFeatureEdgeFamily({
    family: 'mcp-method',
    declarations: mcp.MCP_METHOD_CATALOG.map((descriptor) => ({
      subject: descriptor.method,
      mechanism: 'protocol-declaration',
      file: 'packages/mcp-server/src/capabilities.ts',
      line: 1,
    })),
    consumers: mcp.MCP_METHOD_CATALOG.filter((descriptor) => descriptor.capability !== undefined).map((descriptor) => ({
      subject: descriptor.method,
      mechanism: 'capability-advertisement',
      file: 'packages/mcp-server/src/capabilities.ts',
      line: 1,
    })),
    producers: mcpRoutes.map((route) => ({
      subject: route.subject,
      mechanism: 'rpc-handler',
      file: 'packages/mcp-server/src/dispatch.ts',
      line: route.line,
    })),
    sourceImage: [{ owner: 'MCP_METHOD_CATALOG', value: mcp.MCP_METHOD_CATALOG }],
  });

  const commandCapabilities = buildCatalogFeatureEdgeFamily({
    family: 'command-capability',
    declarations: rows(COMMAND_CAPABILITIES, 'context-declaration', 'packages/command/src/registry.ts'),
    consumers: COMMAND_CATALOG.flatMap((descriptor) =>
      (descriptor.requires ?? []).map((subject) => ({
        subject,
        mechanism: 'command-requirement' as const,
        file: 'packages/command/src/catalog.ts',
        line: 1,
      })),
    ),
    producers: COMMAND_CAPABILITY_DISPOSITIONS.map((disposition) => ({
      subject: disposition.capability,
      mechanism: disposition.provision === 'modeled-fallback' ? 'modeled-degradation' : 'host-provider',
      file:
        disposition.provision === 'shared-host'
          ? 'packages/command/src/host/context.ts'
          : disposition.provision === 'cli-host'
            ? 'packages/cli/src/commands'
            : 'packages/command/src/commands/scene.ts',
      line: 1,
    })),
    sourceImage: [
      { owner: 'COMMAND_CAPABILITIES', value: COMMAND_CAPABILITIES },
      { owner: 'COMMAND_CAPABILITY_DISPOSITIONS', value: COMMAND_CAPABILITY_DISPOSITIONS },
    ],
  });

  const cliExecutors = new Set(cliExecutorNames());
  const commandProducers = COMMAND_CATALOG.flatMap((descriptor): CatalogFeatureEdgeSite[] => {
    if (descriptor.executionKind === 'handler') {
      return commandRegistry.get(descriptor.name)?.handler === undefined
        ? []
        : [
            {
              subject: descriptor.name,
              mechanism: 'command-handler',
              file: 'packages/command/src/catalog.ts',
              line: 1,
            },
          ];
    }
    return cliExecutors.has(descriptor.name)
      ? [{ subject: descriptor.name, mechanism: 'cli-executor', file: 'packages/cli/src/dispatch.ts', line: 1 }]
      : [];
  });
  const commands = buildCatalogFeatureEdgeFamily({
    family: 'command',
    declarations: rows(
      COMMAND_CATALOG.map((descriptor) => descriptor.name),
      'registry-entry',
      'packages/command/src/catalog.ts',
    ),
    producers: commandProducers,
    sourceImage: [{ owner: 'COMMAND_CATALOG', value: COMMAND_CATALOG }],
  });

  const listedResources = mcp.listMcpResources();
  const resources = buildCatalogFeatureEdgeFamily({
    family: 'mcp-resource',
    declarations: rows(
      listedResources.map((resource) => resource.uri),
      'registry-entry',
      'packages/mcp-server/src/dispatch.ts',
    ),
    producers: rows(mcp.mcpResourceReaderUris(), 'resource-reader', 'packages/mcp-server/src/dispatch.ts'),
    sourceImage: [{ owner: 'listMcpResources', value: listedResources }],
  });
  const listedPrompts = mcp.listPrompts();
  const prompts = buildCatalogFeatureEdgeFamily({
    family: 'mcp-prompt',
    declarations: rows(
      listedPrompts.map((prompt) => prompt.name),
      'registry-entry',
      'packages/mcp-server/src/prompts.ts',
    ),
    producers: rows(mcp.promptResolverNames(), 'prompt-resolver', 'packages/mcp-server/src/prompts.ts'),
    sourceImage: [{ owner: 'listPrompts', value: listedPrompts }],
  });

  const capsuleRoutes = enumerateSwitchSubjects(repoRoot, 'scripts/capsule-compile.ts', 'dispatchHarness');
  const capsules = buildCatalogFeatureEdgeFamily({
    family: 'capsule-kind',
    declarations: rows(ASSEMBLY_KINDS, 'protocol-declaration', 'packages/core/src/authoring/capsule.ts'),
    producers: capsuleRoutes.map((route) => ({
      subject: route.subject,
      mechanism: 'capsule-compiler',
      file: 'scripts/capsule-compile.ts',
      line: route.line,
    })),
    sourceImage: [{ owner: 'ASSEMBLY_KINDS', value: ASSEMBLY_KINDS }],
  });

  return combineFeatureEdgeFamilies([
    buildSceneEcsFamily(),
    lsp,
    mcpMethods,
    commandCapabilities,
    commands,
    resources,
    prompts,
    capsules,
    buildFleetEventFeatureEdgeFamily(repoRoot),
  ]);
}
