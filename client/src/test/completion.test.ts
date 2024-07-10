/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from "vscode";
import * as assert from "assert";
import { getDocUri, activate } from "./helper";

suite("Should do completion", () => {
  const docUri = getDocUri("completion.publicodes");

  test("Don't complete in meta values", async () => {
    await testCompletion(docUri, new vscode.Position(1, 11), true);
    await testCompletion(docUri, new vscode.Position(1, 19), true);
    await testCompletion(docUri, new vscode.Position(7, 8), true);
    await testCompletion(docUri, new vscode.Position(7, 20), true);
  });

  test("Complete in expressions", async () => {
    await testCompletion(docUri, new vscode.Position(2, 18), false);
  });
});

async function testCompletion(
  docUri: vscode.Uri,
  position: vscode.Position,
  shouldBeEmtpy: boolean,
  // expectedCompletionList?: vscode.CompletionList,
) {
  await activate(docUri);

  // Executing the command `vscode.executeCompletionItemProvider` to simulate triggering completion
  const actualCompletionList = (await vscode.commands.executeCommand(
    "vscode.executeCompletionItemProvider",
    docUri,
    position,
  )) as vscode.CompletionList;

  if (shouldBeEmtpy) {
    assert.ok(actualCompletionList.items.length === 0);
  } else {
    assert.ok(actualCompletionList.items.length > 0);
    // assert.ok(
    //   actualCompletionList.items.length === expectedCompletionList.items.length,
    // );
    // expectedCompletionList.items.forEach((expectedItem, i) => {
    //   const actualItem = actualCompletionList.items[i];
    //   assert.equal(actualItem.label, expectedItem.label);
    //   assert.equal(actualItem.kind, expectedItem.kind);
    // });
  }
}
