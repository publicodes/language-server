import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { TextDocument } from "vscode-languageserver-textdocument";
import TSParser, { SyntaxNode } from "tree-sitter";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/node.js";
import { getModelFromSource } from "@publicodes/tools/compilation";

import {
  DottedName,
  FilePath,
  LSContext,
  RawPublicodes,
  RuleDef,
} from "./context";
import { getTSTree } from "./treeSitter";
import { mapAppend, positionToRange, trimQuotedString } from "./helpers";
import { RuleName } from "@publicodes/tools";

export const PUBLICODES_FILE_EXTENSIONS = [
  ".publicodes",
  ".publicodes.yaml",
  ".publicodes.yml",
];

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
    if (PUBLICODES_FILE_EXTENSIONS.find((ext) => filePath.endsWith(ext))) {
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
  const tsTree = getTSTree(fileContent);
  const { rawRules, errors } = parseRawRules(filePath);
  const { definitions, importNamespace } = collectRuleDefs(tsTree.rootNode);

  const ruleDefs = definitions.filter(({ dottedName, namesPos }) => {
    const ruleFilePath = ctx.ruleToFileNameMap.get(dottedName);

    // Check if the rule is already defined in another file
    // TODO: add a test case for this
    if (ruleFilePath && ruleFilePath !== filePath) {
      errors.push({
        severity: DiagnosticSeverity.Error,
        range: positionToRange(namesPos),
        message: `[ Erreur syntaxique ]
La règle '${dottedName}' est déjà définie dans le fichier : '${ruleFilePath}'.

[ Solutions ]
- Renommez une des définitions de la règle '${dottedName}'.
- Supprimez une des définitions de la règle '${dottedName}'.`,
      });
      delete rawRules[dottedName];
      return false;
    }
    return true;
  });

  // Checks if the namespace is not already defined in another file
  // TODO: add a warning if the namespace is already defined in another file
  if (importNamespace) {
    const ruleFilePath = ctx.ruleToFileNameMap.get(importNamespace);
    if (ruleFilePath && ruleFilePath !== filePath) {
      delete rawRules[importNamespace];
    }
  }

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
  errors: Diagnostic[];
} {
  const errors: Diagnostic[] = [];
  try {
    // FIXME: for now, we only call getModelFromSource to resolve imports
    // and map potential errors to the current file. We should have a
    // better error handling mechanism in the future to only call
    // getModelFromSource once in validate.ts.
    const resolvedRules = getModelFromSource(filePath);
    return { rawRules: resolvedRules, errors };
  } catch (e: any) {
    if (e instanceof Error) {
      if (e.message.startsWith("Map keys must be unique")) {
        const match = e.message.match(
          /^Map keys must be unique at line (\d+), column (\d+)/,
        );
        const line = Number(match?.[1] ?? 1) - 1;
        const column = Number(match?.[2] ?? 1) - 1;
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
        const line = Number(match?.[1] ?? 1) - 1;
        const column = Number(match?.[2] ?? 1) - 1;
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
        const line = Number(match?.[1] ?? 1) - 1;
        const column = Number(match?.[2] ?? 1) - 1;
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
      if (e.message.startsWith("[ Erreur dans la macro 'importer!' ]")) {
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
    }

    return { rawRules: {}, errors };
  }
}

/**
 * Collects all rule definitions from the tree-sitter CST.
 * It's recursive to handle nested rules (e.g. `avec`).
 *
 * @param tsTree - The tree-sitter CST of the file
 *
 * @return The list of rule definitions
 */
function collectRuleDefs(
  node: TSParser.SyntaxNode,
  parentRule?: DottedName,
): { definitions: RuleDef[]; importNamespace: RuleName | undefined } {
  const definitions: RuleDef[] = [];
  // Namespace where the rules are imported (either the package name or the
  // content of the `dans` node).
  let importNamespace: RuleName | undefined;

  node.children.forEach((child) => {
    if (child.type === "import") {
      importNamespace = resolvePackageName(child);

      child.childForFieldName("rules")?.namedChildren.forEach((rule) => {
        if (rule.type === "rule" || rule.type === "import_rule") {
          definitions.push(...getRuleDefsInRule(rule, importNamespace));
        }
      });
    } else if (child.type === "rule") {
      definitions.push(...getRuleDefsInRule(child, parentRule));
    }
  });

  return { definitions, importNamespace };
}

function getRuleDefsInRule(
  rule: SyntaxNode,
  parentRule?: DottedName,
): RuleDef[] {
  const rules: RuleDef[] = [];

  const ruleNameNode = rule.childForFieldName("rule_name");
  if (!ruleNameNode || ruleNameNode.type !== "dotted_name") {
    return [];
  }

  const names = parentRule ? [parentRule] : [];

  ruleNameNode?.children.forEach((child) => {
    if (child.type === "name") {
      names.push(child.text);
    }
  });

  const dottedName = names.join(" . ");

  rules.push({
    names,
    dottedName,
    namesPos: {
      start: ruleNameNode.startPosition,
      end: ruleNameNode.endPosition,
    },
    defPos: {
      start: rule.startPosition,
      end: rule.endPosition,
    },
  });

  const bodyNode = rule.childForFieldName("body");

  if (bodyNode && bodyNode.type === "rule_body") {
    bodyNode.namedChildren.forEach((child) => {
      if (child.type === "s_avec") {
        const { definitions } = collectRuleDefs(child, dottedName);
        rules.push(...definitions);
      }
    });
  }

  return rules;
}

/**
 * When resolving the `importer!` macro, rules are imported in a new parent
 * namespace. This new parent namespace is either the package name or if
 * defined, the content of the `dans` (into) node.
 */
function resolvePackageName(node: SyntaxNode): string {
  const into = node.childForFieldName("into");
  if (into) {
    return trimQuotedString(into.text);
  }

  // The package name is required
  const name = node.childForFieldName("from")?.childForFieldName("name")!.text!;
  const trimmedName = trimQuotedString(name);

  return trimmedName.startsWith("@")
    ? // Scoped package
      trimmedName.split("/")[1]
    : trimmedName;
}
