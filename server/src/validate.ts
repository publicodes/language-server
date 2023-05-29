import { TextDocument } from "vscode-languageserver-textdocument";
import { LSContext } from "./context";
import Engine from "publicodes";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/node";
import { parseRawPublicodesRulesFromDocument } from "./publicodesRules";
import { fileURLToPath, pathToFileURL } from "node:url";

function getPublicodeRuleFileNameFromError(e: Error) {
  const match = e.message.match(/➡️  Dans la règle "([^\n\r]*)"/);
  if (match == null) {
    return undefined;
  }
  return match[1];
}

export default async function validate(
  ctx: LSContext,
  document?: TextDocument
): Promise<void> {
  let diagnostics: Diagnostic[] = [];
  let errorURI: string | undefined;

  if (document == undefined && ctx.lastOpenedFile != undefined) {
    document = ctx.documents.get(ctx.lastOpenedFile);
  }

  if (document != undefined) {
    const filePath = fileURLToPath(document.uri);
    ctx = parseRawPublicodesRulesFromDocument(ctx, filePath, document);
  }
  try {
    ctx.connection.console.log(
      `Parsing ${Object.keys(ctx.rawPublicodesRules).length} rules`
    );
    const engine = new Engine(ctx.rawPublicodesRules);
    ctx.parsedRules = engine.getParsedRules();
    ctx.connection.console.log(
      `Validate Parsed ${Object.keys(ctx.parsedRules).length} rules`
    );
    // validate dependencies
  } catch (e: any) {
    if (document != undefined) {
      const wrongRule = getPublicodeRuleFileNameFromError(e);
      errorURI =
        wrongRule !== undefined
          ? pathToFileURL(ctx.ruleToFileNameMap.get(wrongRule) ?? document.uri)
              .href
          : document.uri;
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: document.positionAt(0),
          end: document.positionAt(1),
        },
        message: e.message,
      });
    }
  }
  if (document != undefined) {
    console.log(`==== Sending ${diagnostics.length} diagnostics`);
    console.log(diagnostics);
    console.log(errorURI);
    ctx.connection.sendDiagnostics({
      uri: errorURI ?? document.uri,
      diagnostics,
    });
  }
}
