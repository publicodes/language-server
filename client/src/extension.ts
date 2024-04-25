/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from "path";
import {
  workspace,
  ExtensionContext,
  languages,
  TextDocument,
  SemanticTokens,
} from "vscode";

import {
  CancellationToken,
  LanguageClient,
  LanguageClientOptions,
  SemanticTokenModifiers,
  SemanticTokenTypes,
  SemanticTokensParams,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  // The server is implemented in node
  const serverModule = context.asAbsolutePath(
    path.join("server", "out", "server.js"),
  );

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    documentSelector: [{ scheme: "file", language: "publicodes" }],
    synchronize: {
      // Notify the server about file changes to '.clientrc files contained in the workspace
      fileEvents: workspace.createFileSystemWatcher("**/.clientrc"),
    },
    markdown: {
      isTrusted: true,
    },
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    "publicodes-language-server",
    "Publicodes Language Server",
    serverOptions,
    clientOptions,
  );

  context.subscriptions.push(
    languages.registerDocumentSemanticTokensProvider(
      { scheme: "file", language: "publicodes" },
      {
        async provideDocumentSemanticTokens(
          document: TextDocument,
          _token: CancellationToken,
        ): Promise<SemanticTokens> {
          const params: SemanticTokensParams = {
            textDocument: { uri: document.uri.toString() },
          };

          return client
            .sendRequest("textDocument/semanticTokens/full", params)
            .catch((e) => {
              console.error(
                "[Publicodes] Error while requesting semantic tokens:",
                e,
              );
              return e;
            }) as Promise<SemanticTokens>;
        },
      },
      // TODO: duplicate code from server/src/semanticTokens.ts
      {
        tokenTypes: [
          SemanticTokenTypes.function,
          SemanticTokenTypes.number,
          SemanticTokenTypes.macro,
          SemanticTokenTypes.string,
          SemanticTokenTypes.comment,
          SemanticTokenTypes.variable,
          SemanticTokenTypes.operator,
          SemanticTokenTypes.namespace,
        ],
        tokenModifiers: [
          SemanticTokenModifiers.readonly,
          SemanticTokenModifiers.documentation,
        ],
      },
    ),
  );

  // Start the client. This will also launch the server
  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
