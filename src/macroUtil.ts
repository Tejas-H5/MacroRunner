import * as vscode from "vscode";
import EditableFile from "./editableFile";

export const replaceAll = async (
    text: string,
    document: vscode.TextDocument,
    targetColumn: number | undefined,
    undo: boolean
) => {
    await vscode.window
        .showTextDocument(document, targetColumn, true)
        .then(async (targetEditor) => {
            await targetEditor.edit(
                (edit) => {
                    const all = new vscode.Range(
                        new vscode.Position(0, 0),
                        targetEditor.document.positionAt(targetEditor.document.getText().length)
                    );
                    edit.replace(all, text);
                },
                {
                    undoStopBefore: undo,
                    undoStopAfter: undo,
                }
            );
        });
};

export const replaceAllFile = async (
    file: EditableFile,
    document: vscode.TextDocument,
    column: vscode.ViewColumn | undefined,
    undo: boolean = true
) => {
    if (undo) {
        for (let i = 0; i < file.intermediateStates.length; i++) {
            await replaceAll(file.intermediateStates[i], document, column, undo);
        }
    }

    await replaceAll(file.getText(), document, column, undo);
};

export const compactStack = (stack: string) => {
    let earlyCutoff = stack.indexOf("at eval (eval at runMacroCommand");
    stack = stack.substring(0, earlyCutoff);
    stack += "\n  <The rest of the stack is internal to the macroRunner codebase and not relevant>";
    stack = stack.replace(/\w+:.+\\/g, ".../");
    stack = stack.replace(/\t/g, "    ");
    return stack;
};

export const showErrors = (err: any) => {
    vscode.window.showErrorMessage("Error: " + err.message, {
        modal: true,
        detail: compactStack(err.stack),
    });
};
