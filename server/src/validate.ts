import { TextDocument } from "vscode-languageserver-textdocument";
import { LSContext } from "./context";
import Engine from "publicodes";
import { DiagnosticSeverity } from "vscode-languageserver/node.js";
import { parseDocument } from "./parseRules";
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
  document?: TextDocument,
  // if not already opened in the editor
  documentURI?: string,
): Promise<void> {
  let errorURI: string | undefined;

  ctx.diagnostics = [];

  if (document == undefined && ctx.lastOpenedFile != undefined) {
    if (documentURI !== undefined) {
      document = TextDocument.create(
        documentURI,
        "publicodes",
        1,
        "(we only care about the uri)",
      );
    } else {
      document = ctx.documents.get(ctx.lastOpenedFile);
    }
  }

  if (document == undefined) {
    throw new Error("No document to validate");
  }

  const docFilePath = fileURLToPath(document.uri);
  parseDocument(ctx, docFilePath, document);

  try {
    // Merge all raw rules (from all files) into one object
    // NOTE: a better way could be found?
    ctx.rawPublicodesRules = {}
    ctx.fileInfos.forEach((fileInfo) => {
      ctx.rawPublicodesRules = {
        ...ctx.rawPublicodesRules,
        ...fileInfo.rawRules,
      };
    });

    ctx.connection.console.log(
      `[validate] Parsing ${Object.keys(ctx.rawPublicodesRules).length} rules`,
    );
    ctx.engine = new Engine(ctx.rawPublicodesRules);
    ctx.parsedRules = ctx.engine.getParsedRules();
    ctx.connection.console.log(
      `[validate] Parsed ${Object.keys(ctx.parsedRules).length} rules`,
    );
    // Remove previous diagnostics
    ctx.URIToRevalidate.delete(document.uri);
    ctx.connection.sendDiagnostics({ uri: document.uri, diagnostics: [] });
    if (ctx.URIToRevalidate.size > 0) {
      ctx.URIToRevalidate.forEach((uri) => {
        validate(ctx, ctx.documents.get(uri), uri);
      });
    }
  } catch (e: any) {
    const wrongRule = getPublicodeRuleFileNameFromError(e);
    const filePath = ctx.ruleToFileNameMap.get(wrongRule);
    errorURI =
      wrongRule !== undefined
        ? pathToFileURL(ctx.ruleToFileNameMap.get(wrongRule) ?? document.uri)
          .href
        : document.uri;

    const pos = ctx.fileInfos
      .get(filePath)
      ?.ruleDefs.find(({ names }) => names.join(" . ") === wrongRule)
      ?.namesPos ?? {
      start: { row: 0, column: 0 },
      end: { row: 0, column: 0 },
    };

    ctx.diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range: {
        start: { line: pos.start.row, character: pos.start.column },
        end: { line: pos.end.row, character: pos.end.column },
      },
      message: e.message,
    });
  }

  errorURI = errorURI ?? document.uri;
  if (ctx.diagnostics.length > 0) {
    // TODO: what needed for?
    ctx.URIToRevalidate.add(errorURI);
  }
  console.log(
    `[validate] Sending ${ctx.diagnostics.length} diagnostics to:`,
    errorURI,
  );
  ctx.connection.sendDiagnostics({
    uri: errorURI,
    diagnostics: ctx.diagnostics,
  });
}
