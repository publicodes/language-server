import {
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
} from "vscode-languageserver/node";
import { LSContext } from "./context";
import { RuleNode } from "publicodes";

export function completionHandler(ctx: LSContext) {
  return (
    _textDocumentPosition: TextDocumentPositionParams
  ): CompletionItem[] => {
    return Object.entries(ctx.parsedRules).map(([dottedName, rule]) => {
      const { titre, description } = (rule as RuleNode).rawNode;
      return {
        label: dottedName,
        kind: CompletionItemKind.Function,
        data: rule,
        labelDetails: {
          detail: " (règle)",
          description: titre,
        },
        documentation: description,
      };
    });
  };
}

export function completionResolveHandler(_ctx: LSContext) {
  return (item: CompletionItem): CompletionItem => {
    const { titre, description } = item.data.rawNode;
    return {
      ...item,
      labelDetails: {
        detail: " (règle)",
        description: titre,
      },
      documentation: description,
    };
  };
}
