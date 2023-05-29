import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { FilePath, LSContext } from "./context";
import parseYAML from "./parseYAML";
import { fileURLToPath, pathToFileURL } from "node:url";

import { resolveImports } from "./resolveImports";
import { TextDocument } from "vscode-languageserver-textdocument";

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

  Object.keys(resolvedRules).forEach((rule) =>
    ctx.ruleToFileNameMap.set(rule, filePath)
  );
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
  // ctx.connection.console.log(`Files: ${files.join(",")}`);
  files?.forEach((file) => {
    if (file.startsWith(".")) {
      // ctx.connection.console.log(`Ignoring ${file}`);
      return;
    }
    const filePath = join(path, file);
    // TODO: should be .publi.yaml instead of ignoring i18n/
    if (filePath.endsWith(".yaml")) {
      // ctx.connection.console.log(`Parsed ${filePath}:`);
      ctx = parseRawPublicodesRulesFromDocument(
        ctx,
        filePath,
        ctx.documents.get(pathToFileURL(filePath).href)
      );
    } else if (
      statSync(filePath)?.isDirectory() &&
      !ctx.dirsToIgnore.includes(file)
    ) {
      // ctx.connection.console.log(`Recursing into ${file}`);
      ctx = parseRawPublicodesRules(ctx, `${uri}/${file}`);
    }
  });

  return ctx;
}
