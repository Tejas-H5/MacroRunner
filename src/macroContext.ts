import * as vscode from "vscode";
import EditableFile from "./editableFile";

class MacroContext {
    private document: vscode.TextDocument;
    private files: [EditableFile];

    constructor(editor: vscode.TextEditor) {
        this.document = editor.document;
        this.files = [new EditableFile(this.document.getText())];
    }

    newFile(text="") {
        const newFile = new EditableFile(text);
        this.files.push(newFile);
        return newFile;
    }

    getFile(index=0) {
        return this.files[index];
    }

    fileCount() {
        return this.files.length;
    }

    removeOtherFiles() {
        this.files = [this.files[0]];
    }

    removeFile(handle: number) {
        return this.files.splice(handle, 1);
    }
}

export default MacroContext;
