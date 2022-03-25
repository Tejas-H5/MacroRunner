import * as vscode from "vscode";

export class InMemoryFile {
    // directly get and set this
    text:string;
    // use this for debug purposes. All of these edits will be sequentially applied before the final one, so that you can
    // use redo and undo to preview them
    intermediateStates: string[]

    constructor(text:string) {
        this.text = text;
        this.intermediateStates = new Array<string>();
    }

    pushIntermediateState() {
        this.intermediateStates.push(this.text);
    }
}

class MacroContext {
    private document: vscode.TextDocument;
    private files: [InMemoryFile];

    constructor(editor: vscode.TextEditor) {
        this.document = editor.document;
        this.files = [new InMemoryFile(this.document.getText())];
    }

    newFile(text="") {
        const newFile = new InMemoryFile(text);
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
