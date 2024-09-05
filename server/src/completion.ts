import {
  CompletionItem,
  CompletionItemKind,
  CompletionParams,
  CompletionTriggerKind,
  MarkupContent,
  MarkupKind,
  ServerRequestHandler,
} from "vscode-languageserver/node.js";
import { DottedName, LSContext } from "./context";
import { RuleNode } from "publicodes";
import { mechanisms } from "./completion-items/mechanisms";
import { keywords } from "./completion-items/keywords";
import { fileURLToPath } from "node:url";
import { getRuleNameAt, getTSTree } from "./treeSitter";
import TSParser, { SyntaxNode } from "tree-sitter";

// We don't want to suggest completion items in these nodes
const nodesToIgnore = ["text_line", "paragraph", "meta_value"];

// We want to suggest reference completion items in these nodes
const nodesExpectReferenceCompletion = ["dotted_name", "mechanism"];

const keywordsAndMechanismsCompletionItems = [...mechanisms, ...keywords];

export function completionHandler(
  ctx: LSContext,
): ServerRequestHandler<
  CompletionParams,
  CompletionItem[] | undefined,
  CompletionItem[] | undefined,
  void
> {
  return (params: CompletionParams): CompletionItem[] | undefined => {
    const filePath = fileURLToPath(params.textDocument.uri);
    const fullRefName = getRuleNameAt(ctx, filePath, params.position.line);

    // PERF: we need to get the most up-to-date version of the tree. This is
    // done multiple times in the code (here, in semanticTokens.ts). As it's
    // almost instantaneous, we can afford it. Howerver, we should consider
    // having a single source of truth for the tree (even though it's can
    // force to manage async operations with the cost it implies).
    const document = ctx.documents.get(params.textDocument.uri);
    if (!document) {
      return [];
    }

    const fileContent = document.getText();
    const tsTree = getTSTree(fileContent);

    const nodeAtCursorPosition = tsTree?.rootNode.descendantForPosition({
      row: params.position.line,
      // We need to be sure to be in the current node, even if the cursor is
      // at the end of the line.
      column: params.position.character - 1,
    });
    if (nodesToIgnore.includes(nodeAtCursorPosition?.type)) {
      return [];
    }

    let refNodeAtCursorPosition: SyntaxNode | null | undefined =
      tsTree?.rootNode.descendantsOfType(
        "reference",
        { row: params.position.line, column: params.position.character - 2 },
        {
          row: params.position.line,
          column: params.position.character,
        },
      )[0];

    let triggeredFromDot = params.context?.triggerCharacter === ".";

    if (!refNodeAtCursorPosition && triggeredFromDot) {
      refNodeAtCursorPosition = nodeAtCursorPosition?.parent;
    }

    if (!refNodeAtCursorPosition) {
      return keywordsAndMechanismsCompletionItems;
    }

    if (refNodeAtCursorPosition.type === "ERROR") {
      refNodeAtCursorPosition = tsTree?.rootNode?.descendantsOfType(
        "reference",
        {
          row: refNodeAtCursorPosition.startPosition.row,
          column: refNodeAtCursorPosition.startPosition.column - 1,
        },
      )[0];
    }

    if (!refNodeAtCursorPosition) {
      return keywordsAndMechanismsCompletionItems;
    }

    const completionItems = getRuleCompletionItems(
      ctx,
      refNodeAtCursorPosition,
      params.context?.triggerKind ?? CompletionTriggerKind.Invoked,
      fullRefName,
    );

    // TODO: add conditions to show only the relevant completion items
    return triggeredFromDot
      ? completionItems
      : // TODO: is it a performance issue to concat the arrays this way?
        [...completionItems, ...keywordsAndMechanismsCompletionItems];
  };
}

export function completionResolveHandler(_ctx: LSContext) {
  return (item: CompletionItem): CompletionItem => {
    if (!item.data) {
      return item;
    }
    return {
      ...item,
      documentation: {
        kind: MarkupKind.Markdown,
        value: item.data.documentationValue?.trim(),
      } as MarkupContent,
    };
  };
}

/**
 * Get the list of completion items corresponding to the rules.
 *
 * @param ctx The language server context
 * @param currRuleName The current rule name used to simplify the inserted text
 * @param currentRefNode The current node currenlty in completion which allows to filter only corresponding childs rules
 */
const getRuleCompletionItems = (
  ctx: LSContext,
  currentRefNode: TSParser.SyntaxNode,
  triggerKind: CompletionTriggerKind,
  currRuleName: DottedName | undefined,
): CompletionItem[] => {
  let foundError = false;
  const refNames =
    // Collects all <name> node in the current reference node to filter the
    // completion items according to them.
    currentRefNode.firstNamedChild?.children.reduce(
      (names: string[], child) => {
        if (child.type === "ERROR") {
          /**
           * Completion triggered in the middle of an expression, e.g:
           *
           *    valeur: voiture . prix d'achat . [ERROR] - valeur résiduelle
           *                                   ^
           *                                   | completion triggered here.
           *
           * Without stopping the collect of names, we will have the following
           * names: ["voiture", "prix d'achat", "valeur résiduelle"] We need to
           * stop the collect of names when we encounter an error node.
           */
          foundError = true;
          return names;
        }
        if (!foundError && child.type === "name") {
          names.push(child.text.trim());
        }
        return names;
      },
      [],
    ) ?? [];

  const splittedCurrRuleName = currRuleName?.split(" . ") ?? [];

  // Remove the last name as it's the rule in completion
  if (triggerKind === CompletionTriggerKind.Invoked) {
    refNames.pop();
  }

  // TODO: exract into external funcions?
  const isCompletionStarting = refNames.length === 0;

  const isRootNamespace = (splittedDottedName: string[]) => {
    return refNames.length === 0 && splittedDottedName.length === 1;
  };

  const isDirectChildOf = (
    splittedDottedName: string[],
    splittedTarget: string[],
  ) => {
    return (
      splittedDottedName.length === splittedTarget.length + 1 &&
      splittedDottedName.slice(0, splittedTarget.length).join(" . ") ===
        splittedTarget.join(" . ")
    );
  };

  const isDirectChildrenOfCurrentRef = (splittedDottedName: string[]) => {
    return isDirectChildOf(splittedDottedName, refNames);
  };

  // Relative reference simplification
  const isAccessibleFromTheCurrentRule = (splittedDottedName: string[]) => {
    let hasCommonNamespace = true;

    if (splittedDottedName.length > splittedCurrRuleName.length + 1) {
      return false;
    }

    for (let i = 0; i < splittedDottedName.length - 1; i++) {
      if (splittedDottedName[i] !== splittedCurrRuleName[i]) {
        hasCommonNamespace = false;
        break;
      }
    }

    return hasCommonNamespace;
  };

  return Object.entries(ctx.parsedRules)
    .filter(([dottedName, _]) => {
      const splittedDottedName = dottedName.split(" . ");

      return (
        dottedName !== currRuleName &&
        ((isCompletionStarting &&
          (isRootNamespace(splittedDottedName) ||
            isAccessibleFromTheCurrentRule(splittedDottedName))) ||
          isDirectChildrenOfCurrentRef(splittedDottedName))
      );
    })
    .map(([dottedName, rule]) => {
      const { titre, description, icônes } = (rule as RuleNode).rawNode;
      const splittedDottedName = dottedName.split(" . ");
      const ruleName =
        splittedDottedName[splittedDottedName.length - 1] ?? dottedName;
      const labelDetails = {
        detail: icônes != undefined ? ` ${icônes}` : "",
        description:
          splittedDottedName.length > 1
            ? `${splittedDottedName.join(" . ")}`
            : "",
      };

      return {
        label: ruleName,
        kind: isAccessibleFromTheCurrentRule(splittedDottedName)
          ? CompletionItemKind.Method
          : CompletionItemKind.Function,
        labelDetails,
        insertText:
          triggerKind === CompletionTriggerKind.TriggerCharacter
            ? " " + ruleName
            : ruleName,
        data: {
          documentationValue: `**${titre ?? dottedName}**\n\n${description?.trim() ?? ""}`,
        },
      };
    });
};

export const mechanismsCompletionItems: CompletionItem[] = mechanisms.map(
  (item) => {
    return {
      ...item,
      kind: CompletionItemKind.Property,
      insertText: `${item.label}:`,
      data: {
        description: item.documentation,
      },
    };
  },
);

export const keywordsCompletionItems: CompletionItem[] = keywords.map(
  (item) => {
    return {
      ...item,
      kind: CompletionItemKind.Keyword,
      insertText: `${item.label}:`,
      data: {
        description: item.documentation,
      },
    };
  },
);
