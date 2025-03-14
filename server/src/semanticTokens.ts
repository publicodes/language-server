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

export function semanticTokensFullProvider(ctx: LSContext) {
  return ({ textDocument }: SemanticTokensParams): SemanticTokens => {
    const document = ctx.documents.get(textDocument.uri);
    const builder = new SemanticTokensBuilder();

    if (document) {
      const fileContent = document.getText();
      const currentTree = getTSTree(fileContent);
      collectTokens(ctx, builder, currentTree.rootNode);
    }

    return builder.build();
  };
}

const punctuations = [
  '"',
  "'",
  ".",
  ":",
  "(",
  ")",
  "+",
  "-",
  "*",
  "/",
  "%",
  ">",
  "<",
  "=",
  ">=",
  "<=",
  "==",
  "!=",
];

function collectTokens(
  ctx: LSContext,
  builder: SemanticTokensBuilder,
  node: TSParser.SyntaxNode,
) {
  node.children.forEach((node) => {
    switch (node.type) {
      case "rule": {
        const dottedName = node.childForFieldName("rule_name");
        if (!dottedName) {
          break;
        }

        const isNamespace =
          node.childForFieldName("rule_body")?.childCount === 0;
        const ruleLength = dottedName.childCount;

        dottedName.children.forEach((name, index) => {
          const tokenType =
            name.type === "name"
              ? isNamespace
                ? SemanticTokenTypes.namespace
                : index === ruleLength - 1
                  ? SemanticTokenTypes.function
                  : SemanticTokenTypes.namespace
              : SemanticTokenTypes.operator;

          pushToken(
            builder,
            name.startPosition.row,
            name.startPosition.column,
            name.endPosition.column - name.startPosition.column,
            tokenType,
            [SemanticTokenModifiers.definition],
          );
        });

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
          [SemanticTokenModifiers.readonly],
        );
        break;
      }

      case "s_formule":
      case "s_avec":
      case "s_remplace":
      case "m_une_possibilité":
      case "m_contexte":
      case "m_inversion":
      case "m_variations":
      case "m_array":
      case "m_unary":
      case "m_unité":
      case "m_durée":
      case "m_barème_like":
      case "m_texte": {
        if (!node.firstChild) {
          break;
        }

        const { startPosition, endPosition } =
          node.childForFieldName("m_name")!;

        pushToken(
          builder,
          startPosition.row,
          startPosition.column,
          endPosition.column - startPosition.column,
          SemanticTokenTypes.property,
          [SemanticTokenModifiers.static],
        );

        // Manage the `unité` mechanism
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

      case "assiette":
      case "tranches":
      case "taux":
      case "multiplicateur":
      case "plafond":
      case "arrondi":
      case "montant":
      case "références_à":
      case "sauf_dans":
      case "choix_obligatoire":
      case "possibilités":
      case "si":
      case "sinon":
      case "alors":
      case "depuis":
      case "dans":
      case "source":
      case "url":
      case "nom":
      case "les_règles":
      case "avec":
      case "formule": {
        pushToken(
          builder,
          node.startPosition.row,
          node.startPosition.column,
          node.endPosition.column - node.startPosition.column,
          SemanticTokenTypes.keyword,
        );
        break;
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

      case "date":
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

      case "string": {
        pushToken(
          builder,
          node.startPosition.row,
          node.startPosition.column,
          node.endPosition.column - node.startPosition.column,
          SemanticTokenTypes.enumMember,
          [SemanticTokenModifiers.readonly],
        );
        break;
      }

      case "import": {
        const intoNode = node.childForFieldName("into");
        if (intoNode && intoNode.type === "dotted_name") {
          intoNode.children.forEach((name) => {
            pushToken(
              builder,
              name.startPosition.row,
              name.startPosition.column,
              name.endPosition.column - name.startPosition.column,
              SemanticTokenTypes.namespace,
            );
          });
        }
      }

      case "import_rule":
      case "reference": {
        const dottedName = node.firstNamedChild;
        if (!dottedName) {
          break;
        }

        const refLength = dottedName.childCount;
        node.firstNamedChild?.children.forEach((name, index) => {
          const tokenType =
            name.type === "name"
              ? index === refLength - 1
                ? SemanticTokenTypes.function
                : SemanticTokenTypes.namespace
              : SemanticTokenTypes.operator;

          pushToken(
            builder,
            name.startPosition.row,
            name.startPosition.column,
            name.endPosition.column - name.startPosition.column,
            tokenType,
          );
        });
        break;
      }

      case "importer": {
        pushToken(
          builder,
          node.startPosition.row,
          node.startPosition.column,
          node.endPosition.column - node.startPosition.column,
          SemanticTokenTypes.macro,
        );
        break;
      }

      case "meta_name": {
        pushToken(
          builder,
          node.startPosition.row,
          node.startPosition.column,
          node.endPosition.column - node.startPosition.column,
          SemanticTokenTypes.property,
        );
        break;
      }

      case "paragraph": {
        // FIXME: when the paragraph is on multiple lines, the content
        // is not tokenized.
      }
      case "text_line":
      case "meta_value": {
        pushToken(
          builder,
          node.startPosition.row,
          node.startPosition.column,
          node.endPosition.column - node.startPosition.column,
          SemanticTokenTypes.string,
        );
        break;
      }

      case "unit": {
        pushToken(
          builder,
          node.startPosition.row,
          node.startPosition.column,
          node.endPosition.column - node.startPosition.column,
          SemanticTokenTypes.type,
        );
        break;
      }

      // FIXME: expression tokens like `+`, `-`, `*`, `/`, etc. are not shown
      // in the syntax tree.
      default: {
        if (punctuations.includes(node.type.trim())) {
          pushToken(
            builder,
            node.startPosition.row,
            node.startPosition.column,
            node.endPosition.column - node.startPosition.column,
            SemanticTokenTypes.operator,
          );
        } else {
          ctx.connection.console.log(`Unknown node type: ${node.type}`);
        }
      }
    }

    collectTokens(ctx, builder, node);
  });
}

export const tokenTypes = [
  SemanticTokenTypes.class,
  SemanticTokenTypes.comment,
  SemanticTokenTypes.decorator,
  SemanticTokenTypes.enumMember,
  SemanticTokenTypes.function,
  SemanticTokenTypes.method,
  SemanticTokenTypes.keyword,
  SemanticTokenTypes.macro,
  SemanticTokenTypes.namespace,
  SemanticTokenTypes.number,
  SemanticTokenTypes.operator,
  SemanticTokenTypes.property,
  SemanticTokenTypes.string,
  SemanticTokenTypes.struct,
  SemanticTokenTypes.type,
  SemanticTokenTypes.variable,
];

export const tokenModifiers = [
  SemanticTokenModifiers.declaration,
  SemanticTokenModifiers.definition,
  SemanticTokenModifiers.documentation,
  SemanticTokenModifiers.readonly,
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
