import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { FilePath, LSContext } from "./context";
import parseYAML from "./parseYAML";
import { fileURLToPath, pathToFileURL } from "node:url";

import { resolveImports } from "./resolveImports";
import { TextDocument } from "vscode-languageserver-textdocument";

const PUBLICODES_FILE_EXTENSION = ".publicodes";

export function parseRawPublicodesRulesFromDocument(
  ctx: LSContext,
  filePath: FilePath,
  document?: TextDocument
) {
  const { rules, error } = parseYAML(
    ctx,
    document,
    readFileSync(filePath).toString()
  );
  const resolvedRules = resolveImports(rules, { verbose: true, ctx });

  const ruleNames = Object.keys(resolvedRules);

  // Manage removed rules
  if (ctx.fileNameToRulesMap.has(filePath)) {
    ctx.fileNameToRulesMap
      .get(filePath)
      ?.filter((rule) => !ruleNames.includes(rule))
      ?.forEach((rule) => {
        ctx.ruleToFileNameMap.delete(rule);
        delete resolvedRules[rule];
        delete ctx.rawPublicodesRules[rule];
      });
  }

  ctx.fileNameToRulesMap.set(filePath, ruleNames);
  ruleNames.forEach((rule) => ctx.ruleToFileNameMap.set(rule, filePath));
  ctx.rawPublicodesRules = {
    ...ctx.rawPublicodesRules,
    ...resolvedRules,
  };

  if (error) {
    ctx.connection.sendDiagnostics({
      uri: document !== undefined ? document.uri : pathToFileURL(filePath).href,
      diagnostics: [error],
    });
  }

  return ctx;
}

// Explore recursively all files in the workspace folder
// and concat all yaml files into one string for parsing
// Explore recursively all files in the workspace folder
// and concat all yaml files into one string for parsing
export function parseRawPublicodesRules(
  ctx: LSContext,
  uri: string
): LSContext {
  const path = fileURLToPath(uri);
  const files = readdirSync(path);
  files?.forEach((file) => {
    if (file.startsWith(".")) {
      return;
    }
    const filePath = join(path, file);
    if (
      filePath.endsWith(PUBLICODES_FILE_EXTENSION) ||
      // TODO: should be all allowed extensions, temporary fix to test
      filePath.endsWith(".yaml")
    ) {
      ctx = parseRawPublicodesRulesFromDocument(
        ctx,
        filePath,
        ctx.documents.get(pathToFileURL(filePath).href)
      );
    } else if (
      statSync(filePath)?.isDirectory() &&
      !ctx.dirsToIgnore.includes(file)
    ) {
      ctx = parseRawPublicodesRules(ctx, `${uri}/${file}`);
    }
  });

  return ctx;
}
