import * as vscode from "vscode";
import EditableFile from "./editableFile";

export const replaceAll = async (
    text: any,
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
                    edit.replace(all, text.toString());
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

    await replaceAll(file.text, document, column, undo);
};
