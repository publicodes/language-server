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
import { DottedName, LSContext } from "./context";

export const PublicodesCommands = { CREATE_RULE: "publicodes.createRule" };

export type CreateRuleParams = {
  uri: string;
  range: Range;
  ruleName: DottedName;
  ruleNameToCreate: string;
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

    return [];
  });
}

export function createRule(
  ctx: LSContext,
  { uri, ruleName, ruleNameToCreate }: CreateRuleParams,
) {
  // find the line number after the rule def of ruleName
  const fileName = ctx.ruleToFileNameMap.get(ruleName);
  if (!fileName) {
    ctx.connection.console.error(`[createRule] file not found: ${ruleName}`);
    return;
  }

  const ruleDefPos = ctx.fileInfos
    .get(fileName)
    ?.ruleDefs.find((rule) => rule.dottedName === ruleName)?.defPos;
  if (!ruleDefPos) {
    ctx.connection.console.error(
      `[createRule] rule def not found: ${ruleName}`,
    );
    return;
  }
  const editPos = Position.create(ruleDefPos.end.row, 0);

  ctx.connection.workspace.applyEdit({
    label: `Create a new rule: ${ruleNameToCreate}`,
    changes: {
      [uri]: [TextEdit.insert(editPos, `${ruleNameToCreate}:\n\n`)],
    },
  });
}
