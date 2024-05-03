/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
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

let ctx: LSContext = {
  // Create a connection for the server, using Node's IPC as a transport.
  // Also include all preview / proposed LSP features.
  connection: createConnection(ProposedFeatures.all),
  // Create a simple text document manager.
  documents: new TextDocuments(TextDocument),
  // Cache the settings of all open documents
  documentSettings: new Map(),
  // The global settings, used when the `workspace/configuration` request is not supported by the client.
  // Please note that this is the case for the current client, but could change in the future.
  globalSettings: defaultDocSettings,
  config: {
    hasConfigurationCapability: false,
    hasWorkspaceFolderCapability: false,
    hasDiagnosticRelatedInformationCapability: false,
  },
  fileInfos: new Map(),
  diagnostics: [],
  ruleToFileNameMap: new Map(),
  fileNameToRulesMap: new Map(),
  URIToRevalidate: new Set(),
  rawPublicodesRules: {},
  parsedRules: {},
  dirsToIgnore: defaultDirsToIgnore,
  lastOpenedFile: undefined,
};

ctx.connection.onInitialize((params: InitializeParams) => {
  const { config, initResult } = initialize(params);
  ctx.config = config;
  return initResult;
});

ctx.connection.onInitialized(initializedHandler(ctx));

ctx.connection.onDidChangeConfiguration(changeConfigurationHandler(ctx));

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

ctx.documents.onDidOpen((e) => {
  ctx.lastOpenedFile = e.document.uri;
});

ctx.connection.onDefinition(onDefinitionHandler(ctx));
ctx.connection.onHover(onHoverHandler(ctx));

// The content of a text document has changed. This event is emitted when the
// text document first opened or when its content has changed.
// ctx.documents.onDidChangeContent(onChangeHandler(ctx));

// ctx.connection.onDidSaveTextDocument(onSaveHandler(ctx));

ctx.connection.onCompletion(completionHandler(ctx));

// This handler resolves additional information for the item selected in the
// completion list.
ctx.connection.onCompletionResolve(completionResolveHandler(ctx));

// Make the text document manager listen on the connection for open, change and
// close text document events
ctx.documents.listen(ctx.connection);

// Listen on the connection
ctx.connection.listen();
