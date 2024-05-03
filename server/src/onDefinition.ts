import {
  Definition,
  DefinitionParams,
  HandlerResult,
  LocationLink,
} from "vscode-languageserver";
import { LSContext } from "./context";
import { getFullRefName } from "./treeSitter";
import { fileURLToPath, pathToFileURL } from "url";

export default function (ctx: LSContext) {
  return (
    params: DefinitionParams,
  ): HandlerResult<Definition | LocationLink[], void> => {
    const { position, textDocument } = params;
    const document = ctx.documents.get(textDocument.uri);
    if (document == undefined) {
      ctx.connection.console.error(
        `[onDefinition] document not found: ${textDocument.uri}`,
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
        `[onDefinition] ${textDocument.uri}:${position.line}:${position.character} no node found`,
      );
      return;
    }

    if (node.type !== "name") {
      ctx.connection.console.warn(
        `[onDefinition] ${textDocument.uri}:${position.line}:${position.character} node is not a name`,
      );
    }

    try {
      // TODO: could be extracted to an helper?
      const fullRefName = getFullRefName(
        ctx,
        fileURLToPath(textDocument.uri),
        node,
      );
      const filePath = ctx.ruleToFileNameMap.get(fullRefName);
      if (filePath == undefined) {
        return undefined;
      }

      const ruleDef = ctx.fileInfos
        .get(filePath)
        ?.ruleDefs.find((ruleDef) => ruleDef.names.join(" . ") === fullRefName);
      if (ruleDef == undefined) {
        ctx.connection.console.error(
          `[onDefinition] ${textDocument.uri}:${position.line}:${position.character} no rule definition found for ${fullRefName}`,
        );
        return;
      }

      return {
        uri: pathToFileURL(filePath).href,
        range: {
          start: {
            line: ruleDef.namesPos.start.row,
            character: ruleDef.namesPos.start.column,
          },
          end: {
            line: ruleDef.namesPos.end.row,
            character: ruleDef.namesPos.end.column,
          },
        },
      };
    } catch (e) {
      ctx.connection.console.error(
        `[onDefinition] ${textDocument.uri}:${position.line}:${position.character} error getting full ref name: ${e}`,
      );
    }
  };
}
