import * as vscode from "vscode";

import { assertString } from "./sourceUtil";

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

const replaceAllFile = async (
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

export default class EditableFile {
    text: string;
    intermediateStates: string[];
    selectedRanges: ([number, number] | null)[];
    editor: vscode.TextEditor | undefined;
    document: vscode.TextDocument | undefined;

    constructor(text: string, editor: vscode.TextEditor | undefined = undefined) {
        this.text = text;
        this.intermediateStates = new Array<string>();
        this.selectedRanges = new Array<[number, number]>();

        this.editor = editor;
        if (editor) {
            this.document = editor.document;
        }
    }

    setText(newText: string) {
        assertString(newText);
        this.text = newText;
    }

    markUndoPoint() {
        this.intermediateStates.push(this.text);
    }

    async applyChanges(newDocLanguage: string | undefined = undefined) {
        let document = this.document;
        if (!document) {
            document = await vscode.workspace.openTextDocument({
                content: "",
                language: newDocLanguage,
            });

            this.document = document;
        }

        const column = this.editor?.viewColumn;

        await vscode.window.showTextDocument(document, column, true).then(async (targetEditor) => {
            const doc = document;
            if (!doc) {
                return;
            }

            this.editor = targetEditor;

            if (this.editor.document.getText() !== this.text) {
                await replaceAllFile(this, doc, targetEditor.viewColumn, true);
            }
        });

        if (document && this.editor) {
            const filteredSelectedRanges = new Array<[number, number]>();
            for (const range of this.selectedRanges) {
                if (!range) continue;

                filteredSelectedRanges.push(range);
            }
            const doc = document;
            const vscodeSelections = filteredSelectedRanges.map((range) => {
                return new vscode.Selection(doc.positionAt(range[0]), doc.positionAt(range[1]));
            });

            this.editor.selections = vscodeSelections;
        }
    }
}
