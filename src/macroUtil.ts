import * as vscode from "vscode";
import EditableFile from "./editableFile";

export const replaceAll = async (text: string, targetEditor: vscode.TextEditor, undo: boolean=false) => {
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
};

export const replaceAllFile = async (
    file: EditableFile,
    targetEditor: vscode.TextEditor,
    undo: boolean = true
) => {
    if (undo) {
        for (let i = 0; i < file.intermediateStates.length; i++) {
            await replaceAll(file.intermediateStates[i], targetEditor, true);
        }
    }

    await replaceAll(file.getText(), targetEditor, undo);
};
