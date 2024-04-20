import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { FilePath, LSContext, RawPublicodes, RuleDef } from "./context";
import parseYAML from "./parseYAML";
import { fileURLToPath, pathToFileURL } from "node:url";

import { resolveImports } from "./resolveImports";
import { TextDocument } from "vscode-languageserver-textdocument";

import * as TSParser from "tree-sitter";
import * as Publicodes from "tree-sitter-publicodes";
import { readFile } from "fs/promises";
import { Diagnostic } from "vscode-languageserver/node";

const PUBLICODES_FILE_EXTENSION = ".publicodes";

// NOTE: could be moved to the LSContext
const parser = new TSParser();
parser.setLanguage(Publicodes);

/**
 * Explore recursively all files in the workspace folder and concat all yaml files into one string for parsing
 *
 * PERF: file reading is synchronous, should be done in parallel
 */
export function parseDir(ctx: LSContext, uri: string) {
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
      parseDocument(
        ctx,
        filePath,
        ctx.documents.get(pathToFileURL(filePath).href),
      );
    } else if (
      statSync(filePath)?.isDirectory() &&
      !ctx.dirsToIgnore.includes(file)
    ) {
      parseDir(ctx, `${uri}/${file}`);
    }
  });
}

export function parseDocument(
  ctx: LSContext,
  filePath: FilePath,
  document?: TextDocument,
) {
  const fileContent = readFileSync(filePath).toString();
  const currentFileInfos = ctx.fileInfos.get(filePath);
  const tsTree = parser.parse(fileContent, currentFileInfos?.tsTree);

  const { rawRules, error } = parseRawRules(ctx, filePath, document);

  ctx.fileInfos.set(filePath, {
    ruleDefs: collectRuleDefs(tsTree),
    rawRules: rawRules,
    tsTree,
  });

  if (error) {
    ctx.diagnostics.push(error);
  }
}

/**
 * Parse and resolve imports of a publicodes file
 */
function parseRawRules(
  ctx: LSContext,
  filePath: FilePath,
  document?: TextDocument,
): { rawRules: RawPublicodes; error?: Diagnostic | undefined } {
  const { rules, error } = parseYAML(
    ctx,
    document,
    readFileSync(filePath).toString(),
  );

  if (error) {
    return { rawRules: {}, error: error };
  }

  const resolvedRules = resolveImports(rules, { verbose: true, ctx });

  return { rawRules: resolvedRules };
}

/**
 * Collects all rule definitions from the tree-sitter CST
 *
 * TODO: manage imbricated rule definitions
 *
 * @param tsTree - The tree-sitter CST of the file
 * @return The list of rule definitions
 */
function collectRuleDefs(tsTree: TSParser.Tree): RuleDef[] {
  const rules: RuleDef[] = [];

  tsTree.rootNode.children.forEach((child) => {
    switch (child.type) {
      case "rule": {
        const pos = { start: child.startPosition, end: child.endPosition };
        const firstNamedChild = child.firstNamedChild;
        if (!firstNamedChild) {
          // TODO: manage error
          return;
        }

        const ruleName = firstNamedChild.text;
        const body = firstNamedChild.nextNamedSibling;

        if (!body) {
          return rules.push({ kind: "namespace", name: ruleName, pos });
        }

        return rules.push({
          kind: body.type === "rule_body" ? "rule" : "constant",
          name: ruleName,
          pos,
        });
      }
      case "comment":
        return;
    }
  });

  return rules;
}
