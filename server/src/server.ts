/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  Range,
  Position,
  CompletionTriggerKind,
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";

import Engine, { PublicodesError, RuleNode } from "publicodes";
import { parse } from "yaml";
import { readFileSync, readdir, readdirSync, statSync } from "fs";
import { fileURLToPath } from "node:url";
import { join } from "path";

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  // Does the client support the `workspace/configuration` request?
  // If not, we fall back using global settings.
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  );

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion.
      completionProvider: {
        resolveProvider: true,
      },
    },
  };
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    };
  }
  return result;
});

const dirToIgnore = ["node_modules", ".git", "i18n"];

// Explore recursively all files in the workspace folder
// and concat all yaml files into one string for parsing
function getRawPublicodesRules(path: string, rules: object): object {
  const files = readdirSync(path);
  connection.console.log(`Files: ${files.join(",")}`);
  files?.forEach((file) => {
    const filePath = join(path, file);
    // TODO: should be .publi.yaml instead of ignoring i18n/
    if (filePath.endsWith(".yaml")) {
      rules = {
        ...rules,
        ...parse(readFileSync(filePath).toString()),
      };
    } else if (
      statSync(filePath)?.isDirectory() &&
      !dirToIgnore.includes(file)
    ) {
      rules = getRawPublicodesRules(filePath, rules);
    }
  });
  return rules;
}

let rawPublicodesRules = {};
let parsedRules = {};

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(
      DidChangeConfigurationNotification.type,
      undefined
    );
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.getWorkspaceFolders().then((folders) => {
      if (folders) {
        folders.forEach((folder) => {
          const path = fileURLToPath(folder.uri);
          connection.console.log(`Workspace folder: ${path}`);
          rawPublicodesRules = getRawPublicodesRules(path, {});
          parsedRules = new Engine(rawPublicodesRules).getParsedRules();
          connection.console.log(
            `Parsed ${Object.keys(parsedRules).length} rules`
          );
        });
      }
    });
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      connection.console.log("Workspace folder change event received.");
    });
  }
});

// The example settings
interface ExampleSettings {
  maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration((change) => {
  if (hasConfigurationCapability) {
    // Reset all cached document settings
    documentSettings.clear();
  } else {
    globalSettings = <ExampleSettings>(
      (change.settings.languageServerExample || defaultSettings)
    );
  }

  // Revalidate all open text documents
  documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
  if (!hasConfigurationCapability) {
    return Promise.resolve(globalSettings);
  }
  let result = documentSettings.get(resource);
  if (!result) {
    result = connection.workspace.getConfiguration({
      scopeUri: resource,
      section: "publicodes-language-server",
    });
    documentSettings.set(resource, result);
  }
  return result;
}

// Only keep settings for open documents
documents.onDidClose((e) => {
  documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {});

const publicodeEngine = new Map<string, Engine>();

async function validateTextDocument(document: TextDocument): Promise<void> {
  // In this simple example we get the settings for every validate run.
  const settings = await getDocumentSettings(document.uri);

  // const rules = parse(document.getText());
  // try {
  //   publicodeEngine.set(document.uri, new Engine(rules));
  // } catch (e: Error | any) {
  //   connection.console.log(Object.keys(e.info).join(", "));
  //   // const diagnostics = e?.errors.map((error: PublicodesError<any>) => {
  //   //   return {
  //   //     severity: DiagnosticSeverity.Error,
  //   //     range: {
  //   //       start: document.positionAt(e.index),
  //   //       end: document.positionAt(e.index + e.range),
  //   //     },
  //   //     message: error.message,
  //   //     source: "publicodes",
  //   //   };
  //   // });
  //   // connection.sendDiagnostics({ uri: document.uri, diagnostics });
  // }

  // The validator creates diagnostics for all uppercase words length 2 and more
  // const text = document.getText();
  // const pattern = /\b[A-Z]{2,}\b/g;
  // let m: RegExpExecArray | null;
  //
  // let problems = 0;
  // const diagnostics: Diagnostic[] = [];
  // while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
  //   problems++;
  //   const diagnostic: Diagnostic = {
  //     severity: DiagnosticSeverity.Warning,
  //     range: {
  //       start: document.positionAt(m.index),
  //       end: document.positionAt(m.index + m[0].length),
  //     },
  //     message: `${m[0]} is all uppercase.`,
  //     source: "ex",
  //   };
  //   if (hasDiagnosticRelatedInformationCapability) {
  //     diagnostic.relatedInformation = [
  //       {
  //         location: {
  //           uri: document.uri,
  //           range: Object.assign({}, diagnostic.range),
  //         },
  //         message: "Spelling matters",
  //       },
  //       {
  //         location: {
  //           uri: document.uri,
  //           range: Object.assign({}, diagnostic.range),
  //         },
  //         message: "Particularly for names",
  //       },
  //     ];
  //   }
  //   diagnostics.push(diagnostic);
  // }
  //
  // Send the computed diagnostics to VSCode.
}

connection.onDidChangeWatchedFiles((_change) => {
  // Monitored files have change in VSCode
  connection.console.log("We received an file change event");
});

function getLine(doc: TextDocument, line: number): string {
  const lineRange = getLineRange(doc, line);
  return doc.getText(lineRange);
}

function getLineRange(doc: TextDocument, line: number): Range {
  const lineStart = getLineStart(line);
  const lineEnd = getLineEnd(doc, line);
  return Range.create(lineStart, lineEnd);
}

function getLineEnd(doc: TextDocument, line: number): Position {
  const nextLineOffset = getLineOffset(doc, line + 1);
  return doc.positionAt(nextLineOffset - 1);
}

function getLineOffset(doc: TextDocument, line: number): number {
  const lineStart = getLineStart(line);
  return doc.offsetAt(lineStart);
}

function getLineStart(line: number): Position {
  return Position.create(line, 0);
}

// This handler provides the initial list of the completion items.
connection.onCompletion(
  (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    return Object.entries(parsedRules).map(([dottedName, rule]) => {
      const { titre, description } = (rule as RuleNode).rawNode;
      return {
        label: dottedName,
        kind: CompletionItemKind.Function,
        data: rule,
        labelDetails: {
          detail: " (règle)",
          description: titre,
        },
        documentation: description,
      };
    });
  }
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
  const { titre, description } = item.data.rawNode;
  return {
    ...item,
    labelDetails: {
      detail: " (règle)",
      description: titre,
    },
    documentation: description,
  };
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
