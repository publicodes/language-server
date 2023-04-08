import { TextDocument } from "vscode-languageserver-textdocument";
import { LSContext } from "./context";
import Engine, { isPublicodesError } from "publicodes";
import { YAMLParseError, parse } from "yaml";
import { DiagnosticSeverity } from "vscode-languageserver/node";

export default async function validate(
  ctx: LSContext,
  document?: TextDocument
): Promise<void> {
  if (document != undefined) {
    try {
      ctx.rawPublicodesRules = {
        ...ctx.rawPublicodesRules,
        ...parse(document.getText()),
      };
    } catch (e: YAMLParseError | any) {
      const diagnostic = {
        severity: DiagnosticSeverity.Error,
        range: {
          start: document.positionAt(e.pos[0]),
          end: document.positionAt(e.pos[1]),
        },
        message: e.message,
        source: "publicodes",
      };
      ctx.connection.sendDiagnostics({
        uri: document.uri,
        diagnostics: [diagnostic],
      });
    }
  }
  try {
    ctx.connection.console.log(
      `Parsing ${Object.keys(ctx.rawPublicodesRules).length} rules`
    );
    const engine = new Engine(ctx.rawPublicodesRules);
    ctx.parsedRules = engine.getParsedRules();
    ctx.connection.console.log(
      `Parsed ${Object.keys(ctx.parsedRules).length} rules`
    );
    if (document != undefined) {
      ctx.connection.sendDiagnostics({
        uri: document.uri,
        diagnostics: [],
      });
    }
  } catch (e: any) {
    if (document != undefined) {
      const diagnostic = {
        severity: DiagnosticSeverity.Error,
        range: {
          start: document.positionAt(0),
          end: document.positionAt(1),
        },
        message: e.message,
      };
      ctx.connection.sendDiagnostics({
        uri: document.uri,
        diagnostics: [diagnostic],
      });
    }
  }
}
