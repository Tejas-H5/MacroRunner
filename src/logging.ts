import * as vscode from "vscode";

export default class DebugContext {
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

export const compactStack = (stack: string) => {
    let earlyCutoff = stack.indexOf("at eval (eval at runMacroCommand");
    stack = stack.substring(0, earlyCutoff);
    stack +=
        "\n  <The rest of the stack is internal to the MacroRunner codebase and not relevant to you>";
    stack = stack.replace(/\w+:.+\\/g, ".../");
    stack = stack.replace(/\t/g, "    ");
    return stack;
};

export const showErrors = (err: any) => {
    vscode.window.showErrorMessage("Error: " + err.message, {
        modal: true,
        detail: compactStack(err.stack),
    });
};
