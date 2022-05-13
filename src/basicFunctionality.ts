import * as vscode from "vscode";
import { SoftError } from "./logging";

export const input = async (promptText: any): Promise<string | null> => {
    if (typeof promptText !== "string") {
        promptText = "";
    }

    const res = await vscode.window.showInputBox({
        title: "Macro input",
        prompt: promptText,
    });

    if (!res) {
        return null;
    }

    return res;
};

export const exit = (reason: any) => {
    if (!reason) {
        reason = "macro exited early";
    }

    throw new SoftError(reason);
};
