import * as vscode from "vscode";

class DebugContext {
    constructor() {}

    log(...messages: any) {
        console.log(...messages);
    }

    async info(message: any) {
        await vscode.window.showInformationMessage(`${message}`);
    }

    async error(message: any) {
        await vscode.window.showErrorMessage(`${message}`);
    }
}

export default DebugContext;
