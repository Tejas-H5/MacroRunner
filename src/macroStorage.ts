import { TextDecoder, TextEncoder } from "util";
import * as vscode from "vscode";

import { getMacroURI } from "./extension";
import { findAvailableEditors, findMacroEditor, findTargetEditor } from "./editorFinding";
import { HardError, handleErrors } from "./logging";
import { defaultMacro, defaultMacroCursorIndex } from "./macroTemplates";
import { runMacro } from "./runMacroCommand";

export const openMacrosDirCommand = async () =>
    handleErrors(async () => {
        const dir = getMacroURI();
        vscode.commands.executeCommand("revealFileInOS", dir);
    });

const getSavedMacroNames = async () => {
    const dir = getMacroURI();
    const dirContents = await vscode.workspace.fs.readDirectory(dir);
    const files = dirContents.filter((c) => c[1] === vscode.FileType.File).map((c) => c[0]);
    return files;
};

const quickPickSavedMacro = async (inputTitle: string): Promise<string> => {
    const savedMacrosNamed = await getSavedMacroNames();
    if (savedMacrosNamed.length === 0) {
        throw new HardError("You haven't saved any macros with the Save Macro command yet");
    }

    const input = await vscode.window.showQuickPick(savedMacrosNamed, {
        title: inputTitle,
        matchOnDescription: true,
        matchOnDetail: true,
    });
    if (!input) {
        throw new HardError("command aborted");
    }

    return input;
};

export const saveMacroCommand = async () =>
    handleErrors(async () => {
        const dir = getMacroURI();

        let editor = findMacroEditor();
        const document = editor.document;

        let fileName = await vscode.window.showInputBox({
            title: "Name this macro:",
        });
        if (!fileName) {
            return;
        }
        if (!fileName.toLowerCase().endsWith(".js")) {
            fileName += ".js";
        }

        // no one-liner to save-as, so we are going to write a new file,
        // close the existing one, then load the file we just wrote
        const filepath = vscode.Uri.joinPath(dir, fileName);
        const text = document.getText();
        const textBytes = new TextEncoder().encode(text);
        await vscode.workspace.fs.writeFile(filepath, textBytes);

        if (document.isUntitled) {
            // no clean way to close an untitled document, so we are just going to
            // replace with nothing so that we can bypass the 'do you want to save?' warning

            await editor.edit((editBuilder) => {
                editBuilder.delete(
                    new vscode.Range(new vscode.Position(0, 0), document.positionAt(text.length))
                );
            });

            await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
        }

        await loadMacro(fileName);
    });

const loadMacroText = async (macroName: string) => {
    const dir = getMacroURI();
    const fileURI = vscode.Uri.joinPath(dir, macroName);
    const fileBytes = await vscode.workspace.fs.readFile(fileURI);
    const fileText = new TextDecoder().decode(fileBytes);

    return fileText;
};

const loadMacro = async (macroName: string) => {
    const macroText = await loadMacroText(macroName);
    await openMacroTextInAdjacentColumn(macroText);
    vscode.window.showInformationMessage("Loaded " + macroName);
};

export const loadMacroCommand = async () =>
    handleErrors(async () => {
        const input = await quickPickSavedMacro("Pick a macro to load");
        await loadMacro(input);
    });

export const runSavedMacroCommand = async () =>
    handleErrors(async () => {
        const input = await quickPickSavedMacro("Pick a macro to run");
        if (!input) {
            return;
        }

        const macroText = await loadMacroText(input);
        const targetEditor = findTargetEditor();

        await runMacro(macroText, targetEditor);
    });

export const removeMacroCommand = async () =>
    handleErrors(async () => {
        const dir = getMacroURI();

        const input = await quickPickSavedMacro("pick a macro to delete");

        const answer = await vscode.window.showWarningMessage(
            "Are you sure you want to delete the macro " + input + " ?",
            { modal: true },
            "Yes",
            "No"
        );

        if (answer !== "Yes") {
            return;
        }

        await vscode.workspace.fs.delete(vscode.Uri.joinPath(dir, input), {
            useTrash: true,
        });

        await vscode.window.showInformationMessage("Deleted " + input);
    });

const getAdjacentColumn = () => {
    let visibleEditors = findAvailableEditors();
    if (visibleEditors.length === 0) {
        // No editors open currently, just open in the active column.
        // Not all macros are necessarily for analysing the currently open file, we may want to write something
        // to quickly look over all files in the workspace, so it makes sense to allow this
        return vscode.ViewColumn.Active;
    }

    if (visibleEditors.length === 1) {
        // We can just open a macro next to the sole editor
        return vscode.ViewColumn.Beside;
    }

    const activeTextEditor = vscode.window.activeTextEditor;
    if (activeTextEditor && activeTextEditor.viewColumn) {
        // Open the macro in one of the existing columns, hoping that it is next to the one we want.
        return (activeTextEditor.viewColumn % visibleEditors.length) + 1;
    }

    return vscode.ViewColumn.Active;
};

const openMacroTextInAdjacentColumn = async (
    text: string,
    initialCursorIndex: number | undefined = undefined
) => {
    const column = getAdjacentColumn();

    let document = await vscode.workspace.openTextDocument({
        content: text,
        language: "javascript",
    });

    const editor = await vscode.window.showTextDocument(document, column);
    if (initialCursorIndex === undefined) {
        initialCursorIndex = editor.document.getText().length - 1;
    }

    editor.selection = new vscode.Selection(
        editor.document.positionAt(initialCursorIndex),
        editor.document.positionAt(initialCursorIndex)
    );
};

export const newMacroCommand = async () =>
    handleErrors(async () => {
        await openMacroTextInAdjacentColumn(defaultMacro, defaultMacroCursorIndex);
    });
