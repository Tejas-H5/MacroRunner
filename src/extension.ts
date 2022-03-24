import * as vscode from "vscode";
import DebugContext from "./debugContext";
import EditableFile, { injectedFunctions } from "./editableFile";
import MacroContext from "./macroContext";
import macroTemplate from "./macroTemplate";
import { replaceAllFile } from "./macroUtil";
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

const compactStack = (stack: string) => {
    let earlyCutoff = stack.indexOf("at eval (eval at runMacroCommand");
    stack = stack.substring(0, earlyCutoff);
    stack += "\n  <The rest of the stack is internal to the macroRunner codebase and not relevant>";
    stack = stack.replace(/\w+:.+\\/g, ".../");
    stack = stack.replace(/\t/g, "    ");
    return stack;
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
        vscode.window.showWarningMessage(
            "I strongly recommend against using while loops in your code, as this extension has no way to break out infinite loops at the moment. Have task-manager or similar on hand just in case",
            { modal: true }
        );
    }

    // actually run the macro
    let targetEditorIndex = activeEditor === visibleEditors[0] ? 1 : 0;
    let targetEditor = visibleEditors[targetEditorIndex];
    let targetEditorLanguage = targetEditor.document.languageId;

    let ctx = new MacroContext(targetEditor);
    let debug = new DebugContext();

    try {
        const macroFunction = Function(`
"use strict";
return (async (context, debug, ${injectedFunctions.map((o) => o.name).join(",")}) => {
${code}
});`)();

        await macroFunction(ctx, debug, ...injectedFunctions);
    } catch (e: any) {
        vscode.window.showErrorMessage("Error: " + e.message, {
            modal: true,
            detail: compactStack(e.stack),
        });

        //vscode.window.showErrorMessage("Error: " + e.message + "\n" + compactStack(e.stack));
        return;
    }

    // apply all results
    const newFile = ctx.getFile(0);
    await replaceAllFile(newFile, targetEditor);

    let targetColumn = targetEditor.viewColumn;
    // create all new files
    for (let i = 1; i < ctx.fileCount(); i++) {
        // TODO: work around the bug [edit not possible on closed editors], as this doesnt allow for
        // intermediate states
        let newDocument = await vscode.workspace.openTextDocument({
            content: " ", //ctx.getFile(i).text,
            language: targetEditorLanguage,
        });

        visibleEditors = vscode.window.visibleTextEditors;
        await vscode.window.showTextDocument(newDocument, targetColumn, true).then(async (textEditor) => {
            await replaceAllFile(ctx.getFile(i), textEditor);
        });
    }
};

export function activate(context: vscode.ExtensionContext) {
    console.log("Macro runner extension is now active!");

    context.subscriptions.push(vscode.commands.registerCommand("macrorunner.newMacro", newMacroCommand));
    context.subscriptions.push(vscode.commands.registerCommand("macrorunner.runMacro", runMacroCommand));
}

export function deactivate() {}
