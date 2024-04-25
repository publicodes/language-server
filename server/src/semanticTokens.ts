import {
  SemanticTokenModifiers,
  SemanticTokenTypes,
  SemanticTokens,
  SemanticTokensBuilder,
  SemanticTokensParams,
} from "vscode-languageserver";
import { LSContext } from "./context";

export function semanticTokensFullProvider(ctx: LSContext) {
  return (params: SemanticTokensParams): SemanticTokens => {
    // const document = ctx.documents.get(params.textDocument.uri);
    ctx.connection.console.log(
      `Received request for semantic tokens, params: ${JSON.stringify(params, null, 2)}`,
    );
    const builder = new SemanticTokensBuilder();

    pushToken(builder, 0, 0, 9, SemanticTokenTypes.function);

    return builder.build();
  };
}

const tokenTypes = [
  SemanticTokenTypes.function,
  SemanticTokenTypes.number,
  SemanticTokenTypes.macro,
  SemanticTokenTypes.string,
  SemanticTokenTypes.comment,
  SemanticTokenTypes.variable,
  SemanticTokenTypes.operator,
  SemanticTokenTypes.namespace,
];

const tokenModifiers = [
  SemanticTokenModifiers.readonly,
  SemanticTokenModifiers.documentation,
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
