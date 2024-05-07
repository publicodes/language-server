import { TextDocument } from "vscode-languageserver-textdocument";
import { FilePath, LSContext } from "./context";
import Engine from "publicodes";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/node.js";
import { parseDocument } from "./parseRules";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Logger } from "publicodes";
import { mapAppend } from "./helpers";

export default async function validate(
  ctx: LSContext,
  document?: TextDocument,
  // if not already opened in the editor
  documentURI?: string,
): Promise<void> {
  ctx.diagnostics = new Map();

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
    ctx.rawPublicodesRules = {};
    ctx.fileInfos.forEach((fileInfo) => {
      ctx.rawPublicodesRules = {
        ...ctx.rawPublicodesRules,
        ...fileInfo.rawRules,
      };
    });

    ctx.connection.console.log(
      `[validate] Parsing ${Object.keys(ctx.rawPublicodesRules).length} rules`,
    );
    const logger = getDiagnosticsLogger(ctx);
    ctx.connection.console.log(`[validate] logger: ${logger}`);
    ctx.engine = new Engine(ctx.rawPublicodesRules, { logger });
    ctx.parsedRules = ctx.engine.getParsedRules();

    // Evaluates all the rules to get unit warning
    // PERF: with large models, this could be an issue
    Object.keys(ctx.parsedRules).forEach((rule) => ctx.engine.evaluate(rule));

    ctx.connection.console.log(
      `[validate] Parsed ${Object.keys(ctx.parsedRules).length} rules`,
    );

    // Remove previous diagnostics
    ctx.diagnosticsURI.forEach((uri) => {
      ctx.connection.sendDiagnostics({ uri, diagnostics: [] });
      ctx.diagnosticsURI = new Set();
    });
  } catch (e: any) {
    const { filePath, diagnostic } = getDiagnosticFromErrorMsg(ctx, e.message);
    ctx.diagnostics.set(filePath, [diagnostic]);
  }

  ctx.diagnostics.forEach((diagnostics, path) => {
    const uri = pathToFileURL(path).href;
    ctx.diagnosticsURI.add(uri);
    ctx.connection.sendDiagnostics({ uri, diagnostics });
  });
}

function getDiagnosticsLogger(ctx: LSContext): Logger {
  return {
    log(msg: string) {
      ctx.connection.console.log(`[publicodes:log] ${msg}`);
    },
    warn(msg: string) {
      const { filePath, diagnostic } = getDiagnosticFromErrorMsg(
        ctx,
        msg,
        DiagnosticSeverity.Warning,
      );
      mapAppend(ctx.diagnostics, filePath, diagnostic);
    },
    error(msg: string) {
      const { filePath, diagnostic } = getDiagnosticFromErrorMsg(ctx, msg);
      mapAppend(ctx.diagnostics, filePath, diagnostic);
    },
  };
}

function getDiagnosticFromErrorMsg(
  ctx: LSContext,
  message: string,
  severity: DiagnosticSeverity = DiagnosticSeverity.Error,
): { filePath: FilePath | undefined; diagnostic: Diagnostic } {
  const wrongRule = getPublicodeRuleNameFromErrorMsg(message);
  const filePath = ctx.ruleToFileNameMap.get(wrongRule);
  const pos = ctx.fileInfos
    .get(filePath)
    ?.ruleDefs.find(({ names }) => names.join(" . ") === wrongRule)
    ?.namesPos ?? {
    start: { row: 0, column: 0 },
    end: { row: 0, column: 0 },
  };

  return {
    filePath,
    diagnostic: {
      severity,
      range: {
        start: { line: pos.start.row, character: pos.start.column },
        end: { line: pos.end.row, character: pos.end.column },
      },
      message: message.trimStart(),
    },
  };
}

function getPublicodeRuleNameFromErrorMsg(msg: string) {
  const match = msg.match(/➡️  Dans la règle "([^\n\r]*)"/);
  if (match == null) {
    return undefined;
  }
  return match[1];
}
