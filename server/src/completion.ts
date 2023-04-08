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

export function completionHandler(ctx: LSContext) {
  return (
    _textDocumentPosition: TextDocumentPositionParams
  ): CompletionItem[] => {
    ctx.connection.console.log(`Completion requested`);
    const items = Object.entries(ctx.parsedRules).map(([dottedName, rule]) => {
      const { titre, description } = (rule as RuleNode).rawNode;
      const labelDetails = {
        detail: " [règle]",
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
    return [...mechanismsCompletionItems, ...keywordsCompletionItems, ...items];
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

const keywords: CompletionItem[] = [
  {
    label: "description",
    documentation: "Description de la règle",
  },
];

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
