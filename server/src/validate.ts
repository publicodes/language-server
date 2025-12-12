import { TextDocument } from "vscode-languageserver-textdocument";
import {
  FilePath,
  LSContext,
  ensureModelForFile,
  getRuleDef,
  getRuleFilePath,
} from "./context";
import Engine from "publicodes";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/node.js";
import { parseDocument } from "./parseRules";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Logger } from "publicodes";
import { mapAppend, positionToRange } from "./helpers";
import { getRefInRule } from "./treeSitter";

export const PublicodesDiagnosticCode = {
  UNKNOWN_REF: "unknown_reference",
  UNKNOWN_PARENT: "unknown_parent",
};

export default async function validate(
  ctx: LSContext,
  document?: TextDocument,
): Promise<void> {
  ctx.diagnostics = new Map();
  const startTimer = Date.now();

  if (document) {
    const docFilePath = fileURLToPath(document.uri);

    parseDocument(ctx, docFilePath, document);
  }

  ctx.fileInfos.forEach((_fileInfo, filePath) => {
    ensureModelForFile(ctx, filePath);
  });

  ctx.models.forEach((model) => {
    model.rawPublicodesRules = {};
    model.parsedRules = {};
    model.ruleToFileNameMap.clear();
  });

  ctx.fileInfos.forEach((fileInfo, filePath) => {
    const model = ensureModelForFile(ctx, filePath);
    fileInfo.ruleDefs.forEach(({ dottedName }) => {
      model.ruleToFileNameMap.set(dottedName, filePath);
    });
    model.rawPublicodesRules = {
      ...model.rawPublicodesRules,
      ...fileInfo.rawRules,
    };
  });

  ctx.diagnosticsURI.forEach((uri) => {
    ctx.connection.sendDiagnostics({ uri, diagnostics: [] });
  });
  ctx.diagnosticsURI = new Set();

  ctx.models.forEach((model) => {
    const engineStart = Date.now();
    try {
      model.engine = new Engine(model.rawPublicodesRules, {
        logger: getDiagnosticsLogger(ctx, model.root),
      });
      ctx.connection.console.log(
        `[validate] Engine created for ${model.root} in ${Date.now() - engineStart}ms.`,
      );

      model.parsedRules = model.engine.getParsedRules();

      const evalStart = Date.now();
      Object.keys(model.parsedRules).forEach((rule) => {
        model.engine.evaluate(rule);
      });
      ctx.connection.console.log(
        `[validate] Rules evaluated for ${model.root} in ${Date.now() - evalStart}ms (${Object.keys(model.parsedRules).length} rules).`,
      );
    } catch (e: any) {
      if (e instanceof Error) {
        const { filePath, diagnostic } = getDiagnosticFromErrorMsg(
          ctx,
          model.root,
          e.message,
        );
        mapAppend(ctx.diagnostics, filePath, diagnostic);
      }
    }
  });

  ctx.connection.console.log(
    `[validate] Found ${ctx.diagnostics.size} diagnostics in ${Date.now() - startTimer}ms.`,
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

function getDiagnosticsLogger(ctx: LSContext, modelRoot: FilePath): Logger {
  return {
    log(msg: string) {
      ctx.connection.console.log(`[publicodes:log] ${msg}`);
    },
    warn(msg: string) {
      const { filePath, diagnostic } = getDiagnosticFromErrorMsg(
        ctx,
        modelRoot,
        msg,
        DiagnosticSeverity.Warning,
      );
      mapAppend(ctx.diagnostics, filePath, diagnostic);
    },
    error(msg: string) {
      const { filePath, diagnostic } = getDiagnosticFromErrorMsg(
        ctx,
        modelRoot,
        msg,
      );
      mapAppend(ctx.diagnostics, filePath, diagnostic);
    },
  };
}

function getDiagnosticFromErrorMsg(
  ctx: LSContext,
  modelRoot: FilePath,
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

  const model = ctx.models.get(modelRoot);
  const filePath =
    model?.ruleToFileNameMap.get(wrongRule) ??
    getRuleFilePath(ctx, wrongRule);

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

  if (message.includes(`ƒo-‹÷?  La rÇ¸fÇ¸rence "`)) {
    const refName = message.match(
      /ƒo-‹÷?  La rÇ¸fÇ¸rence "(.*)" est introuvable/,
    )?.[1];

    if (refName) {
      const refNode = getRefInRule(ctx, filePath, wrongRule, refName!);

      if (refNode) {
        return {
          filePath,
          diagnostic: {
            severity,
            range: positionToRange({
              // FIXME: when the refNode is the first ref, the leading spaces
              // are included in the start position.
              start: refNode.startPosition,
              end: refNode.endPosition,
            }),
            message: `La rÇ¸fÇ¸rence "${refName}" est introuvable.

[ Solution ]
- VÇ¸rifiez que la rÇ¸fÇ¸rence "${refName}" est bien Ç¸crite.`,
            code: PublicodesDiagnosticCode.UNKNOWN_REF,
            data: {
              ruleName: wrongRule,
              refName,
            },
          },
        };
      }
    }
  }

  if (message.includes(`ƒo-‹÷?  La rÇùgle parente "`)) {
    const parentRule = message.match(
      /ƒo-‹÷?  La rÇùgle parente "(.*)" n'existe pas/,
    )?.[1];

    if (parentRule) {
      const ruleDef = getRuleDef(ctx, wrongRule, filePath);

      if (ruleDef) {
        return {
          filePath,
          diagnostic: {
            severity,
            range: positionToRange(ruleDef.namesPos),
            message: `La rÇùgle parente "${parentRule}" est introuvable.

[ Solution ]
- VÇ¸rifiez que la rÇùgle parente "${parentRule}" est bien Ç¸crite.`,
            code: PublicodesDiagnosticCode.UNKNOWN_PARENT,
            data: {
              ruleName: wrongRule,
              parentRule,
            },
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
  const match = msg.match(/ƒz­‹÷?  Dans la rÇùgle "([^\n\r]*)"/);
  if (match == null) {
    return undefined;
  }
  return match[1];
}
