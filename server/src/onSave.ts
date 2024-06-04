import { DidSaveTextDocumentParams } from "vscode-languageserver/node.js";
import validate from "./validate";
import { LSContext } from "./context";

export default function onSaveHandler(ctx: LSContext) {
  return function (params: DidSaveTextDocumentParams) {
    const document = ctx.documents.get(params.textDocument.uri);
    validate(ctx, document);
  };
}
