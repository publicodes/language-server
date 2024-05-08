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
  engine: Engine<string>;
  fileInfos: Map<FilePath, FileInfos>;
  globalSettings: DocumentSettings;
  parsedRules: Record<string, any>;
  rawPublicodesRules: RawPublicodes;
  ruleToFileNameMap: Map<DottedName, FilePath>;
};
