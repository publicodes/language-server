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
      fileEvents: [workspace.createFileSystemWatcher("**/.clientrc")],
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

  // FIXME: only way to have a notification when a folder is deleted. Howerver,
  // for now we only get the deleted folder, not the files inside.
  // Consequently, we don't manage the deletion of a folder (a simple window
  // reload is enough though).
  // context.subscriptions.push(
  //   workspace.onDidDeleteFiles((event: FileDeleteEvent) => {
  //     const params: DeleteFilesParams = {
  //       files: event.files.map((uri) => {
  //         return {
  //           uri: uri.toString(),
  //         };
  //       }),
  //     };
  //     client.sendNotification("workspace/didDeleteFiles", params);
  //   }),
  // );

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
          SemanticTokenTypes.class,
          SemanticTokenTypes.comment,
          SemanticTokenTypes.decorator,
          SemanticTokenTypes.enumMember,
          SemanticTokenTypes.function,
          SemanticTokenTypes.method,
          SemanticTokenTypes.keyword,
          SemanticTokenTypes.macro,
          SemanticTokenTypes.namespace,
          SemanticTokenTypes.number,
          SemanticTokenTypes.operator,
          SemanticTokenTypes.property,
          SemanticTokenTypes.string,
          SemanticTokenTypes.struct,
          SemanticTokenTypes.type,
          SemanticTokenTypes.variable,
        ],
        tokenModifiers: [
          SemanticTokenModifiers.declaration,
          SemanticTokenModifiers.definition,
          SemanticTokenModifiers.documentation,
          SemanticTokenModifiers.readonly,
          SemanticTokenModifiers.static,
        ],
      },
    ),
  );

  context.subscriptions.push(
    languages.registerCodeActionsProvider(
      { scheme: "file", language: "publicodes" },
      {
        provideCodeActions(document, range, context, token) {
          const params = {
            textDocument: { uri: document.uri.toString() },
            range,
            context,
          };
          return client.sendRequest("textDocument/codeAction", params, token);
        },
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
