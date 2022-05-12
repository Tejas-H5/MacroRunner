import * as vscode from "vscode";
import * as path from "path";
import EditableFile from "./editableFile";
import { replaceAll } from "./textEditorUtil";
import { assertType } from "./sourceUtil";

class MacroContext {
    private editor: vscode.TextEditor;
    private document: vscode.TextDocument;
    private files: EditableFile[];
    public rootDir: string | undefined;

    constructor(editor: vscode.TextEditor, initialText: string | undefined = undefined) {
        this.document = editor.document;

        let editableFile: EditableFile;
        if (initialText === undefined) {
            editableFile = new EditableFile(this.document.getText());
        } else {
            editableFile = new EditableFile(initialText);
        }

        editableFile.selectedRanges = editor.selections.map((s) => [
            this.document.offsetAt(s.start),
            this.document.offsetAt(s.end),
        ]);

        this.files = [editableFile];
        this.editor = editor;

        let rootDir: string | undefined = undefined;
        if (
            vscode.workspace.workspaceFolders !== undefined &&
            vscode.workspace.workspaceFolders.length > 0
        ) {
            rootDir = vscode.workspace.workspaceFolders[0].uri.fsPath;
        } else if (!editor.document.isUntitled) {
            rootDir = path.dirname(editor.document.uri.fsPath);
        }
    }

    newFile(text: any = "") {
        assertType(text, "string");

        const newFile = new EditableFile(text);
        this.files.push(newFile);
        return newFile;
    }

    fileCount() {
        return this.files.length;
    }

    removeOtherFiles() {
        this.files = [this.files[0]];
    }

    removeFile(index: any) {
        assertType(index, "number");

        return this.files.splice(index, 1);
    }

    // users can await this if they want, but they really don't need to
    async outputImmediate(index: number = 0) {
        assertType(index, "number");

        replaceAll(this.getFile(index).text, this.document, this.editor.viewColumn, false);
    }
}

export default MacroContext;
