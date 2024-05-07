import TSParser from "tree-sitter";
import { Range } from "vscode-languageserver";
import { Position } from "./context";

export function mapAppend<K, V>(map: Map<K, V[]>, key: K, ...value: V[]) {
  const values = map.get(key) ?? [];
  values.push(...value);
  map.set(key, values);
}

export function positionToRange(pos: Position): Range {
  return {
    start: {
      line: pos.start.row,
      character: pos.start.column,
    },
    end: {
      line: pos.end.row,
      character: pos.end.column,
    },
  };
}
