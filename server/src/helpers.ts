import { Range, URI } from "vscode-languageserver";
import { LSContext, Position } from "./context";
import { fileURLToPath } from "node:url";

/**
 * Append values to a map of arrays. If the key is undefined, do nothing.
 */
export function mapAppend<K, V>(
  map: Map<K, V[]>,
  key: K | undefined,
  ...value: V[]
) {
  if (key == undefined) {
    return;
  }
  const values = map.get(key) ?? [];
  values.push(...value);
  map.set(key, values);
}

/**
 * Convert a custom internal Position type extracted from the TS tree to a LSP Range.
 */
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

/**
 * Delete a file from the LS context.
 */
export function deleteFileFromCtx(ctx: LSContext, uri: URI) {
  const path = fileURLToPath(uri);

  ctx.fileInfos.delete(path);

  ctx.ruleToFileNameMap.forEach((path, rule) => {
    if (path === fileURLToPath(uri)) {
      ctx.ruleToFileNameMap.delete(rule);
    }
  });

  if (ctx.diagnostics.has(path)) {
    ctx.diagnostics.delete(path);
    ctx.diagnosticsURI.delete(uri);
    ctx.connection.sendDiagnostics({ uri, diagnostics: [] });
  }
}
