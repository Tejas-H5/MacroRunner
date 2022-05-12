import * as vscode from "vscode";
import DebugContext, { showErrors, SoftError } from "./logging";
import MacroContext from "./macroContext";
import { createIntervalTimeoutFunctions } from "./intervalTimeout";
import { replaceAllFile } from "./textEditorUtil";
import { containsWhileLoop } from "./sourceUtil";
import { findMacroEditor, findTargetEditor } from "./editorFinding";
import { TextDecoder, TextEncoder } from "util";
import * as stringUtil from "./stringUtil";
import { input } from "./input";

export const runMacroCommandWithFilePicker = async () => {
    try {
        const macroEditor = findMacroEditor();
        const macroCode = macroEditor.document.getText();

        const data = await osFileOpener(getDefaultURI());
        if (!data) return;

        const initialText = new TextDecoder().decode(data);

        const newDocument = await vscode.workspace.openTextDocument({
            language: "text",
            content: "",
        });

        const targetEditor = await vscode.window.showTextDocument(newDocument);

        await runMacro(macroCode, targetEditor, initialText);

        vscode.window.showInformationMessage(
            "VSCode extensions can't non-destructively edit anything larger than 50mb in size, so the output will go to a new untitled document for now. " +
                "For some reason, if the document is untitled, you can still use the normal Run Macro command on it even though it has the same amount of text. "
        );
    } catch (err: any) {
        vscode.window.showErrorMessage(err.message);
    }
};

const getDefaultURI = () => {
    let uri = undefined;
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0]) {
        uri = vscode.workspace.workspaceFolders[0].uri;
    }

    return uri;
};

const osFileOpener = async (uri: vscode.Uri | undefined) => {
    if (!uri) return;

    const files = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        defaultUri: uri,
    });

    if (!files || files.length === 0) {
        return;
    }

    const bytes = await vscode.workspace.fs.readFile(files[0]);
    return bytes;
};

export const runMacroCommand = async () => {
    try {
        const macroEditor = findMacroEditor();
        const targetEditor = findTargetEditor(macroEditor);
        const macroSource = macroEditor.document.getText();

        await runMacro(macroSource, targetEditor);
    } catch (err: any) {
        vscode.window.showErrorMessage(err.message);
    }
};

export const runMacro = async (
    code: string,
    targetEditor: vscode.TextEditor,
    targetText: string | undefined = undefined
) => {
    if (containsWhileLoop(code)) {
        // wait for the user to close the warning before proceeding anyway
        await vscode.window.showWarningMessage(
            `I strongly recommend against using while loops in your code, as this extension has no way to break out infinite loops at the moment. 
If you aren't very sure that this code won't hang, ready up a Task Manager or command shell to kill this process and then close this popup.`,
            { modal: true }
        );
    }

    // prepare objects to feed to the macro
    let executionResult = new MacroContext(targetEditor, targetText);

    const debug = new DebugContext();
    const timerContainer = createIntervalTimeoutFunctions();
    const allInjectedFunctions = [
        ...timerContainer.functions,
        ...stringUtil.stringUtilFunctions,
        input,
    ];

    // actually run the macro
    try {
        const macroSource = `
"use strict";
return (async (context, debug, require, ${allInjectedFunctions.map((o) => o.name).join(",")}) => {
    ${code}
});`;

        const macroFunction = Function(macroSource)();
        await macroFunction(executionResult, debug, require, ...allInjectedFunctions);
    } catch (e: any) {
        if (e instanceof SoftError) {
            debug.info(e.message);
        } else {
            showErrors(e);
        }

        return;
    }

    // await all the timers to finish, so that the code there still has access to the vscode debugger and can
    // create error modals
    await timerContainer.joinAll();

    await applyMacroContextResult(executionResult, targetEditor);
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

        const filteredSelectedRanges = new Array<[number, number]>();
        for (const range of changes.selectedRanges) {
            if (!range) continue;

            filteredSelectedRanges.push(range);
        }

        const vscodeSelections = filteredSelectedRanges.map((range) => {
            return new vscode.Selection(
                document.positionAt(range[0]),
                document.positionAt(range[1])
            );
        });

        targetEditor.selections = vscodeSelections;
    }
};
