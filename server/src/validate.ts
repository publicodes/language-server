import { TextDocument } from "vscode-languageserver-textdocument";
import { LSContext } from "./context";
import Engine from "publicodes";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/node";
import parseYAML from "./parseYAML";
import { resolveImports } from "./resolveImports";

export default async function validate(
  ctx: LSContext,
  document?: TextDocument
): Promise<void> {
  let diagnostics: Diagnostic[] = [];

  if (document == undefined && ctx.lastOpenedFile != undefined) {
    document = ctx.documents.get(ctx.lastOpenedFile);
  }

  if (document != undefined) {
    const { rules, error } = parseYAML(ctx, document);
    ctx.rawPublicodesRules = {
      ...ctx.rawPublicodesRules,
      ...resolveImports(rules, { verbose: false, ctx }),
    };
    if (error != undefined) {
      diagnostics.push(error);
    }
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
  } catch (e: any) {
    if (document != undefined) {
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
    ctx.connection.sendDiagnostics({
      uri: document.uri,
      diagnostics,
    });
  }
}
