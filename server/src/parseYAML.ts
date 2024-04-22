import { TextDocument } from "vscode-languageserver-textdocument";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/node.js";
import { YAMLParseError, parse } from "yaml";
import { LSContext } from "./context";

export default function parseYAML(
  ctx: LSContext,
  document?: TextDocument,
  text?: string
): { rules: object; error?: Diagnostic } {
  if (document == undefined && ctx.lastOpenedFile != undefined) {
    document = ctx.documents.get(ctx.lastOpenedFile);
  }
  if (document == undefined) {
    return { rules: {} };
  }
  try {
    const parsedRules = parse(text ?? document.getText());
    ctx.connection.console.log(
      `parseYAML Parsed ${Object.keys(parsedRules).length} rules`
    );
    return { rules: parsedRules };
  } catch (e: YAMLParseError | any) {
    ctx.connection.console.log(`Error parsing YAML: ${e}`);
    if (e instanceof YAMLParseError) {
      return {
        rules: {},
        error: {
          severity: DiagnosticSeverity.Error,
          range: {
            start: document.positionAt(e.pos[0]),
            end: document.positionAt(e.pos[1]),
          },
          message: e.message,
          source: "publicodes",
        },
      };
    }
  }
  return { rules: {} };
}
