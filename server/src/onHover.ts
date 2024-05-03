import { HandlerResult, Hover, HoverParams } from "vscode-languageserver";
import { LSContext } from "./context";
import { getFullRefName } from "./treeSitter";
import { fileURLToPath } from "url";

export default function (ctx: LSContext) {
  return (params: HoverParams): HandlerResult<Hover, void> => {
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
          // TODO: could be extracted to an helper?
          const fullRefName = getFullRefName(
            ctx,
            fileURLToPath(textDocument.uri),
            node,
          );

          const rawRule = ctx.rawPublicodesRules[fullRefName];

          const value =
            `## ${rawRule?.titre ?? fullRefName}\n\n` +
            Object.entries(rawRule ?? {})
              .map(([key, value]) => {
                if (key !== "titre") {
                  return `### ${key}\n\n${value}`;
                }
              })
              .join("\n\n");

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
      default: {
        return {
          contents: {
            kind: "markdown",
            value: `(${node.type})`,
          },
        };
      }
    }
  };
}
