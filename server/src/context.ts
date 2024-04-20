import { TextDocument } from "vscode-languageserver-textdocument";
import {
  Connection,
  Diagnostic,
  TextDocuments,
} from "vscode-languageserver/node";
import * as TSParser from "tree-sitter";

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
  tsTree: TSParser.Tree;
};

export type RuleDef = {
  kind: "rule" | "namespace" | "constant";
  name: string;
  pos: {
    start: TSParser.Point;
    end: TSParser.Point;
  };
};

export type LSContext = {
  connection: Connection;
  config: GlobalConfig;
  globalSettings: DocumentSettings;
  rootFolderPath?: string;
  nodeModulesPaths?: string[];
  documents: TextDocuments<TextDocument>;
  documentSettings: Map<string, Thenable<DocumentSettings>>;
  fileInfos: Map<FilePath, FileInfos>;
  diagnostics: Diagnostic[];

  // TODO: maybe to remove
  ruleToFileNameMap: Map<DottedName, FilePath>;
  fileNameToRulesMap: Map<FilePath, DottedName[]>;

  // TODO: to remove
  rawPublicodesRules: RawPublicodes;
  parsedRules: Record<string, any>;
  dirsToIgnore: string[];
  lastOpenedFile?: string;
  URIToRevalidate: Set<FilePath>;
};
