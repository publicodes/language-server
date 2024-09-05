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

  // TODO: implement correct test
  // test("Complete in expressions", async () => {
  //   await testCompletion(docUri, new vscode.Position(11, 12), false, [
  //     ruleItem("rule a"),
  //     ruleItem("b"),
  //     ruleItem("c"),
  //   ]);
  // });
});

async function testCompletion(
  docUri: vscode.Uri,
  position: vscode.Position,
  shouldBeEmpty: boolean,
  expectedRulesCompletionItems?: vscode.CompletionItem[],
) {
  await activate(docUri);

  // Executing the command `vscode.executeCompletionItemProvider` to simulate triggering completion
  const actualCompletionList = (await vscode.commands.executeCommand(
    "vscode.executeCompletionItemProvider",
    docUri,
    position,
  )) as vscode.CompletionList;

  if (shouldBeEmpty) {
    assert.ok(actualCompletionList.items.length === 0);
  } else {
    assert.ok(actualCompletionList.items.length > 0);
    const actualRulesCompletionItems = actualCompletionList.items.filter(
      (item) => {
        return (
          item.kind !== vscode.CompletionItemKind.Property &&
          item.kind !== vscode.CompletionItemKind.Keyword
        );
      },
    );
    console.log(actualRulesCompletionItems);
    console.log(expectedRulesCompletionItems);
    assert.ok(
      actualRulesCompletionItems.length ===
        expectedRulesCompletionItems?.length,
    );
    expectedRulesCompletionItems?.forEach((expectedItem, i) => {
      const actualItem = actualRulesCompletionItems[i];
      assert.equal(actualItem.label, expectedItem.label);
      assert.equal(actualItem.kind, expectedItem.kind);
    });
  }
}

function ruleItem(label: string): vscode.CompletionItem {
  return new vscode.CompletionItem(label, vscode.CompletionItemKind.Function);
}
