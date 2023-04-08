import { TextDocument } from "vscode-languageserver-textdocument";
import { LSContext } from "./context";
import { TextDocumentChangeEvent } from "vscode-languageserver/node";
import validate from "./validate";
import { parse } from "yaml";

export function onChangeHandler(ctx: LSContext) {
  return (change: TextDocumentChangeEvent<TextDocument>) => {
    // Re-validate the document
    validate(ctx, change.document);

    // Update rawPublicodesRules
    ctx.rawPublicodesRules = {
      ...ctx.rawPublicodesRules,
      ...parse(change.document.getText()),
    };
  };
}
