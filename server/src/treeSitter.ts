import { TextDocument } from "vscode-languageserver-textdocument";
import Publicodes from "tree-sitter-publicodes";
import TSParser, { SyntaxNode } from "tree-sitter";
import { DottedName, FileInfos, LSContext, Position } from "./context";
import { utils } from "publicodes";
import assert from "assert";
import { trimQuotedString } from "./helpers";

// export function getParser(): TSParser {
//   const platform = process.platform;
//   const arch = process.arch;
//   // const treeSitterPath = require.resolve(
//   //   `tree-sitter-${platform}-${arch}.node`,
//   // );
//   const treeSitter = require(`tree-sitter-${platform}-${arch}.node`);
//   const parser = new treeSitter.TSParser();
//   // const publicodesPath = require.resolve(
//   //   `tree-sitter-publicodes-${platform}-${arch}.node`,
//   // );
//   parser.setLanguage(
//     require(`tree-sitter-publicodes-${platform}-${arch}.node`),
//   );
//   return parser;
// }
//

// const parser = getParser();
//

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
 *
 * PERF: For now the tree-sitter parser is not incremental, so we parse the
 * whole document each time. This could be optimized in the future.
 *
 * NOTE: We need to parse the content by chunks of (max int) length to avoid
 * tree-sitter's buffer size limit. Due to the C API, the buffer size is
 * limited to INT_MAX.
 */
export function getTSTree(content: string): TSParser.Tree {
  const MAX_C_INT = 32_767;

  return parser.parse((idx, _pos) => {
    return idx >= content.length
      ? null
      : content.slice(idx, Math.min(idx + MAX_C_INT, content.length));
  });
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
  let currentNode: TSParser.SyntaxNode | null = node;
  const ruleNames: string[] = [];

  while (currentNode?.type === "name") {
    ruleNames.push(currentNode.text);
    currentNode = currentNode.previousNamedSibling;
  }

  const ruleDottedName = getRuleNameAt(ctx, filePath, node.startPosition.row);

  if (ruleDottedName == undefined) {
    throw new SyntaxError(
      `No rule definition found for node at ${node.startPosition.row}:${node.startPosition.column}`,
    );
  }

  return utils.disambiguateReference(
    ctx.parsedRules,
    ruleDottedName,
    trimQuotedString(ruleNames.reverse().join(" . ")),
  );
}

export function getRuleNameAt(
  ctx: LSContext,
  filePath: string,
  row: number,
): string | undefined {
  if (!ctx.fileInfos.has(filePath)) {
    return;
  }

  const { ruleDefs } = ctx.fileInfos.get(filePath)!;

  // We want to get the rule definition that is the closest to the row. Indeed,
  // with nested rules, we can have multiple definitions for the same rule
  // name.
  const sortedDefs = ruleDefs
    .filter((ruleDef) => {
      return ruleDef.defPos.start.row <= row && ruleDef.defPos.end.row >= row;
    })
    .sort((a, b) => {
      return b.defPos.start.row - a.defPos.start.row;
    });

  return sortedDefs[0]?.dottedName;
}

export function getRefInRule(
  ctx: LSContext,
  filePath: string,
  ruleName: DottedName,
  refName: DottedName,
): SyntaxNode | null {
  const { ruleDefs, tsTree } = ctx.fileInfos.get(filePath)!;

  const ruleDef = ruleDefs.find((ruleDef) => ruleDef.dottedName === ruleName);
  if (ruleDef == undefined) {
    return null;
  }

  let ruleNode: SyntaxNode | null = tsTree.rootNode.descendantForPosition(
    ruleDef.defPos.start,
  );
  if (ruleNode == undefined) {
    return null;
  }

  ruleNode = ruleNode.nextNamedSibling;
  if (ruleNode == undefined || ruleNode.type !== "rule_body") {
    return null;
  }

  return searchRefInNode(ruleNode, refName);
}

function searchRefInNode(
  node: SyntaxNode,
  refName: DottedName,
): SyntaxNode | null {
  if (node.type === "reference" && node.text === refName) {
    return node;
  }

  let child = node.firstChild;
  while (child) {
    const found = searchRefInNode(child, refName);
    if (found !== null) {
      return found;
    }
    child = child.nextNamedSibling;
  }

  return null;
}
