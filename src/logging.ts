import { table } from "console";
import * as vscode from "vscode";

export const todo = () => {
    throw new Error("This code has not yet been implemented, sorry about that");
};
export class SoftError {
    public message: string;
    constructor(message: string) {
        this.message = message;
    }
}

export class HardError {
    public message: string;
    constructor(message: string) {
        this.message = message;
    }
}

export const makeStackTraceMoreReadable = (stackTrace: string) => {
    let earlyCutoff = stackTrace.indexOf("at eval (eval at runMacro");
    let earlyEnd = earlyCutoff + 1000;
    if (stackTrace.length < earlyEnd) {
        earlyEnd = stackTrace.length;
        stackTrace += "...";
    }

    stackTrace =
        stackTrace.substring(0, earlyCutoff) +
        "\n\n<The rest of the stack is probably internal to the MacroRunner codebase and not relevant to your error>\n\n" +
        stackTrace.substring(earlyCutoff, earlyEnd);

    stackTrace = stackTrace.replace(/\w+:.+\\/g, ".../");
    stackTrace = stackTrace.replace(/\t/g, "    ");
    return stackTrace;
};

export const handleErrors = async (func: () => Promise<any>) => {
    try {
        await func();
    } catch (err: any) {
        handleError(err);
    }
};

export const handleErrorsSync = (func: () => any) => {
    try {
        func();
    } catch (err: any) {
        handleError(err);
    }
};

const handleError = (err: any) => {
    if (err instanceof SoftError) {
        vscode.window.showInformationMessage(err.message);
        return;
    }

    if (err instanceof HardError) {
        vscode.window.showErrorMessage(err.message);
        return;
    }

    vscode.window.showErrorMessage("Error: " + err.message, {
        modal: true,
        detail: makeStackTraceMoreReadable(err.stack),
    });
};
