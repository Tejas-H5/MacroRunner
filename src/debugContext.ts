import * as vscode from "vscode";

class DebugContext {
    constructor() {

    }
    
    log(...messages: any) {
        console.log(...messages);
    }

    async info(message: any, ...items: any[]) {
        await vscode.window.showInformationMessage(`${message}`, ...items.map(item => `${item}`));
    }

    async error(message: any, ...items: any[]) {
        await vscode.window.showErrorMessage(`${message}`, ...items.map(item => `${item}`));
    }
}

export default DebugContext;