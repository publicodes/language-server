import { TextDocument } from "vscode-languageserver-textdocument";
import { LSContext } from "./context";

export default async function validate(
  ctx: LSContext,
  document: TextDocument
): Promise<void> {
  // In this simple example we get the settings for every validate run.
  // const settings = await getDocumentSettings(document.uri);
  // const rules = parse(document.getText());
  // try {
  //   publicodeEngine.set(document.uri, new Engine(rules));
  // } catch (e: Error | any) {
  //   connection.console.log(Object.keys(e.info).join(", "));
  //   // const diagnostics = e?.errors.map((error: PublicodesError<any>) => {
  //   //   return {
  //   //     severity: DiagnosticSeverity.Error,
  //   //     range: {
  //   //       start: document.positionAt(e.index),
  //   //       end: document.positionAt(e.index + e.range),
  //   //     },
  //   //     message: error.message,
  //   //     source: "publicodes",
  //   //   };
  //   // });
  //   // connection.sendDiagnostics({ uri: document.uri, diagnostics });
  // }
  // The validator creates diagnostics for all uppercase words length 2 and more
  // const text = document.getText();
  // const pattern = /\b[A-Z]{2,}\b/g;
  // let m: RegExpExecArray | null;
  //
  // let problems = 0;
  // const diagnostics: Diagnostic[] = [];
  // while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
  //   problems++;
  //   const diagnostic: Diagnostic = {
  //     severity: DiagnosticSeverity.Warning,
  //     range: {
  //       start: document.positionAt(m.index),
  //       end: document.positionAt(m.index + m[0].length),
  //     },
  //     message: `${m[0]} is all uppercase.`,
  //     source: "ex",
  //   };
  //   if (hasDiagnosticRelatedInformationCapability) {
  //     diagnostic.relatedInformation = [
  //       {
  //         location: {
  //           uri: document.uri,
  //           range: Object.assign({}, diagnostic.range),
  //         },
  //         message: "Spelling matters",
  //       },
  //       {
  //         location: {
  //           uri: document.uri,
  //           range: Object.assign({}, diagnostic.range),
  //         },
  //         message: "Particularly for names",
  //       },
  //     ];
  //   }
  //   diagnostics.push(diagnostic);
  // }
  //
  // Send the computed diagnostics to VSCode.
}

// function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
//   if (!hasConfigurationCapability) {
//     return Promise.resolve(globalSettings);
//   }
//   let result = documentSettings.get(resource);
//   if (!result) {
//     result = connection.workspace.getConfiguration({
//       scopeUri: resource,
//       section: "publicodes-language-server",
//     });
//     documentSettings.set(resource, result);
//   }
//   return result;
// }
