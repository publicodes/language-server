import {
  CompletionItem,
  CompletionItemKind,
  MarkupContent,
  MarkupKind,
  TextDocumentPositionParams,
} from "vscode-languageserver/node.js";
import { DottedName, LSContext } from "./context";
import { RuleNode } from "publicodes";
import { mechanisms } from "./completion-items/mechanisms";
import { keywords } from "./completion-items/keywords";
import { fileURLToPath } from "node:url";
import { getRuleNameAt, getTSTree } from "./treeSitter";

// We don't want to suggest completion items in these nodes
const nodesToIgnore = ["text_line", "paragraph", "meta_value"];

export function completionHandler(ctx: LSContext) {
  return (
    textDocumentPosition: TextDocumentPositionParams,
  ): CompletionItem[] | undefined => {
    const { textDocument, position } = textDocumentPosition;
    const filePath = fileURLToPath(textDocument.uri);
    const fullRefName = getRuleNameAt(ctx, filePath, position.line);

    // PERF: we need to get the most up-to-date version of the tree. This is
    // done multiple times in the code (here, in semanticTokens.ts). As it's
    // almost instantaneous, we can afford it. Howerver, we should consider
    // having a single source of truth for the tree (even though it's can
    // force to manage async operations with the cost it implies).
    const fileContent = ctx.documents.get(textDocument.uri)?.getText()!;
    const tsTree = getTSTree(fileContent);

    const nodeAtCursorPosition = tsTree?.rootNode.descendantForPosition({
      row: position.line,
      // We need to be sure to be in the current node, even if the cursor is
      // at the end of the line.
      column: position.character - 1,
    });

    return !nodesToIgnore.includes(nodeAtCursorPosition?.type)
      ? [
          ...getRuleCompletionItems(ctx, fullRefName),
          ...mechanismsCompletionItems,
          ...keywordsCompletionItems,
        ]
      : [];
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
        value: item.data.description?.trimStart()?.trimEnd(),
      } as MarkupContent,
    };
  };
}

const getRuleCompletionItems = (
  ctx: LSContext,
  currRuleName: DottedName | undefined,
): CompletionItem[] => {
  return Object.entries(ctx.parsedRules).map(([dottedName, rule]) => {
    const { titre, description, icônes } = (rule as RuleNode).rawNode;
    const labelDetails = {
      detail: icônes != undefined ? ` ${icônes}` : "",
      description: titre,
    };
    // Remove the current rule name from the inserted text
    const insertText =
      currRuleName && dottedName.startsWith(currRuleName)
        ? dottedName.slice(currRuleName.length + " . ".length)
        : dottedName;

    return {
      label: dottedName,
      kind: CompletionItemKind.Function,
      labelDetails,
      insertText,
      data: {
        description,
      },
    };
  });
};

const mechanismsCompletionItems: CompletionItem[] = mechanisms.map((item) => {
  return {
    ...item,
    kind: CompletionItemKind.Property,
    insertText: `${item.label}:`,
    data: {
      description: item.documentation,
    },
  };
});

const keywordsCompletionItems: CompletionItem[] = keywords.map((item) => {
  return {
    ...item,
    kind: CompletionItemKind.Keyword,
    insertText: `${item.label}:`,
    data: {
      description: item.documentation,
    },
  };
});
