import { TextDocument } from "vscode-languageserver-textdocument";
import { Connection, TextDocuments } from "vscode-languageserver/node";

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

export type LSContext = {
  connection: Connection;
  documents: TextDocuments<TextDocument>;
  documentSettings: Map<string, Thenable<DocumentSettings>>;
  globalSettings: DocumentSettings;
  config: GlobalConfig;
  rawPublicodesRules: Record<string, any>;
  parsedRules: Record<string, any>;
  dirsToIgnore: string[];
  lastOpenedFile?: string;
};
