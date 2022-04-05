import * as vscode from "vscode";
import EditableFile from "./editableFile";
import { replaceAll } from "./textEditorUtil";
import { assertType } from "./sourceUtil";

class MacroContext {
    private editor: vscode.TextEditor;
    private document: vscode.TextDocument;
    private files: EditableFile[];

    readonly initialSelectedRanges: [number, number][];

    constructor(editor: vscode.TextEditor, initialText: string | undefined = undefined) {
        this.document = editor.document;

        if (initialText === undefined) {
            this.files = [new EditableFile(this.document.getText())];
        } else {
            this.files = [new EditableFile(initialText)];
        }

        this.editor = editor;
        this.initialSelectedRanges = editor.selections.map((s) => [
            this.document.offsetAt(s.start),
            this.document.offsetAt(s.end),
        ]);
    }

    newFile(text: any = "") {
        assertType(text, "string");

        const newFile = new EditableFile(text);
        this.files.push(newFile);
        return newFile;
    }

    getFile(index: any = 0) {
        assertType(index, "number");

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
