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
  // NOTE: for now, it's only used to skip the tree-sitter parsing if the document has not changed.
  version?: number;
};

export type RuleDef = {
  // The name of the rule (without the dot notation)
  names: string[];
  // The position of the rule name in the file
  namesPos: {
    start: TSParser.Point;
    end: TSParser.Point;
  };
  // The position of the rule definition in the file
  defPos: {
    start: TSParser.Point;
    end: TSParser.Point;
  };
};

export type LSContext = {
  config: GlobalConfig;
  connection: Connection;
  diagnostics: Map<FilePath, Diagnostic[]>;
  // URIs of the files with diagnostics, used to remove the previous
  // diagnostics when the diagnostics are updated.
  diagnosticsURI: Set<URI>;
  documentSettings: Map<string, Thenable<DocumentSettings>>;
  documents: TextDocuments<TextDocument>;
  engine: Engine<string>;
  fileInfos: Map<FilePath, FileInfos>;
  fileNameToRulesMap: Map<FilePath, DottedName[]>;
  globalSettings: DocumentSettings;
  nodeModulesPaths?: string[];
  parsedRules: Record<string, any>;
  rawPublicodesRules: RawPublicodes;
  rootFolderPath?: string;
  ruleToFileNameMap: Map<DottedName, FilePath>;

  // TODO: to remove
  dirsToIgnore: string[];
  lastOpenedFile?: string;
};
