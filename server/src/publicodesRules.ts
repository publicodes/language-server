import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { TextDocument } from "vscode-languageserver-textdocument";
import TSParser from "tree-sitter";
import Publicodes from "tree-sitter-publicodes";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/node.js";
import { getModelFromSource } from "@publicodes/tools/compilation";

import { FilePath, LSContext, RawPublicodes, RuleDef } from "./context";

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
  const { rawRules, error } = parseRawRules(filePath, document);

  ctx.connection.console.log(
    "[parseDocument] parsed " + JSON.stringify(rawRules, null, 2),
  );

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
  filePath: FilePath,
  document?: TextDocument,
): { rawRules: RawPublicodes; error?: Diagnostic | undefined } {
  try {
    const resolvedRules = getModelFromSource(filePath);
    return { rawRules: resolvedRules };
  } catch (e: any) {
    return {
      rawRules: {},
      error: {
        severity: DiagnosticSeverity.Error,
        range: {
          // TODO: use the tree-sitter CST to get the position of the
          // import statement
          start: { line: 0, character: 0 },
          end: { line: 0, character: "importer!".length },
        },
        message: e.message,
        source: "publicodes",
      },
    };
  }
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
