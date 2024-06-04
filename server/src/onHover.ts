import { HandlerResult, Hover, HoverParams } from "vscode-languageserver";
import { LSContext } from "./context";
import { getFullRefName } from "./treeSitter";
import { fileURLToPath } from "url";
import { serializeEvaluation } from "publicodes";

export default function (ctx: LSContext) {
  return (params: HoverParams): HandlerResult<Hover, void> | undefined => {
    const { position, textDocument } = params;
    const document = ctx.documents.get(textDocument.uri);

    if (document == undefined) {
      ctx.connection.console.error(
        `[onHover] document not found: ${textDocument.uri}`,
      );
      return;
    }

    const tsTree = ctx.fileInfos.get(fileURLToPath(textDocument.uri))?.tsTree;
    const node = tsTree?.rootNode.descendantForPosition({
      row: position.line,
      column: position.character,
    });

    if (node == undefined) {
      ctx.connection.console.error(
        `[onHover] ${textDocument.uri}:${position.line}:${position.character} no node found`,
      );
      return;
    }

    switch (node.type) {
      case "name": {
        try {
          const fullRefName = getFullRefName(
            ctx,
            fileURLToPath(textDocument.uri),
            node,
          );

          const rawRule = ctx.rawPublicodesRules[fullRefName];
          const nodeValue = ctx.engine.evaluate(fullRefName);

          // TODO: polish the hover message
          const value = `**${rawRule?.titre ?? fullRefName}** (${serializeEvaluation(nodeValue)})
${rawRule?.description ? `\n### Description\n\n${rawRule.description}\n\n` : ""}
${rawRule?.note ? `### Note\n\n${rawRule.note}` : ""}`;

          return {
            contents: {
              kind: "markdown",
              value,
            },
          };
        } catch (e) {
          ctx.connection.console.error(
            `[onHover] ${textDocument.uri}:${position.line}:${position.character} error getting full ref name: ${e}`,
          );
          break;
        }
      }
    }
  };
}
