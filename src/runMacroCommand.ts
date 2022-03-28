import * as vscode from "vscode";
import DebugContext, { showErrors } from "./logging";
import MacroContext from "./macroContext";
import { createIntervalTimeoutFunctions } from "./intervalTimeout";
import { replaceAllFile } from "./textEditorUtil";
import { containsWhileLoop } from "./sourceUtil";

export const runMacroCommand = async () => {
    try {
        const macroEditor = getEditorWithMacroFile();
        const targetEditor = getEditorWithTargetFile(macroEditor);

        const executionResult = await runMacro(macroEditor, targetEditor);

        if (!executionResult) {
            return;
        }

        await applyMacroContextResult(executionResult, targetEditor);
    } catch (err: any) {
        vscode.window.showErrorMessage(err.message);
    }
};

export const getEditorWithMacroFile = () => {
    let visibleEditors = vscode.window.visibleTextEditors;
    let macroEditors = visibleEditors.filter((editor) => {
        const code = editor.document.getText();
        const containsSafetyCatch = code.startsWith("// macro");

        return containsSafetyCatch;
    });

    if (macroEditors.length === 0) {
        throw new Error(
            "Make sure your macro starts with '// macro' (this is a safety catch), or that you have the right file visible"
        );
    }

    if (macroEditors.length > 1) {
        throw new Error(
            "Found multiple macros, make sure that only the macro you want to run is visible."
        );
    }

    // sometimes copy-pasted macro code can resolve to c/c++
    if (macroEditors[0].document.languageId !== "javascript") {
        vscode.languages.setTextDocumentLanguage(macroEditors[0].document, "javascript");
    }

    return macroEditors[0];
};

const getEditorWithTargetFile = (macroEditor: vscode.TextEditor) => {
    let editor = vscode.window.activeTextEditor;
    if (editor && editor !== macroEditor) return editor;

    const visibleEditors = vscode.window.visibleTextEditors;
    let visibleTextEditors = new Array<vscode.TextEditor>();

    for (const visibleEditor of visibleEditors) {
        // todo: check if editor is actually readonly
        if (true) {
            visibleTextEditors.push(visibleEditor);
        }
    }

    if (visibleEditors.length === 2 || editor === undefined) {
        return visibleEditors[0] === macroEditor ? visibleEditors[1] : visibleEditors[0];
    } else {
        throw new Error(
            "When you have more than two other editors open, bring focus to the one you want to run the macro in"
        );
    }
};

const runMacro = async (macroEditor: vscode.TextEditor, targetEditor: vscode.TextEditor) => {
    const code = macroEditor.document.getText();
    if (containsWhileLoop(code)) {
        // wait for the user to close the warning before proceeding anyway
        await vscode.window.showWarningMessage(
            `I strongly recommend against using while loops in your code, as this extension has no way to break out infinite loops at the moment. 
If you aren't very sure that this code won't hang, ready up a Task Manager or command shell to kill this process and then close this popup.`,
            { modal: true }
        );
    }

    // prepare objects to feed to the macro
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

    // await all the timers to finish, so that the code there still has access to the vscode debugger and can
    // create error modals
    await timerContainer.joinAll();

    return ctx;
};

const applyMacroContextResult = async (ctx: MacroContext, targetEditor: vscode.TextEditor) => {
    // update the current text file if we had any outputs
    const targetEditorLanguage = targetEditor.document.languageId;
    const initialDocument = targetEditor.document;

    // create and update all non-empty output files
    for (let i = 0; i < ctx.fileCount(); i++) {
        if (ctx.getFile(i).text === "") continue;

        let document: vscode.TextDocument;
        if (i === 0) {
            document = initialDocument;
        } else {
            document = await vscode.workspace.openTextDocument({
                content: "",
                language: targetEditorLanguage,
            });
        }

        const changes = ctx.getFile(i);
        await replaceAllFile(changes, document, targetEditor.viewColumn, true);

        const selections = changes.newSelectedRanges.map((range) => {
            return new vscode.Selection(
                document.positionAt(range[0]),
                document.positionAt(range[1])
            );
        });
        targetEditor.selections = selections;
    }
};
