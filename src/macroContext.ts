import * as vscode from "vscode";
import * as path from "path";
import EditableFile from "./editableFile";
import { assertType } from "./sourceUtil";

class MacroContext {
    private files: EditableFile[];
    public rootDir: string | undefined;
    private firstEditor: vscode.TextEditor;

    constructor(editor: vscode.TextEditor) {
        this.firstEditor = editor;

        let editableFile = new EditableFile(editor.document.getText(), editor);
        const document = editableFile.document;
        if (document) {
            editableFile.selectedRanges = editor.selections.map((s) => [
                document.offsetAt(s.start),
                document.offsetAt(s.end),
            ]);
        }

        this.files = [editableFile];

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

    getFile(name: string | undefined = undefined) {
        if (!name) {
            return this.files[0];
        }

        // TODO: get a file by name, and open it in the editor. the logic for
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
    async outputImmediate() {
        // TODO: apply all changes now.

        const index = 0;
        assertType(index, "number");

        this.files[index].applyChanges();
    }

    applyChanges = async () => {
        const targetEditorLanguage = this.firstEditor.document.languageId;

        // create and update all non-empty output files
        for (let i = 0; i < this.files.length; i++) {
            const changes = this.files[i];

            changes.applyChanges();
        }
    };
}

export default MacroContext;
