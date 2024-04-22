import { TextDocument } from "vscode-languageserver-textdocument";
import { LSContext } from "./context";
import { TextDocumentChangeEvent } from "vscode-languageserver/node.js";
import validate from "./validate";

export function onChangeHandler(ctx: LSContext) {
  return (change: TextDocumentChangeEvent<TextDocument>) => {
    // validate(ctx, change.document);
  };
}
