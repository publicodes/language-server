import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  DeleteFilesParams,
} from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";

import { LSContext, defaultDirsToIgnore, defaultDocSettings } from "./context";
import initialize from "./initialize";
import initializedHandler from "./initialized";
import { completionHandler, completionResolveHandler } from "./completion";
import { changeConfigurationHandler } from "./configuration";
import validate from "./validate";
import onDefinitionHandler from "./onDefinition";
import onHoverHandler from "./onHover";
import { semanticTokensFullProvider } from "./semanticTokens";
import Engine from "publicodes";
import { fileURLToPath } from "node:url";
import { deleteFileFromCtx } from "./helpers";
import {
  codeActionHandler,
  createRule,
  PublicodesCommands,
} from "./codeAction";

let ctx: LSContext = {
  // Create a connection for the server, using Node's IPC as a transport.
  // Also include all preview / proposed LSP features.
  connection: createConnection(ProposedFeatures.all),
  // Create a simple text document manager.
  documents: new TextDocuments(TextDocument),
  // Cache the settings of all open documents
  documentSettings: new Map(),
  // The global settings, used when the `workspace/configuration` request is
  // not supported by the client. Please note that this is the case for the
  // current client, but could change in the future.
  globalSettings: defaultDocSettings,
  config: {
    hasConfigurationCapability: false,
    hasWorkspaceFolderCapability: false,
    hasDiagnosticRelatedInformationCapability: false,
  },
  engine: new Engine({}),
  fileInfos: new Map(),
  diagnostics: new Map(),
  ruleToFileNameMap: new Map(),
  diagnosticsURI: new Set(),
  rawPublicodesRules: {},
  parsedRules: {},
  dirsToIgnore: defaultDirsToIgnore,
};

ctx.connection.onInitialize((params: InitializeParams) => {
  const { config, initResult } = initialize(params);
  ctx.config = config;
  return initResult;
});

ctx.connection.onInitialized(initializedHandler(ctx));

ctx.connection.onDidChangeConfiguration(changeConfigurationHandler(ctx));

ctx.connection.onDefinition(onDefinitionHandler(ctx));

ctx.connection.onHover(onHoverHandler(ctx));

// The content of a text document has changed. This event is emitted when the
// text document first opened or when its content has changed.
// ctx.documents.onDidChangeContent(onChangeHandler(ctx));

ctx.connection.onCompletion(completionHandler(ctx));

// This handler resolves additional information for the item selected in the
// completion list.
ctx.connection.onCompletionResolve(completionResolveHandler(ctx));

// Make the text document manager listen on the connection for open, change and
// close text document events
ctx.documents.listen(ctx.connection);

// Listen on the connection
ctx.connection.listen();

ctx.connection.onRequest(
  "textDocument/semanticTokens/full",
  semanticTokensFullProvider(ctx),
);

// Only keep settings for open documents
ctx.documents.onDidClose((e) => {
  ctx.documentSettings.delete(e.document.uri);
});

ctx.documents.onDidSave((e) => {
  validate(ctx, e.document);
});

// NOTE: I don't think we need this anymore as we directly parse tsTree when needed
// up-to-date with the document content like for auto-completion or semantic tokens.
// ctx.documents.onDidChangeContent((e) => {
//   // ctx.connection.console.log(`[onDidChangeContent] ${e.document.uri}`);
//   // parseDocument(ctx, fileURLToPath(e.document.uri), e.document);
//   // ctx.connection.console.log(`[onDidChangeContent] parsed ${e.document.uri}`);
// });

ctx.connection.workspace.onDidDeleteFiles((e: DeleteFilesParams) => {
  e.files.forEach(({ uri }) => {
    ctx.connection.console.log(`[onDidDeleteFiles] ${uri}`);
    deleteFileFromCtx(ctx, uri);
  });
  validate(ctx);
});

ctx.connection.workspace.onDidRenameFiles((e) => {
  e.files.forEach(({ oldUri, newUri }) => {
    const oldFilePath = fileURLToPath(oldUri);
    const newFilePath = fileURLToPath(newUri);
    const fileInfo = ctx.fileInfos.get(oldFilePath);
    if (fileInfo == undefined) {
      ctx.connection.console.error(
        `[onDidRenameFiles] file info not found: ${oldFilePath}`,
      );
      return;
    }

    ctx.fileInfos.set(newFilePath, fileInfo);

    const diagnostics = ctx.diagnostics.get(oldFilePath);
    if (diagnostics != undefined) {
      ctx.diagnostics.set(newFilePath, diagnostics);
      ctx.diagnosticsURI.add(newUri);
      ctx.connection.sendDiagnostics({
        uri: newUri,
        diagnostics,
      });
    }

    ctx.ruleToFileNameMap.forEach((filePath, rule) => {
      if (filePath === oldFilePath) {
        ctx.ruleToFileNameMap.set(rule, newFilePath);
      }
    });

    deleteFileFromCtx(ctx, oldUri);
  });
});

ctx.connection.onCodeAction((params) => codeActionHandler(ctx, params));

ctx.connection.onExecuteCommand((params) => {
  switch (params.command) {
    case PublicodesCommands.CREATE_RULE: {
      if (params.arguments == undefined || params.arguments.length === 0) {
        ctx.connection.console.error(
          `[onExecuteCommand] ${PublicodesCommands.CREATE_RULE} missing arguments`,
        );
        return;
      }
      createRule(ctx, params.arguments[0]);
      break;
    }
  }
});
