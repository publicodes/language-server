import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { TextDocument } from "vscode-languageserver-textdocument";
import TSParser from "tree-sitter";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/node.js";
import { getModelFromSource } from "@publicodes/tools/compilation";

import { FilePath, LSContext, RawPublicodes, RuleDef } from "./context";
import { getTSTree } from "./treeSitter";
import { mapAppend, positionToRange } from "./helpers";

const PUBLICODES_FILE_EXTENSION = ".publicodes";

/**
 * Explore recursively all files in the workspace folder and concat all yaml
 * files into one string for parsing.
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
    if (filePath.endsWith(PUBLICODES_FILE_EXTENSION)) {
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
  const fileContent = document?.getText() ?? readFileSync(filePath).toString();
  const fileInfos = ctx.fileInfos.get(filePath);
  const tsTree = getTSTree(fileContent, fileInfos, document);
  const { rawRules, errors } = parseRawRules(filePath);
  const ruleDefs = collectRuleDefs(tsTree).filter(
    ({ dottedName, namesPos }) => {
      const ruleFilePath = ctx.ruleToFileNameMap.get(dottedName);

      // Check if the rule is already defined in another file
      if (ruleFilePath && ruleFilePath !== filePath) {
        errors.push({
          severity: DiagnosticSeverity.Error,
          range: positionToRange(namesPos),
          message: `[ Erreur syntaxique ]
La règle '${dottedName}' est déjà définie dans le fichier : "${ruleFilePath}".

[ Solutions ]
- Renommez une des définitions de la règle '${dottedName}'.
- Supprimez une des définitions de la règle '${dottedName}'.`,
        });
        delete rawRules[dottedName];
        return false;
      }
      return true;
    },
  );

  ctx.fileInfos.set(filePath, {
    // NOTE: not needed for now (we use the parsedRules from the engine)
    ruleDefs,
    rawRules,
    tsTree,
    version: document?.version,
  });

  ruleDefs.forEach(({ dottedName }) => {
    ctx.ruleToFileNameMap.set(dottedName, filePath);
  });

  if (errors.length > 0) {
    mapAppend(ctx.diagnostics, filePath, ...errors);
  }
}

/**
 * Parse and resolve imports of a publicodes file
 */
function parseRawRules(filePath: FilePath): {
  rawRules: RawPublicodes;
  errors?: Diagnostic[] | undefined;
} {
  const errors: Diagnostic[] = [];
  try {
    const resolvedRules = getModelFromSource(filePath);
    return { rawRules: resolvedRules, errors };
  } catch (e: any) {
    if (e instanceof Error) {
      if (e.message.startsWith("Map keys must be unique")) {
        const match = e.message.match(
          /^Map keys must be unique at line (\d+), column (\d+)/,
        );
        const line = Number(match?.[1]) - 1 ?? 0;
        const column = Number(match?.[2]) - 1 ?? 0;
        const name = e.message.match(/(\n.*)*\n(.+):/)?.[2] ?? "";

        errors.push({
          severity: DiagnosticSeverity.Error,
          range: {
            start: { line, character: column },
            end: { line, character: column + name.length },
          },
          message: `[ Erreur syntaxique ]
La règle '${name}' est définie plusieurs fois dans le fichier.

[ Solutions ]
- Renommez une des définitions de la règle '${name}'.
- Supprimez une des définitions de la règle '${name}'.
`,
        });
      }
      if (
        e.message.startsWith(
          "Implicit map keys need to be followed by map values",
        )
      ) {
        const match = e.message.match(
          /^Implicit map keys need to be followed by map values at line (\d+), column (\d+)/,
        );
        const line = Number(match?.[1]) - 1 ?? 0;
        const column = Number(match?.[2]) - 1 ?? 0;
        const name = e.message.match(/\s*(.*)\n\s*\^+/)?.[1] ?? "<nom>";

        errors.push({
          severity: DiagnosticSeverity.Error,
          range: {
            start: { line, character: column },
            end: { line, character: column + name.length },
          },
          message: `[ Erreur syntaxique ]
L'attribut '${name}' doit être suivi d'une valeur.

[ Solutions ]
- Il se peut que vous ayez oublié un deux-points (':') après l'attribut.

[ Exemple ]
  ${name}: 42
          `,
        });
      }
      if (e.message.startsWith("Implicit keys need to be on a single line")) {
        const match = e.message.match(
          /^Implicit keys need to be on a single line at line (\d+), column (\d+)/,
        );
        const line = Number(match?.[1]) - 1 ?? 0;
        const column = Number(match?.[2]) - 1 ?? 0;
        const name = e.message.match(/\s*(.*)\n\s*\^+/)?.[1] ?? "<nom>";

        errors.push({
          severity: DiagnosticSeverity.Error,
          range: {
            start: { line, character: column },
            end: { line, character: column + name.length },
          },
          message: `[ Erreur syntaxique ]
L'attribut '${name}' doit être suivi d'une valeur.

[ Solutions ]
- Il se peut que vous ayez oublié un deux-points (':') après l'attribut.

[ Exemple ]
  ${name}: 42
          `,
        });
      }
    }
    if (errors.length === 0) {
      errors.push({
        severity: DiagnosticSeverity.Error,
        range: {
          // TODO: use the tree-sitter CST to get the position of the
          // import statement
          start: { line: 0, character: 0 },
          end: { line: 0, character: "importer!".length },
        },
        message: e.message,
        source: "publicodes",
      });
    }

    return { rawRules: {}, errors };
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
    if (child.type === "rule") {
      let ruleNameNode = child.firstNamedChild;
      let startPos = ruleNameNode.startPosition;
      let endPos = ruleNameNode.endPosition;
      let names = [];

      while (ruleNameNode && ruleNameNode.type === "name") {
        names.push(ruleNameNode.text);
        endPos = ruleNameNode.endPosition;
        ruleNameNode = ruleNameNode.nextNamedSibling;
      }

      return rules.push({
        names,
        dottedName: names.join(" . "),
        namesPos: {
          start: startPos,
          end: endPos,
        },
        defPos: {
          start: child.startPosition,
          end: child.endPosition,
        },
      });
    }
  });

  return rules;
}
