import {
  CodeAction,
  CodeActionKind,
  CodeActionParams,
  Command,
  Position,
  Range,
  TextEdit,
} from "vscode-languageserver";
import { PublicodesDiagnosticCode } from "./validate";
import { DottedName, getRuleDef, LSContext } from "./context";
import { fileURLToPath } from "node:url";

export const PublicodesCommands = { CREATE_RULE: "publicodes.createRule" };

export type CreateRuleParams = {
  uri: string;
  range: Range;
  ruleName: DottedName;
  ruleNameToCreate: string;
  position?: "before" | "after";
};

export function codeActionHandler(
  _ctx: LSContext,
  params: CodeActionParams,
): (Command | CodeAction)[] | undefined {
  return params.context.diagnostics.flatMap((diagnostic) => {
    if (
      diagnostic.code === PublicodesDiagnosticCode.UNKNOWN_REF &&
      diagnostic.data
    ) {
      const shortRefName = diagnostic.data.refName;
      const fullRefName = diagnostic.data.ruleName + " . " + shortRefName;

      return [
        CodeAction.create(
          `Create a new rule: '${shortRefName}'`,
          Command.create(
            `Create a new rule: '${shortRefName}'`,
            PublicodesCommands.CREATE_RULE,
            {
              uri: params.textDocument.uri,
              range: diagnostic.range,
              ruleName: diagnostic.data.ruleName,
              ruleNameToCreate: shortRefName,
              position: diagnostic.data.position,
            } as CreateRuleParams,
          ),
          CodeActionKind.QuickFix,
        ),
        CodeAction.create(
          `Create a new rule: '${fullRefName}'`,
          Command.create(
            `Create a new rule: '${fullRefName}'`,
            PublicodesCommands.CREATE_RULE,
            {
              uri: params.textDocument.uri,
              range: diagnostic.range,
              ruleName: diagnostic.data.ruleName,
              ruleNameToCreate: fullRefName,
            } as CreateRuleParams,
          ),
          CodeActionKind.QuickFix,
        ),
      ];
    }

    if (
      diagnostic.code === PublicodesDiagnosticCode.UNKNOWN_PARENT &&
      diagnostic.data
    ) {
      return [
        CodeAction.create(
          `Create the missing rule: '${diagnostic.data.parentRule}'`,
          Command.create(
            `Create the missing rule: '${diagnostic.data.parentRule}'`,
            PublicodesCommands.CREATE_RULE,
            {
              uri: params.textDocument.uri,
              range: diagnostic.range,
              ruleName: diagnostic.data.ruleName,
              ruleNameToCreate: diagnostic.data.parentRule,
              position: "before",
            } as CreateRuleParams,
          ),
          CodeActionKind.QuickFix,
        ),
      ];
    }

    return [];
  });
}

export function createRule(
  ctx: LSContext,
  { uri, ruleName, ruleNameToCreate, position }: CreateRuleParams,
) {
  const ruleDefPos = getRuleDef(ctx, ruleName)?.defPos;

  if (!ruleDefPos) {
    ctx.connection.console.error(
      `[createRule] rule def not found in ${uri}: ${ruleName}`,
    );
    return;
  }
  const editPos =
    position === "before"
      ? Position.create(ruleDefPos.start.row, 0)
      : Position.create(ruleDefPos.end.row, 0);

  ctx.connection.workspace.applyEdit({
    label: `Create a new rule: ${ruleNameToCreate}`,
    changes: {
      [uri]: [TextEdit.insert(editPos, `${ruleNameToCreate}:\n\n`)],
    },
  });
}
