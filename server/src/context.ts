import { existsSync } from "fs";
import path, { dirname, join, normalize } from "path";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  Connection,
  Diagnostic,
  TextDocuments,
  URI,
} from "vscode-languageserver/node.js";
import * as TSParser from "tree-sitter";
import Engine from "publicodes";

export type GlobalConfig = {
  hasConfigurationCapability: boolean;
  hasWorkspaceFolderCapability: boolean;
  hasDiagnosticRelatedInformationCapability: boolean;
};

export type DocumentSettings = {
  maxNumberOfProblems: number;
};

export const defaultDocSettings: DocumentSettings = {
  maxNumberOfProblems: 1000,
};

// TODO: to be configurable
export const defaultDirsToIgnore = [
  "node_modules",
  "i18n",
  "test",
  "source",
  "scripts",
  "personas",
];

export type FilePath = string;

export type DottedName = string;

// TODO: use the publicodes types
export type RawPublicodes = Record<DottedName, any>;

export type Model = {
  root: FilePath;
  ruleToFileNameMap: Map<DottedName, FilePath>;
  rawPublicodesRules: RawPublicodes;
  parsedRules: Record<string, any>;
  engine: Engine<string>;
  files: Set<FilePath>;
};

export type FileInfos = {
  // List of rules in the file extracted from the tree-sitter's CST
  ruleDefs: RuleDef[];
  // Raw publicodes rules extracted from the file (with resolved imports).
  // It's used to be able to parse the rules with the publicodes engine.
  rawRules: RawPublicodes;
  // Tree-sitter CST of the file used to extract the rules.
  // NOTE: It is stored to get more efficient parsing when the file is changed.
  // NOTE: It's not used for now, because at first try, it was not working well.
  tsTree: TSParser.Tree;
  // Document version to check if the document has changed since the last parse.
  // NOTE: It's not used for now.
  // NOTE: We may want to differentiate the version of the parsing and the version
  // of the validation.
  version?: number;
};

// NOTE: we may want to directly store [Range]
export type Position = {
  start: TSParser.Point;
  end: TSParser.Point;
};

export type RuleDef = {
  // The name of the rule (without the dot notation)
  names: string[];
  dottedName: DottedName;
  // The position of the rule name in the file
  namesPos: Position;
  // The position of the rule definition in the file
  defPos: Position;
};

export type LSContext = {
  config: GlobalConfig;
  dirsToIgnore: string[];
  connection: Connection;
  diagnostics: Map<FilePath, Diagnostic[]>;
  // URIs of the files with diagnostics, used to remove the previous
  // diagnostics when the diagnostics are updated.
  diagnosticsURI: Set<URI>;
  documentSettings: Map<string, Thenable<DocumentSettings>>;
  documents: TextDocuments<TextDocument>;
  fileToModel: Map<FilePath, FilePath>;
  fileInfos: Map<FilePath, FileInfos>;
  globalSettings: DocumentSettings;
  models: Map<FilePath, Model>;
  workspaceFolders: FilePath[];
};

/**
 * Get the position of a rule definition in a file.
 *
 * @returns The position of the rule definition or undefined if not found.
 */
export function getRuleDef(
  ctx: LSContext,
  ruleName: string,
  fromFilePath?: FilePath,
): RuleDef | undefined {
  const fileName = getRuleFilePath(ctx, ruleName, fromFilePath);
  if (!fileName) {
    ctx.connection.console.error(
      `[getRuleDefPos] file not found: ${ruleName}`,
    );
    return;
  }

  return ctx.fileInfos
    .get(fileName)
    ?.ruleDefs.find((rule) => rule.dottedName === ruleName);
}

export const PUBLICODES_CONFIG_FILES = [
  ".publicodes.config.ts",
  ".publicodes.config.js",
];

function findWorkspaceFolder(
  ctx: LSContext,
  filePath: FilePath,
): FilePath | undefined {
  const normalizedFile = normalize(filePath);

  const matchingFolders = ctx.workspaceFolders.filter((folder) => {
    const normalizedFolder = normalize(folder);

    return (
      normalizedFile === normalizedFolder ||
      normalizedFile.startsWith(`${normalizedFolder}${path.sep}`)
    );
  });

  return matchingFolders.sort((a, b) => b.length - a.length)[0];
}

export function findModelRoot(ctx: LSContext, filePath: FilePath): FilePath {
  const workspaceRoot =
    findWorkspaceFolder(ctx, filePath) ?? dirname(normalize(filePath));

  let currentDir = dirname(normalize(filePath));

  while (true) {
    if (
      PUBLICODES_CONFIG_FILES.some((configFile) =>
        existsSync(join(currentDir, configFile)),
      )
    ) {
      return currentDir;
    }

    if (existsSync(join(currentDir, "package.json"))) {
      return currentDir;
    }

    if (currentDir === workspaceRoot) {
      break;
    }

    const parent = dirname(currentDir);
    if (parent === currentDir) {
      break;
    }
    currentDir = parent;
  }

  return workspaceRoot;
}

export function getModelFromFile(
  ctx: LSContext,
  filePath: FilePath,
): Model | undefined {
  const modelRoot = ctx.fileToModel.get(filePath);

  if (modelRoot == undefined) {
    return undefined;
  }

  return ctx.models.get(modelRoot);
}

export function ensureModelForFile(
  ctx: LSContext,
  filePath: FilePath,
): Model {
  const modelRoot = findModelRoot(ctx, filePath);
  const currentModelRoot = ctx.fileToModel.get(filePath);

  if (currentModelRoot && currentModelRoot !== modelRoot) {
    const currentModel = ctx.models.get(currentModelRoot);
    currentModel?.files.delete(filePath);
    currentModel?.ruleToFileNameMap.forEach((path, rule) => {
      if (path === filePath) {
        currentModel.ruleToFileNameMap.delete(rule);
      }
    });
  }

  let model = ctx.models.get(modelRoot);

  if (model == undefined) {
    model = {
      root: modelRoot,
      ruleToFileNameMap: new Map(),
      rawPublicodesRules: {},
      parsedRules: {},
      engine: new Engine({}),
      files: new Set(),
    };
    ctx.models.set(modelRoot, model);
  }

  model.files.add(filePath);
  ctx.fileToModel.set(filePath, modelRoot);

  return model;
}

export function clearRuleIndexForFile(ctx: LSContext, filePath: FilePath) {
  const model = getModelFromFile(ctx, filePath);

  if (model == undefined) {
    return;
  }

  model.ruleToFileNameMap.forEach((path, rule) => {
    if (path === filePath) {
      model.ruleToFileNameMap.delete(rule);
    }
  });
}

export function removeFileFromModel(ctx: LSContext, filePath: FilePath) {
  const modelRoot = ctx.fileToModel.get(filePath);
  if (modelRoot == undefined) {
    return;
  }

  const model = ctx.models.get(modelRoot);
  if (model == undefined) {
    return;
  }

  clearRuleIndexForFile(ctx, filePath);
  model.files.delete(filePath);
  ctx.fileToModel.delete(filePath);

  if (model.files.size === 0) {
    ctx.models.delete(modelRoot);
  }
}

export function getRuleFilePath(
  ctx: LSContext,
  ruleName: string,
  fromFilePath?: FilePath,
): FilePath | undefined {
  const model =
    fromFilePath != undefined ? getModelFromFile(ctx, fromFilePath) : undefined;

  if (model) {
    return model.ruleToFileNameMap.get(ruleName);
  }

  let foundFile: FilePath | undefined = undefined;

  ctx.models.forEach((model) => {
    const file = model.ruleToFileNameMap.get(ruleName);

    if (!file) {
      return;
    }

    if (foundFile && file !== foundFile) {
      foundFile = undefined;
      return;
    }
    foundFile = file;
  });

  return foundFile;
}
