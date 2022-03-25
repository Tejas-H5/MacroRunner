import * as vscode from "vscode";
import DebugContext from "./debugContext";
import { createIntervalTimeoutFunctions } from "./intervalTimeout";
import MacroContext from "./macroContext";
import macroTemplate from "./macroTemplate";
import { replaceAllFile, showErrors } from "./macroUtil";
import { containsWhileLoop } from "./sourceUtil";

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
};

const runMacroCommand = async () => {
    let visibleEditors = vscode.window.visibleTextEditors;

    if (visibleEditors.length !== 2 || !visibleEditors[0].document || !visibleEditors[1].document) {
        vscode.window
            .showErrorMessage(`This command needs exactly two editors to be open in a split configuration 
        - one with the javascript macro and another with the target document. Create a new macro with the New macro command`);
        return;
    }

    let activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        vscode.window.showErrorMessage(`The macro editor must have focus for this command to run`);
        return;
    }

    let macroDocument = activeEditor.document;
    if (macroDocument.languageId !== "javascript") {
        vscode.window.showErrorMessage(`Error`, {
            detail: "The macro window must have JavaScript code. Are you sure this is the correct window?",
        });
        return;
    }

    let code = macroDocument.getText();
    if (!code.substring(0, code.indexOf("\n")).toLowerCase().includes("macro")) {
        vscode.window.showErrorMessage(
            `The first line of the macro must contain the word 'macro' somewhere in it, possibly in a comment. Are you sure this is the correct window?`
        );
        return;
    }

    if (containsWhileLoop(code)) {
        // wait for the user to close the warning before we proceed
        await vscode.window.showWarningMessage(
            `I strongly recommend against using while loops in your code, as this extension has no way to break out infinite loops at the moment. 
If you aren't very sure that this code won't hang, ready up a Task Manager or command shell to kill this process and then close this popup.`,
            { modal: true }
        );
    }

    // prepare objects to feed to the macro
    const targetEditorIndex = activeEditor === visibleEditors[0] ? 1 : 0;
    const targetEditor = visibleEditors[targetEditorIndex];
    const targetEditorLanguage = targetEditor.document.languageId;
    const initialDocument = targetEditor.document;
    const ctx = new MacroContext(targetEditor);
    const debug = new DebugContext();
    const timerContainer = createIntervalTimeoutFunctions();

    const allInjectedFunctions = [...timerContainer.functions];

    // actually run the macro
    try {
        const macroFunction = Function(`
            "use strict";
            return (async (context, debug, ${allInjectedFunctions.map((o) => o.name).join(",")}) => {
                ${code}
            });`)();
        await macroFunction(ctx, debug, ...allInjectedFunctions);
    } catch (e: any) {
        showErrors(e);
        return;
    }

    // wait for all the async stuff to finish, so that the code there is still able to throw exceptions
    await timerContainer.joinAll();

    //apply all changes that need to be applied

    // update the current text file if we had any outputs
    const newFile = ctx.getFile(0);

    if (newFile.getText() !== "") {
        await replaceAllFile(newFile, initialDocument, targetEditor.viewColumn, true);
    }

    // create and update all non-empty output files
    for (let i = 1; i < ctx.fileCount(); i++) {
        if (ctx.getFile(i).getText() === "") continue;
        let newDocument = await vscode.workspace.openTextDocument({
            content: "",
            language: targetEditorLanguage,
        });

        await replaceAllFile(ctx.getFile(i), newDocument, targetEditor.viewColumn, true);
    }
};

export function activate(context: vscode.ExtensionContext) {
    console.log("Macro runner extension is now active!");

    context.subscriptions.push(vscode.commands.registerCommand("macrorunner.newMacro", newMacroCommand));
    context.subscriptions.push(vscode.commands.registerCommand("macrorunner.runMacro", runMacroCommand));
}

export function deactivate() {}
