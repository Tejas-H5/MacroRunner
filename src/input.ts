import * as vscode from "vscode";
import { SoftError } from "./logging";

// I am no longer calling this prompt, as prompt is a blocking function whereas this is  async.
// this one will also throw if it doesn't get a result.
export const input = async (promptText: any): Promise<string> => {
    if (typeof promptText !== "string") {
        promptText = "";
    }

    const res = await vscode.window.showInputBox({
        title: "Macro input",
        prompt: promptText,
    });

    if (!res) {
        throw new SoftError(
            `Input for prompt '${promptText}' was skipped, macro has exited early.`
        );
    }

    return res;
};
