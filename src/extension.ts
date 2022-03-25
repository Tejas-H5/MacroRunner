//macro
import * as vscode from "vscode";
import DebugContext from "./debugContext";
import MacroContext, { InMemoryFile } from "./macroContext";
import macroTemplate from "./macroTemplate";
import macroUtil from "./macroUtil";

const newMacroCommand = async () => {
    let document = await vscode.workspace.openTextDocument({
        content: macroTemplate,
        language: "javascript",
    });

    let visibleEditors = vscode.window.visibleTextEditors;
    await vscode.window.showTextDocument(
        document,
        visibleEditors.length === 1 ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active
    );

    
    // Testing code
    // TODO: delete everything after and including these comments once we figure out a better way to test

    let targetEditor = visibleEditors[0] === vscode.window.activeTextEditor ? 1 : 0;
    let targetDocument = visibleEditors[targetEditor];
    targetDocument.edit((editBuilder) => {
        editBuilder.insert(
            document.positionAt(0),
            `
Here is a bunch of sample text. its quite good you see
for testing purposes and such,

for(int i = 0; i < 10; i++) {
    what even is this language tho.

    Why I m thinking this 10 times ? odd isnt it
}

Maybe should've gone with some lorem upsum doremi 
        `
        );
    });
};

const replaceAll = async (text: string, targetEditor: vscode.TextEditor) => {
    await targetEditor.edit((edit) => {
        const all = new vscode.Range(
            new vscode.Position(0, 0),
            targetEditor.document.positionAt(targetEditor.document.getText().length)
        );
        edit.replace(all, text);
    });
};

const replaceAllFile = async (file: InMemoryFile, targetEditor: vscode.TextEditor) => {
    for(let i = 0; i < file.intermediateStates.length; i++) {
        await replaceAll(file.intermediateStates[i], targetEditor);
    }

    await replaceAll(file.text, targetEditor)
};

const runMacroCommand = async () => {
    let visibleEditors = vscode.window.visibleTextEditors;

    if (visibleEditors.length !== 2 || !visibleEditors[0].document || !visibleEditors[1].document) {
        vscode.window
            .showErrorMessage(`This command needs exactly two editors to be open in a split configuration 
- one with the javascript macro and another with the target document. You currently have ${visibleEditors.length}.`);
        return;
    }

    let activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        vscode.window.showErrorMessage(`The macro editor must have focus for this command to run`);
        return;
    }

    let macroDocument = activeEditor.document;
    if (macroDocument.languageId !== "javascript") {
        vscode.window.showErrorMessage(
            `The macro window must have JavaScript code. Are you sure this is the correct window?`
        );
        return;
    }

    let code = macroDocument.getText();
    if (!code.substring(0, code.indexOf("\n")).toLowerCase().includes("macro")) {
        vscode.window.showErrorMessage(
            `The first line of the macro must contain the word 'macro' somewhere in it, possibly in a comment. Are you sure this is the correct window?`
        );
        return;
    }

    let targetEditorIndex = activeEditor === visibleEditors[0] ? 1 : 0;
    let success: boolean;
    let targetEditor = visibleEditors[targetEditorIndex];
    let targetEditorLanguage = targetEditor.document.languageId;

    // actually run the macro
    let ctx = new MacroContext(targetEditor);
    let debug = new DebugContext();
    let util = macroUtil;

    await Function(`"use strict";
    return (async (macroContext, debug, util) => {
        ${code}
    });`)()(ctx, debug, util);

    // apply all results
    const newFile = ctx.getFile(0);
    await replaceAllFile(newFile, targetEditor);

    let targetColumn = targetEditor.viewColumn;
    // create all new files
    for (let i = 1; i < ctx.fileCount(); i++) {
        // TODO: work around the bug [edit not possible on closed editors], as this doesnt allow for 
        // intermediate states
        let newDocument = await vscode.workspace.openTextDocument({
            content: ctx.getFile(i).text,
            language: targetEditorLanguage,
        });

        visibleEditors = vscode.window.visibleTextEditors;
        await vscode.window.showTextDocument(newDocument, targetColumn, true);
        //await replaceAllFile(, visibleEditors[targetEditorIndex]);
    }
};

export function activate(context: vscode.ExtensionContext) {
    console.log("Macro runner extension is now active!");

    context.subscriptions.push(vscode.commands.registerCommand("macrorunner.newMacro", newMacroCommand));
    context.subscriptions.push(vscode.commands.registerCommand("macrorunner.runMacro", runMacroCommand));
}

export function deactivate() {}
