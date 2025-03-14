import {
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind,
} from "vscode-languageserver/node.js";
import { GlobalConfig } from "./context";
import { tokenModifiers, tokenTypes } from "./semanticTokens";
import { PUBLICODES_FILE_EXTENSIONS } from "./parseRules";
import { PublicodesCommands } from "./codeAction";

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
    // Defines the capabilities provided by the server
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Full,

      codeActionProvider: true,

      executeCommandProvider: {
        commands: [PublicodesCommands.CREATE_RULE],
      },

      // Tell the client that this server supports code completion.
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: ["."],
      },

      definitionProvider: true,
      hoverProvider: true,
      semanticTokensProvider: {
        legend: {
          tokenTypes,
          tokenModifiers,
        },
        range: false,
        full: {
          delta: false,
        },
      },
    },
  };

  if (hasWorkspaceFolderCapability) {
    const globPublicodesFiles = `**/*.{${PUBLICODES_FILE_EXTENSIONS.join(",")}}`;

    initResult.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
      fileOperations: {
        didDelete: {
          filters: [{ scheme: "file", pattern: { glob: globPublicodesFiles } }],
        },
        didRename: {
          filters: [{ scheme: "file", pattern: { glob: globPublicodesFiles } }],
        },
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
