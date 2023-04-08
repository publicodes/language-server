import {
  CompletionItem,
  CompletionItemKind,
  MarkupContent,
  MarkupKind,
  TextDocumentPositionParams,
} from "vscode-languageserver/node";
import { LSContext } from "./context";
import { RuleNode } from "publicodes";
import { mechanisms } from "./completion-items/mechanisms";
import { keywords } from "./completion-items/keywords";

export function completionHandler(ctx: LSContext) {
  return (
    _textDocumentPosition: TextDocumentPositionParams
  ): CompletionItem[] => {
    return [
      ...mechanismsCompletionItems,
      ...keywordsCompletionItems,
      ...getRuleCompletionItems(ctx),
    ];
  };
}

export function completionResolveHandler(ctx: LSContext) {
  return (item: CompletionItem): CompletionItem => {
    ctx.connection.console.log(`Completion ${item.labelDetails?.detail}`);
    if (!item.data) {
      return item;
    }
    return {
      ...item,
      labelDetails: item.data.labelDetails,
      documentation: {
        kind: MarkupKind.Markdown,
        value: item.documentation,
      } as MarkupContent,
      insertText: item.data.insertText,
    };
  };
}

const getRuleCompletionItems = (ctx: LSContext): CompletionItem[] => {
  return Object.entries(ctx.parsedRules).map(([dottedName, rule]) => {
    const { titre, description, icônes } = (rule as RuleNode).rawNode;
    const labelDetails = {
      detail: (icônes != undefined ? ` ${icônes}` : "") + " [règle]",
      description: titre,
    };
    return {
      label: dottedName,
      kind: CompletionItemKind.Function,
      documentation: description,
      labelDetails,
      data: {
        labelDetails,
      },
    };
  });
};

const mechanismsCompletionItems: CompletionItem[] = mechanisms.map((item) => {
  const labelDetails = {
    detail: " [mécanisme]",
  };
  return {
    ...item,
    kind: CompletionItemKind.Property,
    labelDetails,
    data: {
      labelDetails,
      insertText: `${item.label}:`,
    },
  };
});

const keywordsCompletionItems: CompletionItem[] = keywords.map((item) => {
  const labelDetails = {
    detail: " [mot-clé]",
  };
  return {
    ...item,
    kind: CompletionItemKind.Keyword,
    labelDetails,
    data: {
      labelDetails,
      insertText: `${item.label}:`,
    },
  };
});
