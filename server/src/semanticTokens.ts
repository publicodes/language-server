import {
  SemanticTokenModifiers,
  SemanticTokenTypes,
  SemanticTokens,
  SemanticTokensBuilder,
  SemanticTokensParams,
} from "vscode-languageserver";
import { LSContext } from "./context";
import TSParser from "tree-sitter";
import { getTSTree } from "./treeSitter";
import { fileURLToPath } from "node:url";

export function semanticTokensFullProvider(ctx: LSContext) {
  return ({ textDocument }: SemanticTokensParams): SemanticTokens => {
    const document = ctx.documents.get(textDocument.uri);
    const builder = new SemanticTokensBuilder();
    const fileInfos = ctx.fileInfos.get(fileURLToPath(textDocument.uri));

    if (document) {
      const fileContent = document.getText();
      const currentTree = getTSTree(fileContent, fileInfos, document);
      collectTokens(ctx, builder, currentTree.rootNode);
    }

    return builder.build();
  };
}

const operators = ["+", "-", "*", "/", "%", ">", "<", ">=", "<=", "==", "!="];

function collectTokens(
  ctx: LSContext,
  builder: SemanticTokensBuilder,
  node: TSParser.SyntaxNode,
) {
  node.children.forEach((node) => {
    switch (node.type) {
      case "rule": {
        let ruleNameNode = node.firstNamedChild;
        while (ruleNameNode && ruleNameNode.type === "name") {
          const tokenType = ruleNameNode.nextNamedSibling
            ? ruleNameNode.nextNamedSibling.type !== "name"
              ? SemanticTokenTypes.variable
              : SemanticTokenTypes.namespace
            : SemanticTokenTypes.namespace;

          pushToken(
            builder,
            ruleNameNode.startPosition.row,
            ruleNameNode.startPosition.column,
            ruleNameNode.endPosition.column - ruleNameNode.startPosition.column,
            tokenType,
            [SemanticTokenModifiers.definition],
          );
          ruleNameNode = ruleNameNode.nextNamedSibling;
        }
        break;
      }

      case "key": {
        pushToken(
          builder,
          node.startPosition.row,
          node.startPosition.column,
          node.endPosition.column - node.startPosition.column,
          SemanticTokenTypes.decorator,
          [SemanticTokenModifiers.documentation],
        );
        break;
      }

      case "units": {
        pushToken(
          builder,
          node.startPosition.row,
          node.startPosition.column,
          node.endPosition.column - node.startPosition.column,
          SemanticTokenTypes.type,
        );
        break;
      }

      case "m_contexte":
      case "m_inversion":
      case "m_array":
      case "m_unary": {
        if (!node.firstChild) {
          break;
        }

        const { startPosition, endPosition } = node.firstChild;

        pushToken(
          builder,
          startPosition.row,
          startPosition.column,
          endPosition.column - startPosition.column,
          SemanticTokenTypes.keyword,
        );

        if (node.type === "m_unary" && node.firstChild.type === "unité") {
          // node.children: ["unité", ":", ...]
          for (let i = 2; i < node.childCount; i++) {
            const unitNode = node.child(i)!;

            pushToken(
              builder,
              unitNode.startPosition.row,
              unitNode.startPosition.column,
              unitNode.endPosition.column - unitNode.startPosition.column,
              SemanticTokenTypes.type,
            );
          }
          break;
        }
        break;
      }

      case "formule": {
        if (node.type === "formule" && node.text === "formule") {
          // NOTE: currently, there is multiple formule nodes, where the first one is "formule:"
          pushToken(
            builder,
            node.startPosition.row,
            node.startPosition.column,
            node.endPosition.column - node.startPosition.column,
            SemanticTokenTypes.keyword,
          );
          break;
        }
      }

      case "number": {
        const endPosition =
          // TODO: could be factorized?
          node.firstNamedChild?.type === "units"
            ? node.firstNamedChild.startPosition.column
            : node.endPosition.column;

        pushToken(
          builder,
          node.startPosition.row,
          node.startPosition.column,
          endPosition - node.startPosition.column,
          SemanticTokenTypes.number,
        );
        break;
      }

      case "reference": {
        // TODO: to factorize
        let ruleNameNode = node.firstNamedChild;
        while (ruleNameNode && ruleNameNode.type === "name") {
          const tokenType = ruleNameNode.nextNamedSibling
            ? SemanticTokenTypes.namespace
            : SemanticTokenTypes.variable;

          pushToken(
            builder,
            ruleNameNode.startPosition.row,
            ruleNameNode.startPosition.column,
            ruleNameNode.endPosition.column - ruleNameNode.startPosition.column,
            tokenType,
          );
          ruleNameNode = ruleNameNode.nextNamedSibling;
        }
        break;
      }

      case "boolean": {
        pushToken(
          builder,
          node.startPosition.row,
          node.startPosition.column,
          node.endPosition.column - node.startPosition.column,
          SemanticTokenTypes.enumMember,
        );
        break;
      }

      case "somme": {
        pushToken(
          builder,
          node.startPosition.row,
          node.startPosition.column,
          node.endPosition.column - node.startPosition.column,
          SemanticTokenTypes.macro,
        );
        break;
      }

      default: {
        if (operators.includes(node.type.trim())) {
          pushToken(
            builder,
            node.startPosition.row,
            node.startPosition.column,
            node.endPosition.column - node.startPosition.column,
            SemanticTokenTypes.operator,
          );
        }
      }
    }

    collectTokens(ctx, builder, node);
  });
}

export const tokenTypes = [
  SemanticTokenTypes.operator,
  SemanticTokenTypes.struct,
  SemanticTokenTypes.class,
  SemanticTokenTypes.enumMember,
  SemanticTokenTypes.function,
  SemanticTokenTypes.macro,
  SemanticTokenTypes.namespace,
  SemanticTokenTypes.number,
  SemanticTokenTypes.string,
  SemanticTokenTypes.variable,
  SemanticTokenTypes.comment,
  SemanticTokenTypes.property,
  SemanticTokenTypes.type,
  SemanticTokenTypes.decorator,
  SemanticTokenTypes.keyword,
];

export const tokenModifiers = [
  SemanticTokenModifiers.readonly,
  SemanticTokenModifiers.documentation,
  SemanticTokenModifiers.definition,
  SemanticTokenModifiers.declaration,
  SemanticTokenModifiers.static,
];

function pushToken(
  builder: SemanticTokensBuilder,
  line: number,
  startCharacter: number,
  length: number,
  tokenType: SemanticTokenTypes,
  tokenModifiers: SemanticTokenModifiers[] = [],
) {
  builder.push(
    line,
    startCharacter,
    length,
    encodeTokenType(tokenType),
    encodeTokenModifiers(tokenModifiers),
  );
}

function encodeTokenType(tokenType: SemanticTokenTypes): number {
  const typeIndex = tokenTypes.indexOf(tokenType);

  return typeIndex === -1 ? 0 : typeIndex;
}

function encodeTokenModifiers(
  strTokenModifiers: SemanticTokenModifiers[],
): number {
  let result = 0;
  for (let i = 0; i < strTokenModifiers.length; i++) {
    const tokenModifierIndex = tokenModifiers.indexOf(strTokenModifiers[i]);
    if (tokenModifierIndex !== -1) {
      result = result | (1 << tokenModifierIndex!);
    }
  }
  return result;
}
