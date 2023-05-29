import { TextDocument } from "vscode-languageserver-textdocument";
import {
  Connection,
  Diagnostic,
  TextDocuments,
} from "vscode-languageserver/node";

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

export type RawPublicodes = Record<DottedName, any>;

export type LSContext = {
  connection: Connection;
  rootFolderPath?: string;
  nodeModulesPaths?: string[];
  documents: TextDocuments<TextDocument>;
  documentSettings: Map<string, Thenable<DocumentSettings>>;
  globalSettings: DocumentSettings;
  config: GlobalConfig;
  ruleToFileNameMap: Map<DottedName, FilePath>;
  fileNameToRulesMap: Map<FilePath, DottedName[]>;
  URIToRevalidate: Set<FilePath>;
  rawPublicodesRules: RawPublicodes;
  parsedRules: Record<string, any>;
  dirsToIgnore: string[];
  lastOpenedFile?: string;
};
