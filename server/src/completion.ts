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
import { fileURLToPath } from "node:url";

export function completionHandler(ctx: LSContext) {
  return (
    textDocumentPosition: TextDocumentPositionParams
  ): CompletionItem[] => {
    const { textDocument } = textDocumentPosition;
    const currFileName = fileURLToPath(textDocument.uri)
      .split("/")
      .pop()
      ?.slice(0, ".publi.yaml".length * -1);

    ctx.connection.console.log(
      `Completion request received: URI: ${currFileName}`
    );
    return [
      ...getRuleCompletionItems(ctx, currFileName),
      ...mechanismsCompletionItems,
      ...keywordsCompletionItems,
    ];
  };
}

export function completionResolveHandler(_ctx: LSContext) {
  return (item: CompletionItem): CompletionItem => {
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

const getRuleCompletionItems = (
  ctx: LSContext,
  currFileName?: string
): CompletionItem[] => {
  return Object.entries(ctx.parsedRules).map(([dottedName, rule]) => {
    const { titre, description, icônes } = (rule as RuleNode).rawNode;
    const labelDetails = {
      detail: (icônes != undefined ? ` ${icônes}` : "") + " [règle]",
      description: titre,
    };

    const insertText =
      currFileName && dottedName.startsWith(currFileName)
        ? // Remove the current file name from the insert text
          dottedName.slice(currFileName.length + " . ".length)
        : dottedName;
    return {
      label: dottedName,
      kind: CompletionItemKind.Function,
      documentation: description,
      labelDetails,
      data: {
        labelDetails,
        insertText,
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
