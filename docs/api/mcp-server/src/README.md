[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / mcp-server/src

# mcp-server/src

## Namespaces

- [JsonRpcServer](namespaces/JsonRpcServer/README.md)

## Interfaces

- [FindingLike](interfaces/FindingLike.md)
- [FindingLocationLike](interfaces/FindingLocationLike.md)
- [FrameReader](interfaces/FrameReader.md)
- [GetPromptResult](interfaces/GetPromptResult.md)
- [JsonRpcErrorResponse](interfaces/JsonRpcErrorResponse.md)
- [JsonRpcNotification](interfaces/JsonRpcNotification.md)
- [JsonRpcRequest](interfaces/JsonRpcRequest.md)
- [JsonRpcSuccess](interfaces/JsonRpcSuccess.md)
- [LspCodeAction](interfaces/LspCodeAction.md)
- [LspCommand](interfaces/LspCommand.md)
- [LspDiagnostic](interfaces/LspDiagnostic.md)
- [LspHandleResult](interfaces/LspHandleResult.md)
- [LspNotification](interfaces/LspNotification.md)
- [LspPosition](interfaces/LspPosition.md)
- [LspRange](interfaces/LspRange.md)
- [LspServerState](interfaces/LspServerState.md)
- [LspTextEdit](interfaces/LspTextEdit.md)
- [LspWorkspaceEdit](interfaces/LspWorkspaceEdit.md)
- [McpPrompt](interfaces/McpPrompt.md)
- [McpPromptArgument](interfaces/McpPromptArgument.md)
- [McpResource](interfaces/McpResource.md)
- [McpResourceContents](interfaces/McpResourceContents.md)
- [McpToolCall](interfaces/McpToolCall.md)
- [McpToolResult](interfaces/McpToolResult.md)
- [McpUiResource](interfaces/McpUiResource.md)
- [McpUiResourceContents](interfaces/McpUiResourceContents.md)
- [McpUiResourceCsp](interfaces/McpUiResourceCsp.md)
- [McpUiResourceMeta](interfaces/McpUiResourceMeta.md)
- [PublishDiagnosticsParams](interfaces/PublishDiagnosticsParams.md)
- [StartOpts](interfaces/StartOpts.md)

## Type Aliases

- [FindingLevel](type-aliases/FindingLevel.md)
- [FindingRemediationLike](type-aliases/FindingRemediationLike.md)
- [FindingSeverity](type-aliases/FindingSeverity.md)
- [JsonRpcId](type-aliases/JsonRpcId.md)
- [JsonRpcResponse](type-aliases/JsonRpcResponse.md)
- [LspDiagnosticSeverity](type-aliases/LspDiagnosticSeverity.md)
- [LspGauntletRunner](type-aliases/LspGauntletRunner.md)
- [ParseOutcome](type-aliases/ParseOutcome.md)

## Variables

- [APPLY\_PATCH\_COMMAND](variables/APPLY_PATCH_COMMAND.md)
- [CodeActionKind](variables/CodeActionKind.md)
- [DIAGNOSTIC\_SOURCE](variables/DIAGNOSTIC_SOURCE.md)
- [DiagnosticSeverity](variables/DiagnosticSeverity.md)
- [errorResponse](variables/errorResponse.md)
- [InternalError](variables/InternalError.md)
- [InvalidParams](variables/InvalidParams.md)
- [InvalidRequest](variables/InvalidRequest.md)
- [JsonRpcServer](variables/JsonRpcServer.md)
- [jsonRpcServerCapsule](variables/jsonRpcServerCapsule.md)
- [LITESHIP\_CHECK\_METHOD](variables/LITESHIP_CHECK_METHOD.md)
- [LSP\_SERVER\_CAPABILITIES](variables/LSP_SERVER_CAPABILITIES.md)
- [MethodNotFound](variables/MethodNotFound.md)
- [parse](variables/parse.md)
- [ParseError](variables/ParseError.md)
- [SHOW\_INSTRUCTION\_COMMAND](variables/SHOW_INSTRUCTION_COMMAND.md)
- [successResponse](variables/successResponse.md)

## Functions

- [dispatch](functions/dispatch.md)
- [dispatchToolCall](functions/dispatchToolCall.md)
- [encodeFrame](functions/encodeFrame.md)
- [fileToUri](functions/fileToUri.md)
- [getPrompt](functions/getPrompt.md)
- [groupDiagnosticsByUri](functions/groupDiagnosticsByUri.md)
- [handleLspMessage](functions/handleLspMessage.md)
- [initialLspState](functions/initialLspState.md)
- [listAppResources](functions/listAppResources.md)
- [listManifestResources](functions/listManifestResources.md)
- [listPrompts](functions/listPrompts.md)
- [listResources](functions/listResources.md)
- [listTools](functions/listTools.md)
- [listUiResources](functions/listUiResources.md)
- [makeFrameReader](functions/makeFrameReader.md)
- [mcpAppManifest](functions/mcpAppManifest.md)
- [projectFinding](functions/projectFinding.md)
- [projectRemediation](functions/projectRemediation.md)
- [readAppResource](functions/readAppResource.md)
- [readManifestResource](functions/readManifestResource.md)
- [readResource](functions/readResource.md)
- [readUiResource](functions/readUiResource.md)
- [runHttp](functions/runHttp.md)
- [runLspStdio](functions/runLspStdio.md)
- [runStdio](functions/runStdio.md)
- [severityToDiagnostic](functions/severityToDiagnostic.md)
- [start](functions/start.md)
