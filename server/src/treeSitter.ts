import TSParser from "tree-sitter";
import Publicodes from "tree-sitter-publicodes";
import { TextDocument } from "vscode-languageserver-textdocument";
import { FileInfos } from "./context";

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
  if (fileInfos?.version && fileInfos.version === document?.version) {
    return fileInfos.tsTree;
  }
  return parser.parse(content);
}
