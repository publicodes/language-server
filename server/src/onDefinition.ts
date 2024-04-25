import {
  Definition,
  DefinitionParams,
  HandlerResult,
  Location,
  LocationLink,
} from "vscode-languageserver";
import { LSContext } from "./context";

export default function (ctx: LSContext) {
  return (
    params: DefinitionParams,
  ): HandlerResult<Definition | LocationLink[], void> => {
    const { position, textDocument } = params;
    const document = ctx.documents.get(textDocument.uri);

    ctx.connection.console.log(
      `[onDefinition] ${textDocument.uri} at ${position.line}:${position.character}`,
    );
    if (document == undefined) {
      return;
    }
    const offset = document.offsetAt(position);
  };
}
