import * as vscode from "vscode";
import EditableFile from "./editableFile";
import { replaceAll, replaceAllFile } from "./macroUtil";

class MacroContext {
    private editor: vscode.TextEditor;
    private document: vscode.TextDocument;
    private files: EditableFile[];

    readonly initialSelectedRanges: number[][];
    readonly initialSelectedPositions: number[];

    constructor(editor: vscode.TextEditor) {
        this.document = editor.document;
        this.files = [new EditableFile(this.document.getText())];
        this.editor = editor;
        this.initialSelectedRanges = editor.selections.map((s) => [
            this.document.offsetAt(s.start),
            this.document.offsetAt(s.end),
        ]);

        this.initialSelectedPositions = this.initialSelectedRanges.map((x) => x[0]);
    }

    newFile(text = "") {
        const newFile = new EditableFile(text);
        this.files.push(newFile);
        return newFile;
    }

    getFile(index = 0) {
        if (index < 0 || index >= this.files.length)
            throw new Error(
                "Index " +
                    index +
                    " is not a valid file, as there are only " +
                    this.fileCount() +
                    " files available"
            );

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

    // users can await this if they want, but they really don't need to
    async outputImmediate(handle: number = 0) {
        replaceAll(this.getFile(handle).getText(), this.document, this.editor.viewColumn, false);
    }
}

export default MacroContext;
