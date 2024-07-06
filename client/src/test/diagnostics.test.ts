import * as vscode from "vscode";
import * as assert from "assert";
import { getDocUri, activate, mainUri, mainPath } from "./helper";

/**
 * End-to-end test suite for diagnostics.
 *
 * How it works:
 * 1. Start a vscode instance.
 * 2. Activate the 'publicodes-language-server' extension in the instance.
 * 3. Open the main document (main.publicodes).
 * 4. For each test:
 *   a. copy the content of the test document to the main document,
 *   b. save the main document and wait for the diagnostics to be computed.
 *
 * TODO: Add at least one test for each diagnostic (need to support multiple files).
 */
suite("Should get diagnostics", () => {
  test("Missing name in import macros", async () => {
    await testDiagnostics(getDocUri("diagnostics-import.publicodes"), [
      {
        message: `[ Erreur dans la macro 'importer!' ]
Le nom du package est manquant dans la macro 'importer!' dans le fichier: ${mainPath}.

[ Solution ]
Ajoutez le nom du package dans la macro 'importer!'.

[ Exemple ]
importer!:
  depuis:
    nom: package-name
  les règles:
    - ruleA
    - ruleB
    ...
`,
        range: toRange(0, 0, 0, 9),
        severity: vscode.DiagnosticSeverity.Error,
        source: "publicodes",
      },
    ]);
  });

  test("Malformed expression", async () => {
    await testDiagnostics(getDocUri("diagnostics-expressions.publicodes"), [
      {
        message: `[ InternalError ]
➡️  Dans la règle "logement . électricité . photovoltaique"
✖️  
Un problème est survenu lors du parsing de l'expression \`autoconsommation + production +\` :

	le parseur Nearley n'a pas réussi à parser l'expression.
`,
        range: toRange(0, 0, 0, 39),
        severity: vscode.DiagnosticSeverity.Error,
        source: "publicodes",
      },
    ]);
  });
});

function toRange(sLine: number, sChar: number, eLine: number, eChar: number) {
  const start = new vscode.Position(sLine, sChar);
  const end = new vscode.Position(eLine, eChar);
  return new vscode.Range(start, end);
}

async function testDiagnostics(
  docUri: vscode.Uri,
  expectedDiagnostics: vscode.Diagnostic[],
) {
  await activate(docUri);

  const actualDiagnostics = vscode.languages.getDiagnostics(mainUri);

  assert.equal(actualDiagnostics.length, expectedDiagnostics.length);

  expectedDiagnostics.forEach((expectedDiagnostic, i) => {
    const actualDiagnostic = actualDiagnostics[i];
    assert.equal(actualDiagnostic.message, expectedDiagnostic.message);
    assert.deepEqual(actualDiagnostic.range, expectedDiagnostic.range);
    assert.equal(actualDiagnostic.severity, expectedDiagnostic.severity);
  });
}
