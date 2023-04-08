/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

import { LSContext, defaultDocSettings } from "./context";
import initialize from "./initialize";
import initializedHandler from "./initialized";
import { completionHandler, completionResolveHandler } from "./completion";
import { changeConfigurationHandler } from "./configuration";
import validate from "./validate";
import { onChangeHandler } from "./onChange";

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
  rawPublicodesRules: {},
  parsedRules: {},
  dirsToIgnore: ["node_modules", ".git", "i18n"],
  lastOpenedFile: undefined,
};

ctx.connection.onInitialize((params: InitializeParams) => {
  const { config, initResult } = initialize(params);
  ctx.config = config;
  return initResult;
});

ctx.connection.onInitialized(initializedHandler(ctx));

ctx.connection.onDidChangeConfiguration(changeConfigurationHandler(ctx));

// Only keep settings for open documents
ctx.documents.onDidClose((e) => {
  ctx.documentSettings.delete(e.document.uri);
});

// Only keep settings for open documents
ctx.documents.onDidSave((e) => {
  validate(ctx, e.document);
});

ctx.documents.onDidOpen((e) => {
  ctx.lastOpenedFile = e.document.uri;
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
ctx.documents.onDidChangeContent(onChangeHandler(ctx));

// ctx.connection.onDidSaveTextDocument(onSaveHandler(ctx));

ctx.connection.onDidChangeWatchedFiles((_change) => {
  // Monitored files have change in VSCode
  ctx.connection.console.log("We received an file change event");
});

ctx.connection.onCompletion(completionHandler(ctx));

// This handler resolves additional information for the item selected in
// the completion list.
ctx.connection.onCompletionResolve(completionResolveHandler(ctx));

// Make the text document manager listen on the connection
// for open, change and close text document events
ctx.documents.listen(ctx.connection);

// Listen on the connection
ctx.connection.listen();
