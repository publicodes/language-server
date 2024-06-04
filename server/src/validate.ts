import { TextDocument } from "vscode-languageserver-textdocument";
import { FilePath, LSContext } from "./context";
import Engine from "publicodes";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/node.js";
import { parseDocument } from "./parseRules";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Logger } from "publicodes";
import { mapAppend, positionToRange } from "./helpers";
import { getRefInRule } from "./treeSitter";

export default async function validate(
  ctx: LSContext,
  document?: TextDocument,
): Promise<void> {
  ctx.diagnostics = new Map();

  if (document) {
    // Parse the document only if it has changed (not needed when a file is
    // deleted for example)
    const docFilePath = fileURLToPath(document.uri);
    parseDocument(ctx, docFilePath, document);
  }

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

    let startTimer = Date.now();
    ctx.engine = new Engine(ctx.rawPublicodesRules, {
      logger: getDiagnosticsLogger(ctx),
    });
    ctx.connection.console.log(
      `[validate] Engine created in ${Date.now() - startTimer}ms.`,
    );
    ctx.parsedRules = ctx.engine.getParsedRules();

    startTimer = Date.now();
    // Evaluates all the rules to get unit warning
    // PERF: this took ~1500ms for 2009 rules, this needs to be optimized
    Object.keys(ctx.parsedRules).forEach((rule) => {
      ctx.engine.evaluate(rule);
    });
    ctx.connection.console.log(
      `[validate] Rules evaluated in ${Date.now() - startTimer}ms (${Object.keys(ctx.parsedRules).length} rules).`,
    );

    // Remove previous diagnostics
    ctx.diagnosticsURI.forEach((uri) => {
      ctx.connection.sendDiagnostics({ uri, diagnostics: [] });
      ctx.diagnosticsURI = new Set();
    });
  } catch (e: any) {
    if (e instanceof Error) {
      const { filePath, diagnostic } = getDiagnosticFromErrorMsg(
        ctx,
        e.message,
      );
      mapAppend(ctx.diagnostics, filePath, diagnostic);
    }
  }

  ctx.connection.console.log(
    `[validate] Found ${ctx.diagnostics.size} diagnostics.`,
  );
  sendDiagnostics(ctx);
}

/**
 * Send the diagnostics to the client and store the URIs of the files with
 * diagnostics to remove the previous diagnostics when the diagnostics are
 * updated.
 */
function sendDiagnostics(ctx: LSContext) {
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
  if (!wrongRule) {
    return {
      filePath: undefined,
      diagnostic: {
        severity,
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 0 },
        },
        message: message,
      },
    };
  }
  const filePath = ctx.ruleToFileNameMap.get(wrongRule);
  if (!filePath) {
    return {
      filePath: undefined,
      diagnostic: {
        severity,
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 0 },
        },
        message: message,
      },
    };
  }

  if (message.includes(`✖️  La référence "`)) {
    const refName = message.match(
      /✖️  La référence "(.*)" est introuvable/,
    )?.[1];

    if (refName) {
      const refNode = getRefInRule(ctx, filePath, wrongRule, refName!);

      if (refNode) {
        return {
          filePath,
          diagnostic: {
            severity,
            range: positionToRange({
              start: refNode.startPosition,
              end: refNode.endPosition,
            }),
            message: `La référence "${refName}" est introuvable.

[ Solution ]
- Vérifiez que la référence "${refName}" est bien écrite.`,
          },
        };
      }
    }
  }

  const pos = ctx.fileInfos
    .get(filePath)
    ?.ruleDefs.find(({ dottedName }) => dottedName === wrongRule)?.namesPos ?? {
    start: { row: 0, column: 0 },
    end: { row: 0, column: 0 },
  };

  return {
    filePath,
    diagnostic: {
      severity,
      range: positionToRange(pos),
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
