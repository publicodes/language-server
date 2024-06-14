import * as vscode from "vscode";
import * as path from "path";

export let doc: vscode.TextDocument;
export let editor: vscode.TextEditor;
export let documentEol: string;
export let platformEol: string;

export async function initialize() {
  doc = await vscode.workspace.openTextDocument(mainUri);
  editor = await vscode.window.showTextDocument(doc);
}

export async function activate(docUri: vscode.Uri) {
  // The extensionId is `publisher.name` from package.json
  const ext = vscode.extensions.getExtension(
    "EmileRolley.publicodes-language-server",
  )!;
  if (!ext.isActive) {
    await ext.activate();
    try {
      await initialize();
    } catch (e) {
      console.error(e);
    }
  }
  const content = await vscode.workspace.fs.readFile(docUri);
  await setTestContent(content.toString());
  await vscode.workspace.saveAll();
  await sleep(500); // Wait for server activation
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const getDocPath = (p: string) => {
  return path.resolve(__dirname, "../../testFixture", p);
};

export const getDocUri = (p: string) => {
  return vscode.Uri.file(getDocPath(p));
};

export const mainPath = "main.publicodes";
export const mainUri = getDocUri(mainPath);

export async function setTestContent(content: string): Promise<boolean> {
  const all = new vscode.Range(
    doc.positionAt(0),
    doc.positionAt(doc.getText().length),
  );
  return editor.edit((eb) => eb.replace(all, content));
}
