import { table } from "console";
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
    let earlyCutoff = stack.indexOf("at eval (eval at runMacro");
    let earlyEnd = earlyCutoff + 1000;
    if (stack.length < earlyEnd) {
        earlyEnd = stack.length;
        stack += "...";
    }

    stack =
        stack.substring(0, earlyCutoff) +
        "\n\n<The rest of the stack is probably internal to the MacroRunner codebase and not relevant to your error>\n\n" +
        stack.substring(earlyCutoff, earlyEnd);

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
