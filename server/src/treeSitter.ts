import TSParser from "tree-sitter";
import Publicodes from "tree-sitter-publicodes";
import { TextDocument } from "vscode-languageserver-textdocument";
import { FileInfos, LSContext } from "./context";
import { utils } from "publicodes";
import assert from "assert";

const parser = new TSParser();
parser.setLanguage(Publicodes);

/**
 * Parse the content of the document with the tree-sitter parser if the
 * document has changed since the last parse.
 *
 * @param content - The content of the document to parse
 * @param fileInfos - The file infos to check if the document has changed
 * @param document - The document to get the version from
 *
 * @returns The tree-sitter tree of the document
 */
export function getTSTree(
  content: string,
  fileInfos: FileInfos | undefined,
  document: TextDocument | undefined,
): TSParser.Tree {
  // if (fileInfos?.version && fileInfos.version === document?.version) {
  //   return fileInfos.tsTree;
  // }
  return parser.parse(content);
}

/**
 * Get the full reference name of a node by traversing its parents.
 *
 * @param node - The node to get the full reference name from (expected to be a name node)
 *
 * @returns The full reference name of the node
 *
 * @throws A Publicodes SyntaxError if the node is not accessible or the reference name is not found.
 */
export function getFullRefName(
  ctx: LSContext,
  filePath: string,
  node: TSParser.SyntaxNode,
): string {
  assert(node.type === "name");
  let currentNode = node;
  const ruleNames: string[] = [];

  while (currentNode?.type === "name") {
    ruleNames.push(currentNode.text);
    currentNode = currentNode.previousNamedSibling;
  }

  const ruleDef = getRuleNameAt(ctx, filePath, node.startPosition.row);

  if (ruleDef == undefined) {
    throw new SyntaxError(
      `No rule definition found for node at ${node.startPosition.row}:${node.startPosition.column}`,
    );
  }

  return utils.disambiguateReference(
    ctx.parsedRules,
    ruleDef,
    ruleNames.reverse().join(" . "),
  );
}

export function getRuleNameAt(
  ctx: LSContext,
  filePath: string,
  row: number,
): string | undefined {
  const { ruleDefs } = ctx.fileInfos.get(filePath);

  const ruleDef = ruleDefs?.find((ruleDef) => {
    return ruleDef.defPos.start.row <= row && ruleDef.defPos.end.row >= row;
  });

  return ruleDef?.names.join(" . ");
}
