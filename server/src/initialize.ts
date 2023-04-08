import {
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind,
} from "vscode-languageserver/node";
import { GlobalConfig } from "./context";

export default function initialize(params: InitializeParams): {
  config: GlobalConfig;
  initResult: InitializeResult;
} {
  const capabilities = params.capabilities;

  // Does the client support the `workspace/configuration` request?
  // If not, we fall back using global settings.
  let hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  let hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  let hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  );

  const initResult: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion.
      completionProvider: {
        resolveProvider: true,
      },
    },
  };
  if (hasWorkspaceFolderCapability) {
    initResult.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    };
  }
  return {
    config: {
      hasConfigurationCapability,
      hasWorkspaceFolderCapability,
      hasDiagnosticRelatedInformationCapability,
    },
    initResult,
  };
}
