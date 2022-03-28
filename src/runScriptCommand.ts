import * as vscode from "vscode";
import DebugContext, { showErrors } from "./logging";
import ScriptContext from "./scriptContext";
import { createIntervalTimeoutFunctions } from "./intervalTimeout";
import { replaceAllFile } from "./textEditorUtil";
import { containsWhileLoop } from "./sourceUtil";

export const runScriptCommand = async () => {
    try {
        const scriptEditor = getEditorWithScriptFile();
        const targetEditor = getEditorWithTargetFile(scriptEditor);

        const executionResult = await runScript(scriptEditor, targetEditor);

        if (!executionResult) {
            return;
        }

        await applyScriptContextResult(executionResult, targetEditor);
    } catch (err: any) {
        vscode.window.showErrorMessage(err.message);
    }
};

export const getEditorWithScriptFile = () => {
    let visibleEditors = vscode.window.visibleTextEditors;
    let scriptEditors = visibleEditors.filter((editor) => {
        const code = editor.document.getText();
        const firstLine = code.indexOf("\n") === -1 ? code : code.substring(0, code.indexOf("\n"));
        const containsSafetyCatch = firstLine.toLowerCase().includes("script");

        return containsSafetyCatch;
    });

    if (scriptEditors.length === 0) {
        throw new Error(
            "Make sure your script has the word 'script' somewhere on the first line (this is a safety catch), or that you have the right file visible"
        );
    }

    if (scriptEditors.length > 1) {
        throw new Error(
            "Found multiple scripts, make sure that only the script you want to run is visible."
        );
    }

    // sometimes copy-pasted script code can resolve to c/c++
    if (scriptEditors[0].document.languageId !== "javascript") {
        vscode.languages.setTextDocumentLanguage(scriptEditors[0].document, "javascript");
    }

    return scriptEditors[0];
};

const getEditorWithTargetFile = (scriptEditor: vscode.TextEditor) => {
    let editor = vscode.window.activeTextEditor;
    if (editor && editor !== scriptEditor) return editor;

    const visibleEditors = vscode.window.visibleTextEditors;
    let visibleTextEditors = new Array<vscode.TextEditor>();

    for (const visibleEditor of visibleEditors) {
        // todo: check if editor is actually readonly
        if (true) {
            visibleTextEditors.push(visibleEditor);
        }
    }

    if (visibleEditors.length === 2 || editor === undefined) {
        return visibleEditors[0] === scriptEditor ? visibleEditors[1] : visibleEditors[0];
    } else {
        throw new Error(
            "When you have more than two other editors open, bring focus to the one you want to run the script in"
        );
    }
};

const runScript = async (scriptEditor: vscode.TextEditor, targetEditor: vscode.TextEditor) => {
    const code = scriptEditor.document.getText();
    if (containsWhileLoop(code)) {
        // wait for the user to close the warning before proceeding anyway
        await vscode.window.showWarningMessage(
            `I strongly recommend against using while loops in your code, as this extension has no way to break out infinite loops at the moment. 
If you aren't very sure that this code won't hang, ready up a Task Manager or command shell to kill this process and then close this popup.`,
            { modal: true }
        );
    }

    // prepare objects to feed to the script
    const ctx = new ScriptContext(targetEditor);
    const debug = new DebugContext();
    const timerContainer = createIntervalTimeoutFunctions();
    const allInjectedFunctions = [...timerContainer.functions];

    // actually run the script
    try {
        const scriptFunction = Function(`
          "use strict";
          return (async (context, debug, ${allInjectedFunctions.map((o) => o.name).join(",")}) => {
              ${code}
          });`)();
        await scriptFunction(ctx, debug, ...allInjectedFunctions);
    } catch (e: any) {
        showErrors(e);
        return;
    }

    // await all the timers to finish, so that the code there still has access to the vscode debugger and can
    // create error modals
    await timerContainer.joinAll();

    return ctx;
};

const applyScriptContextResult = async (ctx: ScriptContext, targetEditor: vscode.TextEditor) => {
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
