import TSParser from "tree-sitter";
import Publicodes from "tree-sitter-publicodes";

const parser = new TSParser();
parser.setLanguage(Publicodes);

export function tsParseText(
  content: string,
  currentTree?: TSParser.Tree | undefined,
): TSParser.Tree {
  return parser.parse(content, currentTree);
}
